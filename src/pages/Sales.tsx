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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { currencyFormatter } from "@/lib/currency";
import { printReceipt } from "@/lib/receipt-printer";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  DollarSign,
  GridIcon,
  List,
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  tax_amount: number;
  total: number;
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

type ViewMode = "grid" | "list";
type SortColumn = 'name' | 'sku' | 'category' | 'selling_price' | 'available_stock';
type SortDirection = 'asc' | 'desc';

export default function Sales() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
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

  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("salesViewMode");
    return (saved as ViewMode) || "grid";
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleViewMode = () => {
    const newMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(newMode);
    localStorage.setItem("salesViewMode", newMode);
    toast.success(`Switched to ${newMode} view`);
  };

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
    // CRITICAL: Check available_stock from inventory (not current_stock)
    if (product.available_stock <= 0) {
      toast.error(`❌ ${product.name} is out of stock!`);
      return;
    }

    const existingItem = cart.find((item) => item.product.id === product.id);
    const currentCartQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentCartQuantity + 1;

    // Validate against available_stock (accounting for what's already in cart)
    if (newTotalQuantity > product.available_stock) {
      toast.error(`❌ Cannot add more - only ${product.available_stock} available (${currentCartQuantity} already in cart)`);
      return;
    }

    if (existingItem) {
      updateCartItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      const taxAmount = product.is_taxable ? product.selling_price * (product.tax_rate / 100) : 0;
      const total = product.selling_price + taxAmount;

      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          price: product.selling_price,
          tax_amount: taxAmount,
          total,
        },
      ]);
      toast.success(`✅ Added ${product.name} to cart`);
    }
  };

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    // CRITICAL: Validate against available_stock from inventory
    if (newQuantity > item.product.available_stock) {
      toast.error(`❌ Only ${item.product.available_stock} available in stock`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
            ...item,
            quantity: newQuantity,
            total: item.price * newQuantity + item.tax_amount * newQuantity,
          }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((item) => item.product.id === productId);
    setCart(cart.filter((item) => item.product.id !== productId));
    toast.success(`🗑️ Removed ${item?.product.name} from cart`);
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: "", phone: "", email: "" });
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    setNotes("");
    setValidationErrors({});
    setIsClearCartDialogOpen(false);
    toast.success("🧹 Cart cleared");
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
      if (paymentInfo.amountReceived < cartTotal) {
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
    setPaymentInfo({ ...paymentInfo, amountReceived: cartTotal });
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
        subtotal: cartSubtotal,
        tax_amount: cartTax,
        discount_amount: 0,
        total_amount: cartTotal,
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
        change: change,
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
    clearCart();
    loadProducts();
    toast.success("✨ Ready for new sale");
  };

  const handleCloseCompletion = () => {
    setIsCompletionDialogOpen(false);
    clearCart();
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
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTax = cart.reduce((sum, item) => sum + item.tax_amount * item.quantity, 0);
  const cartTotal = cartSubtotal + cartTax;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground mt-1">
            Process sales and manage transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsClearCartDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
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

            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
            >
              {viewMode === "grid" ? (
                <>
                  <List className="w-4 h-4 mr-2" />
                  List View
                </>
              ) : (
                <>
                  <GridIcon className="w-4 h-4 mr-2" />
                  Grid View
                </>
              )}
            </Button>
          </div>

          {/* Products Grid/List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {paginatedProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-1">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                        {product.available_stock <= product.minimum_stock && (
                          <Badge variant="destructive" className="text-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-primary">
                            {format(product.selling_price)}
                          </span>
                          <Badge variant="outline">{product.available_stock} in stock</Badge>
                        </div>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
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
          ) : (
            <>
              <Card className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        Product {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                        Category {sortColumn === 'category' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('available_stock')}>
                        Stock {sortColumn === 'available_stock' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort('selling_price')}>
                        Price {sortColumn === 'selling_price' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category && (
                            <Badge variant="secondary">{product.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.available_stock <= product.minimum_stock ? "destructive" : "outline"}>
                            {product.available_stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {format(product.selling_price)}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => addToCart(product)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
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

          {!loading && filteredAndSortedProducts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Cart
                </span>
                <Badge>{cart.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-1 flex-col  p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Totals */}
              {cart.length > 0 && (
                <>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{format(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{format(cartTax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-primary">{format(cartTotal)}</span>
                    </div>
                  </div>

                  {/* Customer Info Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsCustomerDialogOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {customerInfo.name ? customerInfo.name : "Add Customer (Optional)"}
                  </Button>

                  {/* Notes */}
                  <Textarea
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />

                  {/* Checkout Button */}
                  <Button className="w-full" size="lg" onClick={proceedToPayment}>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Proceed to Payment
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
                  <span className="text-2xl font-bold text-green-600">
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
          <div className="space-y-4 py-4">
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <p className="text-sm text-green-800 mb-2">Total Amount</p>
              <p className="text-4xl font-bold text-green-600">{format(cartTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
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