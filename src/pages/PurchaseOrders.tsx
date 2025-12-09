// src/pages/PurchaseOrders.tsx - Purchase Order Management
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PurchaseOrder, CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest, Supplier, ProductWithStock, PurchaseOrderStatus, PaymentStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShoppingCart, Plus, Edit, Trash2, Package, Filter, X, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { format as formatDate } from "date-fns";

interface POItemInput {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export default function PurchaseOrders() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // For lookups
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);

  // Form data - combined type for both create and edit
  interface POFormData extends Partial<CreatePurchaseOrderRequest> {
    actual_delivery_date?: string;
    status?: PurchaseOrderStatus;
    payment_status?: PaymentStatus;
  }

  const [formData, setFormData] = useState<POFormData>({
    supplier_id: 0,
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: "",
    items: [],
    tax: 0,
    shipping_cost: 0,
    payment_method: "",
    notes: "",
  });

  // Line items for create/edit
  const [lineItems, setLineItems] = useState<POItemInput[]>([]);
  const [currentItem, setCurrentItem] = useState<POItemInput>({
    product_id: 0,
    quantity: 1,
    unit_cost: 0,
    total_cost: 0,
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await invoke<PurchaseOrder[]>("get_purchase_orders", {
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setOrders(data);
    } catch (error) {
      console.error("Failed to load purchase orders:", error);
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await invoke<Supplier[]>("get_suppliers", { isActive: true });
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await invoke<ProductWithStock[]>("get_products_with_stock");
      setProducts(data.filter(p => p.is_active));
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, [statusFilter]);

  const stats = {
    total: orders.length,
    draft: orders.filter((o) => o.status === "Draft").length,
    confirmed: orders.filter((o) => o.status === "Confirmed").length,
    received: orders.filter((o) => o.status === "Received").length,
    totalValue: orders.reduce((sum, o) => sum + o.total_amount, 0),
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0 || currentItem.unit_cost <= 0) {
      toast.error("Please fill all item fields correctly");
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    const total = currentItem.quantity * currentItem.unit_cost;

    setLineItems([...lineItems, {
      ...currentItem,
      product_name: product?.name,
      total_cost: total,
    }]);

    setCurrentItem({
      product_id: 0,
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_cost, 0);
    const tax = formData.tax || 0;
    const shipping = formData.shipping_cost || 0;
    return {
      subtotal,
      total: subtotal + tax + shipping,
    };
  };

  const handleCreate = async () => {
    if (!formData.supplier_id || lineItems.length === 0) {
      toast.error("Supplier and at least one item are required");
      return;
    }

    try {
      setSubmitting(true);
      const request: CreatePurchaseOrderRequest = {
        supplier_id: formData.supplier_id!,
        order_date: formData.order_date!,
        expected_delivery_date: formData.expected_delivery_date,
        items: lineItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
        tax: formData.tax,
        shipping_cost: formData.shipping_cost,
        payment_method: formData.payment_method,
        notes: formData.notes,
      };

      await invoke("create_purchase_order", { request, userId: user?.id });
      toast.success("Purchase order created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadOrders();
    } catch (error: unknown) {
      console.error("Failed to create purchase order:", error);
      toast.error(typeof error === "string" ? error : "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);
      const updateData: UpdatePurchaseOrderRequest = {
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date,
        actual_delivery_date: formData.actual_delivery_date,
        status: formData.status,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        tax: formData.tax,
        shipping_cost: formData.shipping_cost,
        notes: formData.notes,
      };

      await invoke("update_purchase_order", { poId: selectedOrder.id, request: updateData });
      toast.success("Purchase order updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      loadOrders();
    } catch (error: unknown) {
      console.error("Failed to update purchase order:", error);
      toast.error(typeof error === "string" ? error : "Failed to update purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);
      await invoke("delete_purchase_order", { poId: selectedOrder.id });
      toast.success("Purchase order deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: unknown) {
      console.error("Failed to delete purchase order:", error);
      toast.error(typeof error === "string" ? error : "Failed to delete purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormData({
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      expected_delivery_date: order.expected_delivery_date,
      actual_delivery_date: order.actual_delivery_date,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      tax: order.tax,
      shipping_cost: order.shipping_cost,
      notes: order.notes,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      supplier_id: 0,
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery_date: "",
      items: [],
      tax: 0,
      shipping_cost: 0,
      payment_method: "",
      notes: "",
    });
    setLineItems([]);
    setCurrentItem({
      product_id: 0,
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    });
    setSelectedOrder(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Received": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Sent": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "Partial": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Partial": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage supplier purchase orders</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New PO
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Orders</p>
                <p className="text-lg font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Draft</p>
                <p className="text-lg font-bold mt-1">{stats.draft}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Confirmed</p>
                <p className="text-lg font-bold mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Value</p>
                <p className="text-lg font-bold mt-1">{format(stats.totalValue)}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No purchase orders found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {statusFilter !== "all" ? "Try adjusting your filter" : "Get started by creating your first purchase order"}
            </p>
            {statusFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New PO
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">{orders.length} Order{orders.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-sm">{order.po_number}</h4>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</Badge>
                        <Badge className={`text-xs ${getPaymentStatusColor(order.payment_status)}`}>{order.payment_status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{format(order.total_amount)}</span>
                        <span>{formatDate(new Date(order.order_date), "MMM d, yyyy")}</span>
                        {order.expected_delivery_date && (
                          <span>Expected: {formatDate(new Date(order.expected_delivery_date), "MMM d, yyyy")}</span>
                        )}
                        <span>Supplier ID: {order.supplier_id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(order)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }} className="hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); resetForm(); }}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Create Purchase Order</DialogTitle>
            <DialogDescription className="text-sm">Fill in the purchase order details and add items</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm">Supplier <span className="text-destructive">*</span></Label>
                <Select value={formData.supplier_id?.toString()} onValueChange={(value) => setFormData({ ...formData, supplier_id: parseInt(value) })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_date" className="text-sm">Order Date</Label>
                <Input id="order_date" type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_delivery" className="text-sm">Expected Delivery</Label>
                <Input id="expected_delivery" type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method" className="text-sm">Payment Method</Label>
                <Input id="payment_method" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} placeholder="e.g., Net 30" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-3">Add Items</h3>
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                  <Select value={currentItem.product_id.toString()} onValueChange={(value) => {
                    const productId = parseInt(value);
                    const product = products.find(p => p.id === productId);
                    setCurrentItem({ ...currentItem, product_id: productId, unit_cost: product?.cost_price || 0 });
                  }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.sku}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Qty" value={currentItem.quantity} onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })} className="text-sm" />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.01" placeholder="Unit Cost" value={currentItem.unit_cost} onChange={(e) => setCurrentItem({ ...currentItem, unit_cost: parseFloat(e.target.value) || 0 })} className="text-sm" />
                </div>
                <div className="col-span-2">
                  <Input type="text" placeholder="Total" value={format(currentItem.quantity * currentItem.unit_cost)} readOnly className="text-sm bg-muted" />
                </div>
                <div className="col-span-1">
                  <Button type="button" onClick={handleAddItem} size="sm" className="w-full"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              {lineItems.length > 0 && (
                <div className="space-y-2 mt-4 border rounded-lg p-3 bg-muted/30">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex-1">{item.product_name}</span>
                      <span className="w-16 text-right">{item.quantity}</span>
                      <span className="w-24 text-right">{format(item.unit_cost)}</span>
                      <span className="w-24 text-right font-medium">{format(item.total_cost)}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">{format(totals.subtotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="tax" className="text-sm">Tax</Label>
                <Input id="tax" type="number" step="0.01" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping" className="text-sm">Shipping Cost</Label>
                <Input id="shipping" type="number" step="0.01" value={formData.shipping_cost} onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-lg font-bold">{format(totals.total)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !formData.supplier_id || lineItems.length === 0}>
              {submitting ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); resetForm(); }}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Purchase Order</DialogTitle>
            <DialogDescription className="text-sm">Update purchase order information</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_status" className="text-sm">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_payment_status" className="text-sm">Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_expected_delivery" className="text-sm">Expected Delivery</Label>
              <Input id="edit_expected_delivery" type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_actual_delivery" className="text-sm">Actual Delivery</Label>
              <Input id="edit_actual_delivery" type="date" value={formData.actual_delivery_date} onChange={(e) => setFormData({ ...formData, actual_delivery_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_tax" className="text-sm">Tax</Label>
              <Input id="edit_tax" type="number" step="0.01" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_shipping" className="text-sm">Shipping Cost</Label>
              <Input id="edit_shipping" type="number" step="0.01" value={formData.shipping_cost} onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit_notes" className="text-sm">Notes</Label>
              <Textarea id="edit_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">Are you sure you want to delete this purchase order? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
