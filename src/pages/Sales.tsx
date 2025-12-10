// src/pages/Sales.tsx - Optimized Mobile-First Design
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  User
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "", email: "" });
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({ method: "cash", amountReceived: 0 });
  const [notes, setNotes] = useState("");
  const [barcodeEntry, setBarcodeEntry] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [completedSaleNumber, setCompletedSaleNumber] = useState("");
  const [completedSaleData, setCompletedSaleData] = useState<SaleData | null>(null);
  const [activeCartProductId, setActiveCartProductId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<ProductWithStock[]>("get_products_with_stock");
      setProducts(result.filter((p) => p.is_active && p.available_stock > 0));
      toast.success(`Loaded ${result.length} products`);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: ProductWithStock) => {
    if (addItem(product)) {
      toast.success(`Added ${product.name}`);
    } else {
      const existingItem = cart.find((item) => item.product.id === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      if (product.available_stock <= 0) {
        toast.error(`${product.name} is out of stock`);
      } else {
        toast.error(`Only ${product.available_stock} available (${currentCartQuantity} in cart)`);
      }
    }
  };

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;
    if (!updateCartQuantity(productId, newQuantity)) {
      if (newQuantity > item.product.available_stock) {
        toast.error(`Only ${item.product.available_stock} available`);
      }
    }
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((item) => item.product.id === productId);
    removeItem(productId);
    toast.success(`Removed ${item?.product.name}`);
  };

  const clearCartHandler = () => {
    clearCart();
    setIsClearCartDialogOpen(false);
    toast.success("Cart cleared");
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
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("Please fix customer information");
      }
      return false;
    }
  };

  const validatePayment = (): boolean => {
    try {
      paymentSchema.parse(paymentInfo);
      if (paymentInfo.amountReceived < getTotal()) {
        toast.error("Payment amount is less than total");
        return false;
      }
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("Please fix payment errors");
      }
      return false;
    }
  };

  const proceedToPayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsPaymentDialogOpen(true);
    setPaymentInfo({ ...paymentInfo, amountReceived: getTotal() });
  };

  const completeSale = async () => {
    if (!validatePayment()) return;

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

      setCompletedSaleNumber(result.sale_number || "SALE-000");

      const receiptData = {
        ...result,
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

      toast.success(`Sale ${result.sale_number} completed!`, { duration: 3000 });

      setTimeout(() => printReceipt(receiptData), 800);
    } catch (error) {
      console.error("Failed to complete sale:", error);
      toast.error(`Failed to complete sale: ${error}`);
    }
  };

  const startNewSale = () => {
    setIsCompletionDialogOpen(false);
    clearCart();
    setCustomerInfo({ name: "", phone: "", email: "" });
    setNotes("");
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    loadProducts();
    toast.success("Ready for new sale");
  };

  const handleCloseCompletion = () => {
    setIsCompletionDialogOpen(false);
    clearCart();
    setCustomerInfo({ name: "", phone: "", email: "" });
    setNotes("");
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    loadProducts();
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchQuery, selectedCategory]);

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const cartSubtotal = getSubtotal();
  const cartTax = getTaxAmount();
  const cartTotal = getTotal();
  const change = paymentInfo.amountReceived - cartTotal;

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
        if (isPaymentDialogOpen) completeSale();
        else if (!isCustomerDialogOpen && !isCompletionDialogOpen) proceedToPayment();
      }

      if ((e.key === "+" || e.key === "=") && activeCartProductId != null) {
        const item = cart.find((ci) => ci.product.id === activeCartProductId);
        if (item) updateCartItemQuantity(item.product.id, item.quantity + 1);
      }
      if ((e.key === "-" || e.key === "_") && activeCartProductId != null) {
        const item = cart.find((ci) => ci.product.id === activeCartProductId);
        if (item) updateCartItemQuantity(item.product.id, Math.max(1, item.quantity - 1));
      }
      if ((e.key === "Delete" || e.key === "Backspace") && activeCartProductId != null) {
        removeFromCart(activeCartProductId);
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
  }, [debouncedSearchQuery, selectedCategory]);

  return (
    <div className="flex flex-col items-stretch w-full h-screen max-h-screen overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none border-b bg-background/95">
        <PageHeader icon={ShoppingCart} title="Sales" subtitle="Process sales and manage transactions" />
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4">
          {/* Products Section */}
          <div className="lg:col-span-2 flex flex-col min-h-0 h-full">
            {/* Search & Filters - Fixed */}
            <div className="flex-none p-3 border-b lg:border lg:rounded-lg lg:mb-3 bg-background">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 touch-manipulation"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-11 touch-manipulation">
                    <SelectValue placeholder="Category" />
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
                <Input
                  placeholder="Scan barcode..."
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
                        toast.error("No product found");
                      }
                    }
                  }}
                  className="h-11 touch-manipulation"
                />
              </div>
            </div>

            {/* Products Grid - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
              {loading ? (
                <div className="grid grid-cols-2 gap-3 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No products found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3 pb-24 lg:pb-3">
                  {paginatedProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group relative p-3 bg-card border-2 rounded-lg hover:border-primary/50 hover:shadow-lg transition-all duration-200 touch-manipulation text-left"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          {product.available_stock <= product.minimum_stock && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                              Low
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{product.sku}</p>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-lg font-bold text-primary truncate">{format(product.selling_price)}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                            {product.available_stock}
                          </Badge>
                        </div>
                        {product.category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Cart Sidebar - Desktop */}
          <div className="hidden lg:flex lg:col-span-1 flex-col min-h-0 h-full">
            <Card className="flex flex-col flex-1 min-h-0 border-2">
              {/* Cart Header */}
              <CardHeader className="flex-none border-b p-3 bg-muted/30">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Cart
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-1 text-sm font-bold">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setIsClearCartDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Cart Items - Scrollable */}
              <ScrollArea className="flex-1 min-h-0">
                <CardContent className="p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-20 h-20 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                        <ShoppingCart className="w-10 h-10 opacity-30" />
                      </div>
                      <p className="font-medium">Cart is empty</p>
                      <p className="text-sm text-muted-foreground mt-1">Add products to get started</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        onClick={() => setActiveCartProductId(item.product.id)}
                        className={`group p-3 bg-muted/30 border-2 rounded-lg cursor-pointer transition-all ${
                          activeCartProductId === item.product.id
                            ? "border-primary/50 ring-2 ring-primary/20"
                            : "border-transparent hover:border-primary/30"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm line-clamp-1">{item.product.name}</h4>
                              <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.product.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-background rounded-md p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartItemQuantity(item.product.id, item.quantity - 1);
                                }}
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
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartItemQuantity(item.product.id, item.quantity + 1);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <span className="text-sm font-bold text-primary ml-auto">{format(item.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </ScrollArea>

              {/* Cart Footer - Fixed */}
              {cart.length > 0 && (
                <CardContent className="flex-none border-t p-3 space-y-3">
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
                  <Separator />
                  <div className="flex justify-between items-baseline p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                    <span className="text-base font-bold">Total</span>
                    <span className="text-xl font-bold text-primary">{format(cartTotal)}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-11 touch-manipulation"
                    onClick={() => setIsCustomerDialogOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {customerInfo.name || "Add Customer"}
                  </Button>
                  <Textarea
                    placeholder="Notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button className="w-full h-12 text-base font-bold touch-manipulation" size="lg" onClick={proceedToPayment}>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Checkout
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold truncate">{format(cartTotal)}</span>
            </div>
            <Button onClick={proceedToPayment} className="h-11 px-6 touch-manipulation" size="sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Checkout ({cart.length})
            </Button>
          </div>
        </div>
      )}

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">Customer Information</DialogTitle>
            <DialogDescription className="text-xs">Optional customer details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Customer name"
                  className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="Phone number"
                  className={`h-11 touch-manipulation ${validationErrors.phone ? "border-red-500" : ""}`}
                />
                {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="Email address"
                  className={`h-11 touch-manipulation ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (validateCustomerInfo()) {
                  setIsCustomerDialogOpen(false);
                  toast.success("Customer info saved");
                }
              }}
              className="flex-1 h-11 touch-manipulation"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">Complete Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Total: <span className="font-bold text-lg">{format(cartTotal)}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Payment Method *</Label>
                <Select value={paymentInfo.method} onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}>
                  <SelectTrigger className={`h-11 touch-manipulation ${validationErrors.method ? "border-red-500" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile">Mobile Payment</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.method && <p className="text-xs text-red-500">{validationErrors.method}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Amount Received *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentInfo.amountReceived}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, amountReceived: parseFloat(e.target.value) || 0 })}
                  className={`h-11 touch-manipulation ${validationErrors.amountReceived ? "border-red-500" : ""}`}
                />
                {validationErrors.amountReceived && <p className="text-xs text-red-500">{validationErrors.amountReceived}</p>}
              </div>
              {change > 0 && paymentInfo.amountReceived > 0 && (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800 dark:text-green-200 font-medium">Change</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{format(change)}</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={completeSale} className="flex-1 h-11 touch-manipulation">
              <Check className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={handleCloseCompletion}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="flex items-center text-green-600 dark:text-green-400 text-base">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Sale Completed!
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">{completedSaleNumber}</DialogDescription>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-5 rounded-lg border-2 border-green-200 dark:border-green-800 text-center">
              <p className="text-xs text-green-800 dark:text-green-200 mb-2 font-medium">Total Amount</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{format(cartTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Payment</p>
                <p className="text-sm font-medium capitalize">{paymentInfo.method}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Items</p>
                <p className="text-sm font-medium">{cart.length}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => completedSaleData && printReceipt(completedSaleData)} className="flex-1 h-11 touch-manipulation">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={startNewSale} className="flex-1 h-11 touch-manipulation">
              <ReceiptIcon className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Dialog */}
      <AlertDialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove all items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 h-11 touch-manipulation">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCartHandler} className="flex-1 h-11 touch-manipulation">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}