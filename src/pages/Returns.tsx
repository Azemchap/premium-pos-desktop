// src/pages/Returns.tsx - Returns & Refunds Management
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Plus, Search, Eye, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { format as formatDate } from "date-fns";

interface ReturnItem {
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  max_quantity?: number;
}

interface ReturnWithDetails {
  id: number;
  return_number: string;
  original_sale_id?: number;
  original_sale_number?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  refund_method: string;
  processed_by: number;
  processed_by_name?: string;
  reason?: string;
  notes?: string;
  shift_id?: number;
  created_at: string;
  items_count: number;
}

interface ReturnItemDetail {
  id: number;
  return_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

interface SaleForReturn {
  id: number;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export default function Returns() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [returns, setReturns] = useState<ReturnWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithDetails | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemDetail[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating return
  const [saleNumber, setSaleNumber] = useState("");
  const [originalSale, setOriginalSale] = useState<SaleForReturn | null>(null);
  const [returnItemsForm, setReturnItemsForm] = useState<ReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [lookingSale, setLookingSale] = useState(false);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await invoke<ReturnWithDetails[]>("get_returns", {
        page: 1,
        pageSize: 100,
        search: searchQuery || undefined,
      });
      setReturns(data);
    } catch (error) {
      console.error("Failed to load returns:", error);
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [searchQuery]);

  const stats = {
    totalReturns: returns.length,
    totalAmount: returns.reduce((sum, r) => sum + r.total_amount, 0),
    todayReturns: returns.filter((r) => {
      const today = new Date().toISOString().split("T")[0];
      return r.created_at.startsWith(today);
    }).length,
  };

