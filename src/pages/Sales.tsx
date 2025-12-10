// src/pages/Sales.tsx - Enhanced with Validation, Toasts, and Mobile Responsiveness
import PageHeader from "@/components/PageHeader";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { SaleData, printReceipt } from "@/lib/receipt-printer";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { ProductWithStock, Sale } from "@/types";
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
  User,
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

type SortColumn = "name" | "sku" | "category" | "selling_price" | "available_stock";
type SortDirection = "asc" | "desc";

export default function Sales() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const {
    items: cart,
    addItem,
    removeItem,
    updateQuantity: updateCartQuantity,
    updatePrice,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
  } = useCartStore();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
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
  const [barcodeEntry, setBarcodeEntry] = useState("");
  const [animatedItemId, setAnimatedItemId] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [completedSaleNumber, setCompletedSaleNumber] = useState("");
  const [completedSaleData, setCompletedSaleData] = useState<SaleData | null>(null);
  const [activeCartProductId, setActiveCartProductId] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // Sorting
  const [sortColumn] = useState<SortColumn>("name");
  const [sortDirection] = useState<SortDirection>("asc");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<ProductWithStock[]>("get_products_with_stock");
      setProducts(result.filter((p) => p.is_active && p.available_stock > 0));
      toast.success(`✅ Loaded ${result.length} products`);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("❌ Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: ProductWithStock) => {
    if (addItem(product)) {
      toast.success(`✅ Added ${product.name} to cart`);
    } else {
      const existingItem = cart.find((item) => item.product.id === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      if (product.available_stock <= 0) {
        toast.error(`❌ ${product.name} is out of stock!`);
      } else {
        toast.error(
          `❌ Cannot add more - only ${product.available_stock} available (${currentCartQuantity} already in cart)`
        );
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
    } else {
      setAnimatedItemId(productId);
      setTimeout(() => setAnimatedItemId(null), 180);
    }
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((item) => item.product.id === productId);
    removeItem(productId);
    toast.success(`🗑️ Removed ${item?.product.name} from cart`);
  };

  const clearCartHandler = () => {
    clearCart();
    setIsClearCartDialogOpen(false);
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

      const result = await invoke<Sale>("create_sale", {
        request: saleRequest,
        cashierId: user?.id,
        shiftId: null,
      });

      const saleData = result;
      const saleNumber = saleData.sale_number || "SALE-000";
      setCompletedSaleNumber(saleNumber);

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
    clearCart();
    setCustomerInfo({ name: "", phone: "", email: "" });
    setNotes("");
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    loadProducts();
    toast.success("✨ Ready for new sale");
  };

  const handleCloseCompletion = () => {
    setIsCompletionDialogOpen(false);
    clearCart();
    setCustomerInfo({ name: "", phone: "", email: "" });
    setNotes("");
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    loadProducts();
  };

  const printReceiptWithData = async (saleData: SaleData) => {
    if (!saleData) {
      toast.error("❌ No sale data available");
      return;
    }

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
    let filtered = products.filter((product) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "sku":
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case "category":
          aValue = (a.category || "").toLowerCase();
          bValue = (b.category || "").toLowerCase();
          break;
        case "selling_price":
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        case "available_stock":
          aValue = a.available_stock;
          bValue = b.available_stock;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, debouncedSearchQuery, selectedCategory, sortColumn, sortDirection]);

  // Unique categories
  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Calculate cart totals
  const cartSubtotal = getSubtotal();
  const cartTax = getTaxAmount();
  const cartTotal = getTotal();
  const change = paymentInfo.amountReceived - cartTotal;

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputLike =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("role") === "combobox");
      if (isInputLike) return;

      if (e.key === "Escape") {
        if (isPaymentDialogOpen) setIsPaymentDialogOpen(false);
        else if (isCustomerDialogOpen) setIsCustomerDialogOpen(false);
        else if (isCompletionDialogOpen) setIsCompletionDialogOpen(false);
      }

      if (e.key === "Enter") {
        if (isPaymentDialogOpen) {
          completeSale();
        } else if (!isCustomerDialogOpen && !isCompletionDialogOpen) {
          proceedToPayment();
        }
      }

      if (e.key === "+" || e.key === "=") {
        if (activeCartProductId != null) {
          const item = cart.find((ci) => ci.product.id === activeCartProductId);
          if (item) updateCartItemQuantity(item.product.id, item.quantity + 1);
        }
      }
      if (e.key === "-" || e.key === "_") {
        if (activeCartProductId != null) {
          const item = cart.find((ci) => ci.product.id === activeCartProductId);
          if (item) updateCartItemQuantity(item.product.id, Math.max(1, item.quantity - 1));
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (activeCartProductId != null) {
          removeFromCart(activeCartProductId);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cart, activeCartProductId, isPaymentDialogOpen, isCustomerDialogOpen, isCompletionDialogOpen]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, sortColumn, sortDirection]);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pb-20 sm:pb-6">
      <div className="min-h-[60px]">
        <PageHeader icon={ShoppingCart} title="Sales" subtitle="Process sales and manage transactions" />
      </div>

      {/* Sticky Mobile Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold">{format(cartTotal)}</span>
            </div>
            <Button onClick={proceedToPayment} className="h-10 text-sm font-semibold flex-1 max-w-[200px]" size="sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Checkout ({cart.length})
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Search and Filters */}
          <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm">
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
                <div className="">
                  <Input
                    placeholder="Scan barcode or enter SKU..."
                    value={barcodeEntry}
                    onChange={(e) => setBarcodeEntry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && barcodeEntry.trim()) {
                        const code = barcodeEntry.trim().toLowerCase();
                        const found = products.find(
                          (p) => (p.barcode && p.barcode.toLowerCase() === code) || p.sku.toLowerCase() === code
                        );
                        if (found) {
                          addToCart(found);
                          setBarcodeEntry("");
                        } else {
                          toast.error("❌ No product matches that barcode/SKU");
                        }
                      }
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                {paginatedProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="group relative overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono truncate">{product.sku}</p>
                        </div>
                        {product.available_stock <= product.minimum_stock && (
                          <Badge variant="destructive" className="text-xs ml-2 px-2 py-0.5 flex-shrink-0">
                            Low
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xl font-bold text-primary truncate">{format(product.selling_price)}</span>
                          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 flex-shrink-0">
                            {product.available_stock} left
                          </Badge>
                        </div>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {product.category}
                          </Badge>
                        )}
                        {/* <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" className="w-full h-8 text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1.5" />
                            Add to Cart
                          </Button>
                        </div> */}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
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
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum);
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
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
                </div>
              )}
            </>
          )}

          {!loading && filteredAndSortedProducts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 sm:py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your search criteria</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <Card className="sticky top-6 shadow-lg border-2">
            <CardHeader className="border-b-2 p-3 sm:p-4 bg-gradient-to-r from-muted/30 to-muted/10">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span>Cart</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-2.5 py-1 text-sm font-bold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setIsClearCartDialogOpen(true)}
                      aria-label="Clear cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-4">
              {/* Cart Items */}
              <div className="space-y-2 max-h-[300px] sm:max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                    </div>
                    <p className="font-medium text-sm sm:text-base">Your cart is empty</p>
                    <p className="text-xs sm:text-sm mt-1">Start adding products</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      onClick={() => setActiveCartProductId(item.product.id)}
                      className={`group p-3 bg-muted/30 hover:bg-muted/50 border rounded-lg transition-all cursor-pointer ${activeCartProductId === item.product.id
                          ? "border-primary/50 ring-2 ring-primary/20"
                          : "border-transparent hover:border-primary/30"
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-1" title={item.product.name}>
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.product.id);
                            }}
                            aria-label="Remove from cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-col items-start gap-2">
                          <div
                            className={`flex  items-center gap-1 bg-background rounded-md p-1 transition-transform duration-150 ${animatedItemId === item.product.id ? "scale-105" : ""
                              }`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartItemQuantity(item.product.id, item.quantity - 1);
                              }}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={item.product.available_stock}
                              value={item.quantity}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateCartItemQuantity(item.product.id, Math.max(1, parseInt(e.target.value) || 1));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-14 h-7 text-center text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartItemQuantity(item.product.id, item.quantity + 1);
                              }}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.price}
                              onChange={(e) => {
                                e.stopPropagation();
                                updatePrice(item.product.id, Math.max(0, parseFloat(e.target.value) || 0));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 h-7 text-sm"
                            />
                            <span className="text-sm font-bold text-primary whitespace-nowrap">
                              {format(item.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Totals & Actions */}
              {cart.length > 0 && (
                <>
                  <div className="border-t-2 pt-3 space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{format(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-semibold">{format(cartTax)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                      <span className="text-base font-bold">Total</span>
                      <span className="text-xl font-bold text-primary">{format(cartTotal)}</span>
                    </div>
                  </div>

                  {/* Customer Info Button */}
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => setIsCustomerDialogOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {customerInfo.name || "Add Customer (Optional)"}
                  </Button>

                  {/* Notes */}
                  <Textarea
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />

                  {/* Checkout Button - Hidden on Mobile (sticky bar shown instead) */}
                  <Button
                    className="w-full h-12 text-base font-bold hidden sm:flex"
                    size="lg"
                    onClick={proceedToPayment}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Info Dialog - Mobile Responsive */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Customer Information</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Add customer details (optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" className="text-xs sm:text-sm font-medium">
                Name
              </Label>
              <Input
                id="customerName"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="Customer name"
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone" className="text-xs sm:text-sm font-medium">
                Phone
              </Label>
              <Input
                id="customerPhone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="Phone number"
                className={`h-9 text-sm ${validationErrors.phone ? "border-red-500" : ""}`}
              />
              {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail" className="text-xs sm:text-sm font-medium">
                Email
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="Email address"
                className={`h-9 text-sm ${validationErrors.email ? "border-red-500" : ""}`}
              />
              {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCustomerDialogOpen(false)}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (validateCustomerInfo()) {
                  setIsCustomerDialogOpen(false);
                  toast.success("✅ Customer info saved");
                }
              }}
              size="sm"
              className="w-full sm:w-auto"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Mobile Responsive */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Complete Payment</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Total: <span className="font-bold text-base">{format(cartTotal)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod" className="text-xs sm:text-sm font-medium">
                Payment Method *
              </Label>
              <Select
                value={paymentInfo.method}
                onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}
              >
                <SelectTrigger className={`h-9 text-sm ${validationErrors.method ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.method && <p className="text-xs text-red-500">{validationErrors.method}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amountReceived" className="text-xs sm:text-sm font-medium">
                Amount Received *
              </Label>
              <Input
                id="amountReceived"
                type="number"
                step="0.01"
                min="0"
                value={paymentInfo.amountReceived}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, amountReceived: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={`h-9 text-sm ${validationErrors.amountReceived ? "border-red-500" : ""}`}
              />
              {validationErrors.amountReceived && (
                <p className="text-xs text-red-500">{validationErrors.amountReceived}</p>
              )}
            </div>

            {change > 0 && paymentInfo.amountReceived > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-800 dark:text-green-200 font-medium">Change</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">{format(change)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={completeSale} size="sm" className="w-full sm:w-auto">
              <Check className="w-4 h-4 mr-2" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Completion Dialog - Mobile Responsive */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={handleCloseCompletion}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600 dark:text-green-400 text-base sm:text-lg">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Sale Completed!
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Sale Number: <span className="font-mono font-bold">{completedSaleNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 sm:p-5 rounded-lg border-2 border-green-200 dark:border-green-800 text-center">
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 mb-2 font-medium">Total Amount</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{format(cartTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Payment Method</p>
                <p className="text-sm font-medium capitalize">{paymentInfo.method}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Items</p>
                <p className="text-sm font-medium">{cart.length}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handlePrintReceipt} size="sm" className="w-full sm:flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={startNewSale} size="sm" className="w-full sm:flex-1">
              <ReceiptIcon className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog - Mobile Responsive */}
      <AlertDialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              This will remove all items from your cart. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-9 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCartHandler} className="w-full sm:w-auto h-9 text-sm">
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}