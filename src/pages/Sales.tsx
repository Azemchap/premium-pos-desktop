// src/pages/Sales.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  DollarSign,
  User,
  Receipt,
  Calculator,
  Phone,
  Mail,
  QrCode,
  Check
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price: number;
  tax_rate?: number;
  is_taxable: boolean;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
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
  amount: number;
  reference?: string;
}

interface SaleResult {
  sale_number: string;
  id: number;
  [key: string]: unknown;
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: ""
  });
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: "cash",
    amount: 0,
    reference: ""
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: DollarSign },
    { value: "card", label: "Card", icon: CreditCard },
    { value: "mobile", label: "Mobile Payment", icon: QrCode },
    { value: "check", label: "Check", icon: Check }
  ];

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<Product[]>("get_products");
      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      const taxAmount = product.is_taxable && product.tax_rate
        ? (product.price * quantity * product.tax_rate) / 100
        : 0;

      const newItem: CartItem = {
        product,
        quantity,
        price: product.price,
        tax_amount: taxAmount,
        total: (product.price * quantity) + taxAmount
      };

      setCart([...cart, newItem]);
    }

    setSearchQuery("");
    toast.success(`${product.name} added to cart`);
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const taxAmount = item.product.is_taxable && item.product.tax_rate
          ? (item.product.price * quantity * item.product.tax_rate) / 100
          : 0;

        return {
          ...item,
          quantity,
          tax_amount: taxAmount,
          total: (item.product.price * quantity) + taxAmount
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: "", phone: "", email: "" });
    setNotes("");
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getTaxTotal = () => {
    return cart.reduce((sum, item) => sum + item.tax_amount, 0);
  };

  const getTotal = () => {
    return getSubtotal() + getTaxTotal();
  };

  const getChange = () => {
    return paymentInfo.amount - getTotal();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (paymentInfo.amount < getTotal()) {
      toast.error("Payment amount is insufficient");
      return;
    }

    try {
      setProcessing(true);

      const saleData = {
        customer_name: customerInfo.name || undefined,
        customer_phone: customerInfo.phone || undefined,
        customer_email: customerInfo.email || undefined,
        payment_method: paymentInfo.method,
        payment_reference: paymentInfo.reference || undefined,
        notes: notes || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
          tax_amount: item.tax_amount
        }))
      };

      const result = await invoke<SaleResult>("create_sale", saleData);

      toast.success(`Sale completed! Sale #${result.sale_number}`);

      // Print receipt (placeholder for now)
      console.log("Printing receipt for sale:", result);

      // Clear cart and reset
      clearCart();
      setPaymentInfo({ method: "cash", amount: 0, reference: "" });
      setIsPaymentDialogOpen(false);

    } catch (error) {
      console.error("Failed to process sale:", error);
      toast.error("Failed to process sale");
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.is_active &&
    product.current_stock > 0 &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column - Product Search & Cart */}
      <div className="lg:col-span-2 space-y-6">
        {/* Product Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Product Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                          </div>
                          <Skeleton className="h-8 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="p-2">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => addToCart(product)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                              <QrCode className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {product.sku} • Stock: {product.current_stock}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${product.price.toFixed(2)}</p>
                            <Button size="sm" className="mt-1">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No products found
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart ({cart.length})
              </span>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  Clear Cart
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
                <p className="text-sm">Search for products above to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.product.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>${item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>${item.tax_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Cart Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${getTaxTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Info & Notes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setIsCustomerDialogOpen(true)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {customerInfo.name ? "Edit Customer" : "Add Customer"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(true)}
                      disabled={cart.length === 0}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Checkout
                    </Button>
                  </div>

                  {customerInfo.name && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{customerInfo.name}</p>
                      {customerInfo.phone && (
                        <p className="text-sm text-muted-foreground">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {customerInfo.phone}
                        </p>
                      )}
                      {customerInfo.email && (
                        <p className="text-sm text-muted-foreground">
                          <Mail className="w-3 h-3 inline mr-1" />
                          {customerInfo.email}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any special instructions or notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Quick Actions & Recent Sales */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Receipt className="w-4 h-4 mr-2" />
              Reprint Receipt
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calculator className="w-4 h-4 mr-2" />
              Calculator
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <QrCode className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Items:</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${getTaxTotal().toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${getTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Customer Information Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Information</DialogTitle>
            <DialogDescription>
              Add customer details for this sale (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                placeholder="Customer name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                placeholder="Phone number"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="Email address"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCustomerDialogOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>
              Complete the payment for ${getTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentInfo.method} onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-2" />
                          {method.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-amount">Amount Received</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min={getTotal()}
                value={paymentInfo.amount}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            {paymentInfo.method !== "cash" && (
              <div>
                <Label htmlFor="payment-reference">Reference</Label>
                <Input
                  id="payment-reference"
                  placeholder="Transaction reference or check number"
                  value={paymentInfo.reference}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, reference: e.target.value })}
                />
              </div>
            )}
            {paymentInfo.amount > getTotal() && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between font-medium">
                  <span>Change:</span>
                  <span>${getChange().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={processing || paymentInfo.amount < getTotal()}
            >
              {processing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}