  const handleSearchSale = async () => {
    if (!saleNumber.trim()) {
      toast.error("Please enter a sale number");
      return;
    }

    try {
      setLookingSale(true);
      const sale = await invoke<SaleForReturn>("get_sale_for_return", {
        saleNumber: saleNumber.trim(),
      });
      setOriginalSale(sale);

      // Initialize return items with all sale items
      const items: ReturnItem[] = sale.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: 0,
        unit_price: item.unit_price,
        line_total: 0,
        max_quantity: item.quantity,
      }));
      setReturnItemsForm(items);
      toast.success("Sale found successfully");
    } catch (error: unknown) {
      console.error("Failed to find sale:", error);
      toast.error(typeof error === "string" ? error : "Failed to find sale");
      setOriginalSale(null);
      setReturnItemsForm([]);
    } finally {
      setLookingSale(false);
    }
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...returnItemsForm];
    const maxQty = newItems[index].max_quantity || 0;

    if (quantity < 0) quantity = 0;
    if (quantity > maxQty) quantity = maxQty;

    newItems[index].quantity = quantity;
    newItems[index].line_total = quantity * newItems[index].unit_price;
    setReturnItemsForm(newItems);
  };

  const calculateReturnTotals = () => {
    const subtotal = returnItemsForm.reduce((sum, item) => sum + item.line_total, 0);
    const taxRate = originalSale ? originalSale.tax_amount / originalSale.subtotal : 0;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleCreateReturn = async () => {
    const selectedItems = returnItemsForm.filter((item) => item.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (!refundMethod) {
      toast.error("Please select a refund method");
      return;
    }

    try {
      setSubmitting(true);
      const { subtotal, taxAmount, total } = calculateReturnTotals();

      const returnItems = selectedItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

      await invoke("create_return", {
        request: {
          original_sale_id: originalSale?.id,
          items: returnItems,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          refund_method: refundMethod,
          reason: returnReason || undefined,
          notes: returnNotes || undefined,
        },
        userId: user?.id,
        shiftId: undefined,
      });

      toast.success("Return processed successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadReturns();
    } catch (error: unknown) {
      console.error("Failed to create return:", error);
      toast.error(typeof error === "string" ? error : "Failed to process return");
    } finally {
      setSubmitting(false);
    }
  };

  const viewReturnDetails = async (returnRecord: ReturnWithDetails) => {
    setSelectedReturn(returnRecord);
    try {
      const items = await invoke<ReturnItemDetail[]>("get_return_items", {
        returnId: returnRecord.id,
      });
      setReturnItems(items);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      console.error("Failed to load return items:", error);
      toast.error("Failed to load return details");
    }
  };

  const resetForm = () => {
    setSaleNumber("");
    setOriginalSale(null);
    setReturnItemsForm([]);
    setRefundMethod("Cash");
    setReturnReason("");
    setReturnNotes("");
  };

  const { subtotal, taxAmount, total } = originalSale ? calculateReturnTotals() : { subtotal: 0, taxAmount: 0, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Returns & Refunds</h1>
          <p className="text-sm text-muted-foreground">Process and manage product returns</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Process Return
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Returns</p>
                <p className="text-lg font-bold mt-1">{stats.totalReturns}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Amount</p>
                <p className="text-lg font-bold mt-1">{format(stats.totalAmount)}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Today's Returns</p>
                <p className="text-lg font-bold mt-1">{stats.todayReturns}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Returns History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by return number, sale number, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Returns List */}
          <div className="space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : returns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No returns found</p>
              </div>
            ) : (
              returns.map((returnRecord) => (
                <Card key={returnRecord.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {returnRecord.return_number}
                          </Badge>
                          {returnRecord.original_sale_number && (
                            <Badge variant="secondary" className="text-xs">
                              Sale: {returnRecord.original_sale_number}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Date</p>
                            <p className="font-medium">
                              {formatDate(new Date(returnRecord.created_at), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Amount</p>
                            <p className="font-bold">{format(returnRecord.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Refund Method</p>
                            <p className="font-medium">{returnRecord.refund_method}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Processed By</p>
                            <p className="font-medium">{returnRecord.processed_by_name || "Unknown"}</p>
                          </div>
                        </div>
                        {returnRecord.reason && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Reason: {returnRecord.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {returnRecord.items_count} {returnRecord.items_count === 1 ? "item" : "items"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewReturnDetails(returnRecord)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
              Enter the original sale number to process a return
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sale Lookup */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="sale-number">Sale Number</Label>
                <Input
                  id="sale-number"
                  placeholder="SALE-12345678"
                  value={saleNumber}
                  onChange={(e) => setSaleNumber(e.target.value)}
                  disabled={lookingSale || !!originalSale}
                />
              </div>
              {!originalSale && (
                <Button
                  className="mt-6"
                  onClick={handleSearchSale}
                  disabled={lookingSale || !saleNumber.trim()}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {lookingSale ? "Searching..." : "Find Sale"}
                </Button>
              )}
              {originalSale && (
                <Button
                  className="mt-6"
                  variant="outline"
                  onClick={() => {
                    setOriginalSale(null);
                    setReturnItemsForm([]);
                    setSaleNumber("");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Original Sale Info */}
            {originalSale && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Original Sale Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Sale Number</p>
                      <p className="font-medium">{originalSale.sale_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">
                        {formatDate(new Date(originalSale.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-medium">{format(originalSale.total_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Items */}
            {returnItemsForm.length > 0 && (
              <div className="space-y-2">
                <Label>Select Items to Return</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Available</th>
                        <th className="text-right p-2">Return Qty</th>
                        <th className="text-right p-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItemsForm.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                            </div>
                          </td>
                          <td className="text-right p-2">{format(item.unit_price)}</td>
                          <td className="text-right p-2">{item.max_quantity}</td>
                          <td className="text-right p-2">
                            <Input
                              type="number"
                              min="0"
                              max={item.max_quantity}
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemQuantityChange(index, parseInt(e.target.value) || 0)
                              }
                              className="w-20 text-right"
                            />
                          </td>
                          <td className="text-right p-2 font-medium">{format(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/50">
                      <tr>
                        <td colSpan={4} className="text-right p-2 font-medium">Subtotal:</td>
                        <td className="text-right p-2 font-medium">{format(subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right p-2 font-medium">Tax:</td>
                        <td className="text-right p-2 font-medium">{format(taxAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right p-2 font-bold">Total Refund:</td>
                        <td className="text-right p-2 font-bold text-lg">{format(total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Refund Details */}
            {originalSale && (
              <>
                <div>
                  <Label htmlFor="refund-method">Refund Method *</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger id="refund-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Debit Card">Debit Card</SelectItem>
                      <SelectItem value="Store Credit">Store Credit</SelectItem>
                      <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Return Reason</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Defective, Wrong item, Customer changed mind"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this return"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={!originalSale || submitting || returnItemsForm.filter(i => i.quantity > 0).length === 0}
            >
              {submitting ? "Processing..." : "Process Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>
              {selectedReturn?.return_number}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Return Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Return Number</p>
                    <p className="font-medium">{selectedReturn.return_number}</p>
                  </div>
                  {selectedReturn.original_sale_number && (
                    <div>
                      <p className="text-muted-foreground text-xs">Original Sale</p>
                      <p className="font-medium">{selectedReturn.original_sale_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">
                      {formatDate(new Date(selectedReturn.created_at), "PPpp")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Processed By</p>
                    <p className="font-medium">{selectedReturn.processed_by_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Refund Method</p>
                    <p className="font-medium">{selectedReturn.refund_method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Refund</p>
                    <p className="font-bold text-lg">{format(selectedReturn.total_amount)}</p>
                  </div>
                  {selectedReturn.reason && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Reason</p>
                      <p className="font-medium">{selectedReturn.reason}</p>
                    </div>
                  )}
                  {selectedReturn.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Notes</p>
                      <p className="font-medium">{selectedReturn.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <Label>Returned Items</Label>
                <div className="border rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                            </div>
                          </td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">{format(item.unit_price)}</td>
                          <td className="text-right p-2 font-medium">{format(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/50">
                      <tr>
                        <td colSpan={3} className="text-right p-2 font-medium">Subtotal:</td>
                        <td className="text-right p-2 font-medium">{format(selectedReturn.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-right p-2 font-medium">Tax:</td>
                        <td className="text-right p-2 font-medium">{format(selectedReturn.tax_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-right p-2 font-bold">Total Refund:</td>
                        <td className="text-right p-2 font-bold text-lg">
                          {format(selectedReturn.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
