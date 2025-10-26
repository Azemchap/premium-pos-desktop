// src/pages/Cart.tsx - Dedicated Cart Page for Completing Sales
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { printReceipt } from "@/lib/receipt-printer";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Minus,
  Package,
  Plus,
  Printer,
  ReceiptIcon,
  ShoppingBag,
  Trash2,
  User
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
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

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const { items, removeItem, updateQuantity, updatePrice, clearCart, getSubtotal, getTaxAmount, getTotal } = useCartStore();

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

  const cartSubtotal = getSubtotal();
  const cartTax = getTaxAmount();
  const cartTotal = getTotal();
  const change = paymentInfo.amountReceived - cartTotal;

  const validateCustomerInfo = () => {
    try {
      customerSchema.parse(customerInfo);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
      }
      return false;
    }
  };

  const handleProceedToPayment = () => {
    if (items.length === 0) {
      toast.error("❌ Cart is empty");
      return;
    }
    if (validateCustomerInfo()) {
      setPaymentInfo({ ...paymentInfo, amountReceived: cartTotal });
      setIsCustomerDialogOpen(false);
      setIsPaymentDialogOpen(true);
    }
  };

  const completeSale = async () => {
    if (items.length === 0) {
      toast.error("❌ Cart is empty");
      return;
    }

    // Validate payment
    try {
      paymentSchema.parse(paymentInfo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    if (paymentInfo.method === "cash" && paymentInfo.amountReceived < cartTotal) {
      toast.error("❌ Insufficient payment amount");
      return;
    }

    try {
      const saleRequest: CreateSaleRequest = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0,
          line_total: item.total,
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

      const saleData = await invoke<any>("create_sale", {
        request: saleRequest,
        cashierId: user?.id,
        shiftId: null,
      });

      // Store complete sale data for receipt
      const receiptData = {
        ...(saleData as Record<string, any>),
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.price,
          tax_amount: item.tax_amount * item.quantity,
          line_total: item.total,
        })),
        customer_name: customerInfo.name || "Walk-in Customer",
        cashier_name: `${user?.first_name} ${user?.last_name}`,
        payment_method: paymentInfo.method,
        amount_received: paymentInfo.amountReceived,
        change_amount: change,
      };

      setCompletedSaleData(receiptData);
      setCompletedSaleNumber((saleData as any).sale_number);

      // Clear cart and show success
      clearCart();
      setIsPaymentDialogOpen(false);
      setIsCompletionDialogOpen(true);

      toast.success("🎉 Sale completed successfully!");
    } catch (error) {
      console.error("Failed to complete sale:", error);
      toast.error("❌ Failed to complete sale");
    }
  };

  const handlePrintReceipt = async () => {
    if (!completedSaleData) return;
    try {
      await printReceipt(completedSaleData);
      toast.success("🖨️ Receipt sent to printer");
    } catch (error) {
      console.error("Print failed:", error);
      toast.error("❌ Failed to print receipt");
    }
  };

  const handleNewSale = () => {
    setIsCompletionDialogOpen(false);
    setCustomerInfo({ name: "", phone: "", email: "" });
    setPaymentInfo({ method: "cash", amountReceived: 0 });
    setNotes("");
    setCompletedSaleData(null);
    navigate("/sales");
  };

  return (
    <div className="space-y-6 pb-16 sm:pb-0">
      {/* Premium Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-6">
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-12 rounded-xl border-2 hover:border-primary/50 hover:bg-primary/5"
              onClick={() => navigate("/sales")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>

      {/* Sticky Mobile Checkout Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 sm:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-3 py-2 flex items-center justify-between gap-3 z-40">
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="text-base font-bold">{format(cartTotal)}</span>
          </div>
          <Button onClick={() => setIsCustomerDialogOpen(true)} className="h-9 text-sm font-semibold flex-1" size="sm" disabled={items.length === 0}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Checkout
          </Button>
        </div>
      )}
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Shopping Cart
                </h1>
              </div>
              <p className="text-muted-foreground text-sm md:text-base ml-14">
                Review your items and complete your purchase
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-sm font-semibold">
                {items.reduce((sum, item) => sum + item.quantity, 0)} items
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => setIsClearCartDialogOpen(true)}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cart
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Premium Cart Items Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2 shadow-xl bg-gradient-to-br from-card to-card/50">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent p-4 sm:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xl">Cart Items</span>
                </div>
                <Badge variant="secondary" className="px-3 py-1.5 text-sm font-bold">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 opacity-30" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                  <p className="text-muted-foreground mb-6">Start adding products to your cart</p>
                  <Button 
                    size="lg"
                    onClick={() => navigate("/sales")}
                    className="shadow-lg hover:shadow-xl transition-all"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="group relative overflow-hidden p-4 sm:p-5 bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 border-2 border-border hover:border-primary/30 rounded-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                      <div className="relative flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-lg">{item.product.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs font-mono">
                              SKU: {item.product.sku}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(item.price)} each
                            </span>
                          </div>
                          {item.product.is_taxable && (
                            <p className="text-xs text-muted-foreground">
                              Tax: {format(item.tax_amount * item.quantity)}
                            </p>
                          )}
                        </div>

                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-1.5 bg-background/50 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={item.product.available_stock}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 h-8 sm:h-9 text-center text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10"
                              onClick={() => {
                                if (!updateQuantity(item.product.id, item.quantity + 1)) {
                                  toast.error(`Only ${item.product.available_stock} available`);
                                }
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex md:flex-col items-center md:items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.price}
                                onChange={(e) => updatePrice(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-24 h-8 sm:h-9 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">Unit</span>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {format(item.total)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeItem(item.product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Premium Order Summary */}
        <div className="space-y-4">
          <Card className="sticky top-6 border-2 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ReceiptIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl">Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{format(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold">{format(cartTax)}</span>
                </div>
                <div className="border-t-2 border-dashed pt-3 flex justify-between items-baseline p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {format(cartTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary"
                  size="lg"
                  disabled={items.length === 0}
                  onClick={() => setIsCustomerDialogOpen(true)}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 border-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => navigate("/sales")}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Info Dialog - Compact */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Customer Information
            </DialogTitle>
            <DialogDescription className="text-xs">Optional: Add customer details for this sale</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name" className="text-xs">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="John Doe"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className={`h-9 text-sm ${validationErrors.name ? 'border-destructive' : ''}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-destructive">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-phone" className="text-xs">Phone Number</Label>
              <Input
                id="customer-phone"
                placeholder="+1 234 567 8900"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className={`h-9 text-sm ${validationErrors.phone ? 'border-destructive' : ''}`}
              />
              {validationErrors.phone && (
                <p className="text-xs text-destructive">{validationErrors.phone}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-email" className="text-xs">Email Address</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="john@example.com"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                className={`h-9 text-sm ${validationErrors.email ? 'border-destructive' : ''}`}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive">{validationErrors.email}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleProceedToPayment} size="sm" className="flex-1 sm:flex-none">
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Compact */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" />
              Payment
            </DialogTitle>
            <DialogDescription className="text-xs">Select payment method and complete the sale</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs sm:text-sm text-muted-foreground">Total Amount</span>
                <span className="text-xl sm:text-2xl font-bold text-primary">{format(cartTotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select
                value={paymentInfo.method}
                onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="mobile">📱 Mobile Payment</SelectItem>
                  <SelectItem value="check">📝 Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentInfo.method === "cash" && (
              <div className="space-y-1.5">
                <Label htmlFor="amount-received" className="text-xs">Amount Received</Label>
                <Input
                  id="amount-received"
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  value={paymentInfo.amountReceived}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, amountReceived: parseFloat(e.target.value) || 0 })
                  }
                />
                {change >= 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {format(change)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for this sale..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">
              Back
            </Button>
            <Button onClick={completeSale} disabled={items.length === 0} size="sm" className="flex-1 sm:flex-none">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Completion Dialog - Compact */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-xl">Sale Completed!</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Transaction #{completedSaleNumber} has been recorded successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="p-3 bg-muted rounded-lg space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold">{format(cartTotal)}</span>
              </div>
              {paymentInfo.method === "cash" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Received</span>
                    <span className="font-medium">{format(paymentInfo.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {format(change)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handlePrintReceipt} size="sm">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={() => toast.info("Email feature coming soon!")} size="sm"> 
                <ReceiptIcon className="w-3.5 h-3.5 mr-1.5" />
                Email Receipt
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleNewSale} className="w-full" size="sm">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation - Compact */}
      <AlertDialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove all items from your cart. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearCart();
                toast.success("🗑️ Cart cleared");
              }}
              className="h-9 text-sm"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
