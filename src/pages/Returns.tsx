// src/pages/Returns.tsx - Optimized Mobile-First Design
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { format as formatDate } from "date-fns";
import { DollarSign, Eye, Minus, Package, Plus, Search, TrendingDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
      toast.success("Sale found");
    } catch (error: unknown) {
      console.error("Failed to find sale:", error);
      toast.error(typeof error === "string" ? error : "Sale not found");
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
      toast.error("Select at least one item");
      return;
    }

    if (!refundMethod) {
      toast.error("Select refund method");
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
      toast.error("Failed to load details");
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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none border-b bg-background/95">
        <PageHeader
          icon={Package}
          title="Returns & Refunds"
          subtitle="Process and manage product returns"
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11 touch-manipulation">
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </Button>
          }
        />
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-red-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Total Returns</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalReturns}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Total Amount</p>
                    <p className="text-2xl font-bold mt-1">{format(stats.totalAmount)}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Today</p>
                    <p className="text-2xl font-bold mt-1">{stats.todayReturns}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Returns List */}
          <Card>
            <CardHeader className="border-b p-3">
              <CardTitle className="text-base">Returns History</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search returns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 touch-manipulation"
                />
              </div>

              {/* Returns List */}
              <div className="space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </>
                ) : returns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="font-medium">No returns found</p>
                    <p className="text-sm text-muted-foreground mt-1">Process your first return to get started</p>
                  </div>
                ) : (
                  returns.map((returnRecord) => (
                    <Card key={returnRecord.id} className="border-2 hover:border-primary/50 transition-all">
                      <CardContent className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <Badge variant="outline" className="font-mono text-xs w-fit">
                                {returnRecord.return_number}
                              </Badge>
                              {returnRecord.original_sale_number && (
                                <Badge variant="secondary" className="text-[10px] w-fit">
                                  Sale: {returnRecord.original_sale_number}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewReturnDetails(returnRecord)}
                              className="h-9 touch-manipulation flex-shrink-0"
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              <span className="hidden sm:inline">Details</span>
                            </Button>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="font-medium truncate">
                                {formatDate(new Date(returnRecord.created_at), "MMM dd, yyyy")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-bold truncate">{format(returnRecord.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Method</p>
                              <p className="font-medium truncate">{returnRecord.refund_method}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Items</p>
                              <Badge variant="outline" className="text-xs">
                                {returnRecord.items_count}
                              </Badge>
                            </div>
                          </div>

                          {returnRecord.reason && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              Reason: {returnRecord.reason}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl p-0 gap-0 flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">Process Return</DialogTitle>
            <DialogDescription className="text-xs">Enter sale number to begin</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Sale Lookup */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Sale Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="SALE-12345678"
                    value={saleNumber}
                    onChange={(e) => setSaleNumber(e.target.value)}
                    disabled={lookingSale || !!originalSale}
                    className="flex-1 h-11 touch-manipulation"
                  />
                  {!originalSale ? (
                    <Button
                      onClick={handleSearchSale}
                      disabled={lookingSale || !saleNumber.trim()}
                      className="h-11 px-6 touch-manipulation"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {lookingSale ? "Searching..." : "Find"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOriginalSale(null);
                        setReturnItemsForm([]);
                        setSaleNumber("");
                      }}
                      className="h-11 px-6 touch-manipulation"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Original Sale Info */}
              {originalSale && (
                <Card className="border-2">
                  <CardHeader className="border-b p-3">
                    <CardTitle className="text-sm">Original Sale</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Sale #</p>
                        <p className="font-medium truncate">{originalSale.sale_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium truncate">
                          {formatDate(new Date(originalSale.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold truncate">{format(originalSale.total_amount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Return Items */}
              {returnItemsForm.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Select Items to Return</Label>
                  <div className="space-y-2">
                    {returnItemsForm.map((item, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.product_sku}</p>
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              Max: {item.max_quantity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => handleItemQuantityChange(index, Math.max(0, item.quantity - 1))}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                max={item.max_quantity}
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="w-20 h-9 text-center"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => handleItemQuantityChange(index, Math.min(item.max_quantity || 0, item.quantity + 1))}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-baseline gap-2 ml-auto">
                              <span className="text-xs text-muted-foreground">@{format(item.unit_price)}</span>
                              <span className="text-sm font-bold">{format(item.line_total)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Totals */}
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{format(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-semibold">{format(taxAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold">Total Refund</span>
                        <span className="text-xl font-bold text-primary">{format(total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Refund Details */}
              {originalSale && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Refund Method *</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger className="h-11 touch-manipulation">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Return Reason</Label>
                    <Input
                      placeholder="e.g., Defective, Wrong item"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="h-11 touch-manipulation"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Additional Notes</Label>
                    <Textarea
                      placeholder="Additional information..."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
              className="flex-1 h-11 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={!originalSale || submitting || returnItemsForm.filter((i) => i.quantity > 0).length === 0}
              className="flex-1 h-11 touch-manipulation"
            >
              {submitting ? "Processing..." : "Process Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">Return Details</DialogTitle>
            <DialogDescription className="text-xs font-mono">{selectedReturn?.return_number}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            {selectedReturn && (
              <div className="p-4 space-y-4">
                <Card className="border-2">
                  <CardHeader className="border-b p-3">
                    <CardTitle className="text-sm">Return Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Return #</p>
                        <p className="font-medium truncate">{selectedReturn.return_number}</p>
                      </div>
                      {selectedReturn.original_sale_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Sale #</p>
                          <p className="font-medium truncate">{selectedReturn.original_sale_number}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium truncate">
                          {formatDate(new Date(selectedReturn.created_at), "PPpp")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Processed By</p>
                        <p className="font-medium truncate">{selectedReturn.processed_by_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Method</p>
                        <p className="font-medium truncate">{selectedReturn.refund_method}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-lg truncate">{format(selectedReturn.total_amount)}</p>
                      </div>
                      {selectedReturn.reason && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Reason</p>
                          <p className="font-medium">{selectedReturn.reason}</p>
                        </div>
                      )}
                      {selectedReturn.notes && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="font-medium">{selectedReturn.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Returned Items</Label>
                  <div className="space-y-2">
                    {returnItems.map((item) => (
                      <Card key={item.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.product_sku}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              <p className="font-bold">{format(item.line_total)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{format(selectedReturn.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-semibold">{format(selectedReturn.tax_amount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold">Total Refund</span>
                        <span className="text-xl font-bold text-primary">{format(selectedReturn.total_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex-none border-t p-3">
            <Button onClick={() => setIsDetailsDialogOpen(false)} className="w-full h-11 touch-manipulation">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}