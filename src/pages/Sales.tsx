// src/pages/Sales.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  QrCode,
  Check,
  X,
  Package,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

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
  amount: number;
  reference?: string;
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

interface SaleResult {
  sale_number: string;
  id: number;
  [key: string]: unknown;
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
  const { user } = useAuthStore();

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: DollarSign },
    { value: "card", label: "Card", icon: CreditCard },
    { value: "mobile", label: "Mobile Payment", icon: QrCode },
    { value: "check", label: "Check", icon: Check }
  ];

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<Product[]>("get_products_with_stock");
      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    // Check stock availability
    const currentCartQuantity = cart.find(item => item.product.id === product.id)?.quantity || 0;
    if (currentCartQuantity + quantity > product.available_stock) {
      toast.error(`Not enough stock! Available: ${product.available_stock}`);
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      updateCartItemQuantity(product.id, existingItem.quantity + quantity);
    } else {
      const taxAmount = product.is_taxable && product.tax_rate
        ? (product.selling_price * quantity * product.tax_rate) / 100
        : 0;

      const newItem: CartItem = {
        product,
        quantity,
        price: product.selling_price,
        tax_amount: taxAmount,
        total: (product.selling_price * quantity) + taxAmount
      };

      setCart([...cart, newItem]);
    }

    toast.success(`${product.name} added to cart`);
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && quantity > product.available_stock) {
      toast.error(`Not enough stock! Available: ${product.available_stock}`);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const taxAmount = item.product.is_taxable && item.product.tax_rate
          ? (item.product.selling_price * quantity * item.product.tax_rate) / 100
          : 0;

        return {
          ...item,
          quantity,
          tax_amount: taxAmount,
          total: (item.product.selling_price * quantity) + taxAmount
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
    return cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
  };

  const getTaxTotal = () => {
    return cart.reduce((sum, item) => sum + item.tax_amount, 0);
  };

  const getTotal = () => {
    return getSubtotal() + getTaxTotal();
  };

  const getChange = () => {
    return Math.max(0, paymentInfo.amount - getTotal());
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

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setProcessing(true);

      const saleData: CreateSaleRequest = {
        customer_name: customerInfo.name || undefined,
        customer_phone: customerInfo.phone || undefined,
        customer_email: customerInfo.email || undefined,
        payment_method: paymentInfo.method,
        notes: notes || undefined,
        subtotal: getSubtotal(),
        tax_amount: getTaxTotal(),
        discount_amount: 0,
        total_amount: getTotal(),
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: 0,
          line_total: item.total
        }))
      };

      const result = await invoke<SaleResult>("create_sale", {
        request: saleData,
        cashierId: user.id,
        shiftId: null,
      });

      toast.success(`Sale completed! Sale #${result.sale_number}`);

      // Clear cart and reset
      clearCart();
      setPaymentInfo({ method: "cash", amount: 0, reference: "" });
      setIsPaymentDialogOpen(false);
      loadProducts(); // Reload to get updated stock

    } catch (error) {
      console.error("Failed to process sale:", error);
      toast.error(`Failed to process sale: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setPaymentInfo({ ...paymentInfo, amount: getTotal() });
    setIsPaymentDialogOpen(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesCategory && product.available_stock > 0;
  });

  const categories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  );

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column - Products Grid */}
      <div className="lg:col-span-2 space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || "uncategorized"}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Available Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-semibold line-clamp-2 min-h-[2.5rem]">
                          {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </div>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <div className="text-lg font-bold text-primary">
                              ${product.selling_price.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {product.available_stock}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products available</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory
                    ? "Try adjusting your filters"
                    : "No products in stock"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Cart */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart ({cart.length})
              </span>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
                <p className="text-sm">Click on products to add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${item.price.toFixed(2)} each
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateCartItemQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateCartItemQuantity(item.product.id, item.quantity + 1)
                          }
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
                  ))}
                </div>

                {/* Cart Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${getTaxTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsCustomerDialogOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {customerInfo.name ? "Edit Customer" : "Add Customer"}
                  </Button>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={openCheckout}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Checkout ${getTotal().toFixed(2)}
                  </Button>
                </div>

                {customerInfo.name && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="font-medium">{customerInfo.name}</div>
                    {customerInfo.phone && <div>{customerInfo.phone}</div>}
                    {customerInfo.email && <div>{customerInfo.email}</div>}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Total Amount: ${getTotal().toFixed(2)}
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
            {paymentInfo.amount >= getTotal() && getChange() > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex justify-between font-medium text-green-700 dark:text-green-400">
                  <span>Change:</span>
                  <span className="text-lg">${getChange().toFixed(2)}</span>
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
