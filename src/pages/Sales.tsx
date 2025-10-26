// src/pages/Sales.tsx - Enhanced with List/Grid Toggle, Validation, Toasts, and Completion Modal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { printReceipt } from "@/lib/receipt-printer";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Printer,
  ReceiptIcon,
  Search,
  ShoppingCart,
  Trash2,
  User
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

// Zod validation schemas
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[\d\s-()]*$/, "Invalid phone number").max(20).optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

const paymentSchema = z.object({
  method: z.enum(["cash", "card", "mobile", "check"], { errorMap: () => ({ message: "Select a payment method" }) }),
  amountReceived: z.number().min(0, "Amount must be positive"),
});

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  selling_price: number;
  cost_price: number;
  tax_rate: number;
  is_taxable: boolean;
  current_stock: number;
  minimum_stock: number;
  available_stock: number;
  is_active: boolean;
  unit_of_measure: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface PaymentInfo {
  method: string;
  amountReceived: number;
}

interface CreateSaleRequest {
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
}

// type ViewMode = "grid" | "list";
type SortColumn = 'name' | 'sku' | 'category' | 'selling_price' | 'available_stock';
type SortDirection = 'asc' | 'desc';

export default function Sales() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const { items: cart, addItem, removeItem, updateQuantity: updateCartQuantity, clearCart, getSubtotal, getTaxAmount, getTotal } = useCartStore();
  const [products, setProducts] = useState<Product[]>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: "cash",
    amountReceived: 0,
  });
  const [notes, setNotes] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [completedSaleNumber, setCompletedSaleNumber] = useState("");
  const [completedSaleData, setCompletedSaleData] = useState<any>(null);

  // View mode with localStorage persistence (commented out - grid is always used)
  // const [viewMode, setViewMode] = useState<ViewMode>(() => {
  //   const saved = localStorage.getItem("salesViewMode");
  //   return (saved as ViewMode) || "grid";
  // });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // Sorting
  const [sortColumn] = useState<SortColumn>('name');
  const [sortDirection] = useState<SortDirection>('asc');

  // const toggleViewMode = () => {
  //   const newMode = viewMode === "grid" ? "list" : "grid";
  //   setViewMode(newMode);
  //   localStorage.setItem("salesViewMode", newMode);
  //   toast.success(`Switched to ${newMode} view`);
  // };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<Product[]>("get_products_with_stock");
      setProducts(result.filter(p => p.is_active && p.available_stock > 0));
      toast.success(`✅ Loaded ${result.length} products`);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("❌ Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (addItem(product)) {
      toast.success(`✅ Added ${product.name} to cart`);
    } else {
      const existingItem = cart.find((item) => item.product.id === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      if (product.available_stock <= 0) {
        toast.error(`❌ ${product.name} is out of stock!`);
      } else {
        toast.error(`❌ Cannot add more - only ${product.available_stock} available (${currentCartQuantity} already in cart)`);
      }
    }
  };

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    if (!updateCartQuantity(productId, newQuantity)) {
      if (newQuantity > item.product.available_stock) {
        toast.error(`❌ Only ${item.product.available_stock} available in stock`);
      }
    }
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((item) => item.product.id === productId);
    removeItem(productId);
    toast.success(`🗑️ Removed ${item?.product.name} from cart`);
  };

  const clearCartHandler = () => {
    clearCart();
    toast.success("🗑️ Cart cleared");
  };

  const validateCustomerInfo = (): boolean => {
    try {
      customerSchema.parse(customerInfo);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix customer information errors");
      }
      return false;
    }
  };

  const validatePayment = (): boolean => {
    try {
      paymentSchema.parse(paymentInfo);
      if (paymentInfo.amountReceived < getSubtotal() + getTaxAmount()) {
        toast.error("❌ Payment amount is less than total");
        return false;
      }
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix payment errors");
      }
      return false;
    }
  };

  const proceedToPayment = () => {
    if (cart.length === 0) {
      toast.error("❌ Cart is empty!");
      return;
    }
    setIsPaymentDialogOpen(true);
    setPaymentInfo({ ...paymentInfo, amountReceived: getSubtotal() + getTaxAmount() });
  };

  const completeSale = async () => {
    if (!validatePayment()) {
      return;
    }

    try {
      const saleRequest: CreateSaleRequest = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0,
          line_total: item.price * item.quantity,
        })),
        subtotal: getSubtotal(),
        tax_amount: getTaxAmount(),
        discount_amount: 0,
        total_amount: getTotal(),
        payment_method: paymentInfo.method,
        customer_name: customerInfo.name || undefined,
        customer_phone: customerInfo.phone || undefined,
        customer_email: customerInfo.email || undefined,
        notes: notes || undefined,
      };

      const result = await invoke("create_sale", {
        request: saleRequest,
        cashierId: user?.id,
        shiftId: null,
      });

      // Extract sale data from result
      const saleData = result as any;
      const saleNumber = saleData.sale_number || "SALE-000";
      setCompletedSaleNumber(saleNumber);

      // Store complete sale data for receipt
      const receiptData = {
        ...saleData,
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.price,
          line_total: item.price * item.quantity,
        })),
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        cashier_name: `${user?.first_name} ${user?.last_name}`,
        amount_received: paymentInfo.amountReceived,
        change: paymentInfo.amountReceived - getTotal(),
      };

      setCompletedSaleData(receiptData);

      setIsPaymentDialogOpen(false);
      setIsCompletionDialogOpen(true);

      toast.success(`🎉 Sale ${saleNumber} completed successfully!`, {
        duration: 3000,
      });

      // Auto-print receipt immediately with the data
      setTimeout(() => {
        printReceiptWithData(receiptData);
      }, 800);
    } catch (error) {
      console.error("Failed to complete sale:", error);
      toast.error(`❌ Failed to complete sale: ${error}`);
    }
  };

  const startNewSale = () => {
    setIsCompletionDialogOpen(false);
    clearCartHandler();
    loadProducts();
    toast.success("✨ Ready for new sale");
  };

  const handleCloseCompletion = () => {
    setIsCompletionDialogOpen(false);
    clearCartHandler();
    loadProducts();
  };

  const printReceiptWithData = async (saleData: any) => {
    if (!saleData) {
      toast.error("❌ No sale data available");
      return;
    }

    // Use centralized receipt printer
    await printReceipt(saleData);
  };

  const handlePrintReceipt = () => {
    if (!completedSaleData) {
      toast.error("❌ No sale data available");
      return;
    }
    printReceiptWithData(completedSaleData);
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products?.filter((product) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    filtered?.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sku':
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'selling_price':
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        case 'available_stock':
          aValue = a.available_stock;
          bValue = b.available_stock;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, debouncedSearchQuery, selectedCategory, sortColumn, sortDirection]);

  // Unique categories
  const categories = useMemo(() => {
    return [...new Set(products?.map((p) => p.category).filter(Boolean))];
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil((filteredAndSortedProducts?.length || 0) / productsPerPage);
  const paginatedProducts = filteredAndSortedProducts?.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // const handleSort = (column: SortColumn) => {
  //   if (column === sortColumn) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortColumn(column);
  //     setSortDirection('asc');
  //   }
  // };

  // Calculate cart totals
  const cartSubtotal = getSubtotal();
  const cartTax = getTaxAmount();
  const cartTotal = getTotal();
  const change = paymentInfo.amountReceived - cartTotal;

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Reset to first page when filters or sort change
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, sortColumn, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Premium Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Point of Sale
              </h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base ml-14">
              Process sales and manage transactions effortlessly
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <>
                <Badge variant="outline" className="px-3 py-1.5 text-sm font-semibold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearCartDialogOpen(true)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters - Premium Design */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-11 border-2 focus:border-primary transition-colors"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category || "uncategorized"} value={category || "uncategorized"}>
                        {category || "Uncategorized"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid - Premium Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
                {paginatedProducts?.map((product) => (
                  <Card
                    key={product.id}
                    className="group relative overflow-hidden border-2 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/80"
                    onClick={() => addToCart(product)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                    <CardContent className="p-5 relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                        {product.available_stock <= product.minimum_stock && (
                          <Badge variant="destructive" className="text-xs ml-2 animate-pulse">
                            Low
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {format(product.selling_price)}
                            </span>
                          </div>
                          <Badge variant="outline" className="font-semibold">
                            {product.available_stock} left
                          </Badge>
                        </div>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" className="w-full" variant="secondary">
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}

          {!loading && (filteredAndSortedProducts?.length || 0) === 0 && (
            <Card>
              <CardContent className="text-center py-6 md:py-12">
                <Package className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Premium Cart Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="sticky top-6 border-2 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xl">Cart</span>
                </span>
                <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* Premium Cart Items */}
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="font-medium text-lg">Your cart is empty</p>
                    <p className="text-sm mt-1">Start adding products to checkout</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="group relative overflow-hidden p-4 bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 border-2 border-border hover:border-primary/30 rounded-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                      <div className="relative space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm line-clamp-2">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(item.price)} × {item.quantity}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            {format(item.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Premium Cart Totals & Actions */}
              {cart.length > 0 && (
                <>
                  <div className="border-t-2 border-dashed pt-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{format(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-semibold">{format(cartTax)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {format(cartTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info Button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => setIsCustomerDialogOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {customerInfo.name || "Add Customer (Optional)"}
                  </Button>

                  {/* Notes */}
                  <Textarea
                    placeholder="Add notes for this sale..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="border-2 focus:border-primary resize-none"
                  />

                  {/* Premium Checkout Button */}
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary" 
                    size="lg" 
                    onClick={proceedToPayment}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Info Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Information</DialogTitle>
            <DialogDescription>
              Add customer details (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Name</Label>
              <Input
                id="customerName"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="Customer name"
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="Phone number"
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-500">{validationErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="Email address"
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (validateCustomerInfo()) {
                  setIsCustomerDialogOpen(false);
                  toast.success("✅ Customer info saved");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Total: {format(cartTotal)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentInfo.method} onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}>
                <SelectTrigger className={validationErrors.method ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.method && (
                <p className="text-xs text-red-500">{validationErrors.method}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received</Label>
              <Input
                id="amountReceived"
                type="number"
                step="0.01"
                min="0"
                value={paymentInfo.amountReceived}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, amountReceived: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={validationErrors.amountReceived ? "border-red-500" : ""}
              />
              {validationErrors.amountReceived && (
                <p className="text-xs text-red-500">{validationErrors.amountReceived}</p>
              )}
            </div>

            {change > 0 && paymentInfo.amountReceived > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-800">Change</span>
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                    {format(change)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={completeSale}>
              <Check className="w-4 h-4 mr-2" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Completion Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={handleCloseCompletion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="w-6 h-6 mr-2" />
              Sale Completed!
            </DialogTitle>
            <DialogDescription>
              Sale Number: <span className="font-mono font-bold">{completedSaleNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4 py-4">
            <div className="bg-green-50 p-3 md:p-6 rounded-lg text-center">
              <p className="text-sm text-green-800 mb-2">Total Amount</p>
              <p className="text-4xl font-bold text-green-600">{format(cartTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                <p className="font-medium capitalize">{paymentInfo.method}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Items</p>
                <p className="font-medium">{cart.length}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-1 sm:gap-2">
            <Button variant="outline" onClick={handlePrintReceipt} className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={startNewSale} className="w-full">
              <ReceiptIcon className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items from your cart. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart}>Clear Cart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}