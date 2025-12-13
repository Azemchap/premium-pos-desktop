// src/pages/Returns.tsx - Returns Management
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { format as formatDate } from "date-fns";
import { 
  ArrowRight, 
  Box, 
  Building, 
  Calendar, 
  ChevronDown, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Eye, 
  FileText, 
  Minus, 
  Package, 
  Plus, 
  RefreshCw, 
  Scan, 
  Search, 
  TrendingDown, 
  Truck, 
  User, 
  Warehouse, 
  X 
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { returnsSyncService } from "@/services/returnsSync";

// Types
type ReturnType = 'SalesReturn' | 'PurchaseReturn' | 'InventoryReturn' | 'TransferReturn';
type ReturnReason = 'Defective' | 'WrongItem' | 'Damaged' | 'Expired' | 'Overstock' | 'Recall' | 'CustomerDissatisfaction' | 'WrongShipment' | 'QualityIssue' | 'Other';

type ReturnCondition = 'New' | 'Opened' | 'Used' | 'Damaged' | 'Defective' | 'Sealed';

type DispositionAction = 'Restock' | 'Dispose' | 'ReturnToSupplier' | 'Transfer' | 'Repair' | 'WriteOff';

interface ReturnItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  reason: ReturnReason;
  condition: ReturnCondition;
  disposition: DispositionAction;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  selling_price: number;
  cost_price: number;
  current_stock?: number;
  category?: string;
}

interface Supplier {
  id: number;
  supplier_number: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
}

interface Location {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

interface Sale {
  id: number;
  sale_number: string;
  customer_name?: string;
  total_amount: number;
  created_at: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface ComprehensiveReturn {
  id: number;
  return_number: string;
  return_type: ReturnType;
  reference_id?: number;
  reference_number?: string;
  supplier_id?: number;
  supplier_name?: string;
  from_location_id?: number;
  from_location_name?: string;
  to_location_id?: number;
  to_location_name?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  refund_method?: string;
  credit_method?: string;
  expected_credit_date?: string;
  status: string;
  processed_by: number;
  processed_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  completed_at?: string;
  reason?: string;
  notes?: string;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export default function Returns() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [returns, setReturns] = useState<ComprehensiveReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturnType, setSelectedReturnType] = useState<ReturnType | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ComprehensiveReturn | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [returnType, setReturnType] = useState<ReturnType>('SalesReturn');
  const [referenceId, setReferenceId] = useState<number | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [returnItemsForm, setReturnItemsForm] = useState<ReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [creditMethod, setCreditMethod] = useState("Credit Note");
  const [expectedCreditDate, setExpectedCreditDate] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  // Search states
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Popover states
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [salePopoverOpen, setSalePopoverOpen] = useState(false);
  const [purchasePopoverOpen, setPurchasePopoverOpen] = useState(false);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await invoke<ComprehensiveReturn[]>("get_returns", {
        returnType: selectedReturnType && selectedReturnType !== "all" ? selectedReturnType : null,
        status: selectedStatus && selectedStatus !== "all" ? selectedStatus : null,
        startDate: null,
        endDate: null,
        limit: 100,
        offset: 0,
      });
      setReturns(data);
    } catch (error) {
      console.error("Failed to load returns:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to load returns: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
    loadReferenceData();

    // Start real-time sync service
    returnsSyncService.startRealtimeSync();

    return () => {
      // Cleanup sync service on unmount
      returnsSyncService.stopRealtimeSync();
    };
  }, []);

  useEffect(() => {
    loadReturns();
  }, [selectedReturnType, selectedStatus]);

  // Load reference data
  const loadReferenceData = async () => {
    try {
      const [suppliersData, locationsData, salesData, purchaseData] = await Promise.all([
        invoke<Supplier[]>("get_suppliers"),
        invoke<Location[]>("get_locations"),
        invoke<Sale[]>("get_sales", { startDate: null, endDate: null, limit: 50, offset: 0 }),
        invoke<PurchaseOrder[]>("get_purchase_orders", { status: null, limit: 50, offset: 0 }),
      ]);
      setSuppliers(suppliersData);
      setLocations(locationsData);
      setSales(salesData);
      setPurchaseOrders(purchaseData);
    } catch (error) {
      console.error("Failed to load reference data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to load reference data: ${errorMessage}`);
    }
  };

  const loadProducts = async (query: string = "") => {
    try {
      setSearchingProducts(true);
      if (query.trim()) {
        const products = await invoke<Product[]>("search_products", {
          search_term: query.trim(),
          category: null,
          limit: 20,
        });
        setSearchedProducts(products);
      } else {
        const allProducts = await invoke<Product[]>("get_products");
        setSearchedProducts(allProducts.slice(0, 50));
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      setSearchedProducts([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const existingItem = returnItemsForm.find(item => item.product_id === product.id);
    if (existingItem) {
      toast.error("Product already added");
      return;
    }

    const returnItem: ReturnItem = {
      product_id: product.id,
      quantity: 1,
      unit_price: returnType === 'PurchaseReturn' ? product.cost_price : product.selling_price,
      line_total: returnType === 'PurchaseReturn' ? product.cost_price : product.selling_price,
      reason: 'Other',
      condition: 'New',
      disposition: 'Restock',
    };

    setReturnItemsForm([...returnItemsForm, returnItem]);
    setProductPopoverOpen(false);
    toast.success("Product added");
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...returnItemsForm];
    if (quantity < 0) quantity = 0;
    newItems[index].quantity = quantity;
    newItems[index].line_total = quantity * newItems[index].unit_price;
    setReturnItemsForm(newItems);
  };

  const calculateTotals = () => {
    const subtotal = returnItemsForm.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = subtotal * 0.1; // Default 10% tax
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateReturn = async () => {
    if (returnItemsForm.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    // Validate required fields based on return type
    if (returnType === 'PurchaseReturn' && !supplierId) {
      toast.error("Please select a supplier for purchase returns");
      return;
    }

    if ((returnType === 'InventoryReturn' || returnType === 'TransferReturn') && !fromLocationId) {
      toast.error("Please select a source location");
      return;
    }

    if (returnType === 'TransferReturn' && !toLocationId) {
      toast.error("Please select a destination location");
      return;
    }

    if (returnType === 'SalesReturn' && !refundMethod) {
      toast.error("Please select a refund method");
      return;
    }

    if (returnType === 'PurchaseReturn' && !creditMethod) {
      toast.error("Please select a credit method");
      return;
    }

    try {
      setSubmitting(true);
      const { subtotal, taxAmount, total } = calculateTotals();

      const payload = {
        returnType,
        referenceId,
        referenceNumber: referenceNumber || null,
        supplierId,
        fromLocationId,
        toLocationId,
        items: returnItemsForm,
        subtotal,
        taxAmount,
        totalAmount: total,
        refundMethod: returnType === 'SalesReturn' ? refundMethod : null,
        creditMethod: returnType === 'PurchaseReturn' ? creditMethod : null,
        expectedCreditDate: expectedCreditDate || null,
        reason: returnReason || null,
        notes: returnNotes || null,
        attachments: null,
        userId: user?.id,
        shiftId: null,
      };

      console.log("Creating return with payload:", payload);

      // Use sync service for online-first approach
      await returnsSyncService.createReturn(payload);

      toast.success("Return created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadReturns();
    } catch (error) {
      console.error("Failed to create return:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 
                          (typeof error === 'string' ? error : 
                          JSON.stringify(error));
      toast.error(`Failed to create return: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setReturnType('SalesReturn');
    setReferenceId(null);
    setReferenceNumber("");
    setSupplierId(null);
    setFromLocationId(null);
    setToLocationId(null);
    setReturnItemsForm([]);
    setRefundMethod("Cash");
    setCreditMethod("Credit Note");
    setExpectedCreditDate("");
    setReturnReason("");
    setReturnNotes("");
    setProductSearchQuery("");
    setSearchedProducts([]);
  };

  const getReturnTypeIcon = (type: ReturnType) => {
    switch (type) {
      case 'SalesReturn': return <Package className="w-4 h-4" />;
      case 'PurchaseReturn': return <Building className="w-4 h-4" />;
      case 'InventoryReturn': return <Warehouse className="w-4 h-4" />;
      case 'TransferReturn': return <Truck className="w-4 h-4" />;
    }
  };

  const getReturnTypeLabel = (type: ReturnType) => {
    switch (type) {
      case 'SalesReturn': return 'Sales Return';
      case 'PurchaseReturn': return 'Purchase Return';
      case 'InventoryReturn': return 'Inventory Return';
      case 'TransferReturn': return 'Transfer Return';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Processing': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b bg-background/95">
        <PageHeader
          icon={Package}
          title="Returns"
          subtitle="Manage all types of returns efficiently"
          actions={
            <div className="flex gap-2">
              <Button onClick={loadReturns} variant="outline" size="sm" className="h-11 touch-manipulation">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={async () => {
                try {
                  const result = await invoke<string>("test_returns_tables");
                  toast.success(result);
                } catch (error) {
                  console.error("Test failed:", error);
                  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
                  toast.error(`Test failed: ${errorMessage}`);
                }
              }} variant="outline" size="sm" className="h-11 touch-manipulation">
                <Package className="w-4 h-4 mr-2" />
                Test DB
              </Button>
              <Button onClick={() => {
                setIsCreateDialogOpen(true);
                loadReferenceData();
              }} className="h-11 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" />
                New Return
              </Button>
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Total Returns</p>
                    <p className="text-2xl font-bold mt-1">{returns.length}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Sales Returns</p>
                    <p className="text-2xl font-bold mt-1">
                      {returns.filter(r => r.return_type === 'SalesReturn').length}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Purchase Returns</p>
                    <p className="text-2xl font-bold mt-1">
                      {returns.filter(r => r.return_type === 'PurchaseReturn').length}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs opacity-90 font-medium">Total Value</p>
                    <p className="text-2xl font-bold mt-1">
                      {format(returns.reduce((sum, r) => sum + r.total_amount, 0))}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="border-b p-3">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Return Type</Label>
                  <Select value={selectedReturnType} onValueChange={(value) => setSelectedReturnType(value as ReturnType | "all")}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="SalesReturn">Sales Return</SelectItem>
                      <SelectItem value="PurchaseReturn">Purchase Return</SelectItem>
                      <SelectItem value="InventoryReturn">Inventory Return</SelectItem>
                      <SelectItem value="TransferReturn">Transfer Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search returns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returns List */}
          <Card>
            <CardHeader className="border-b p-3">
              <CardTitle className="text-base">Returns History</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
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
                  <p className="text-sm text-muted-foreground mt-1">Create your first return to get started</p>
                </div>
              ) : (
                returns.map((returnRecord) => (
                  <Card key={returnRecord.id} className="border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedReturn(returnRecord);
                      setIsDetailsDialogOpen(true);
                    }}>
                    <CardContent className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs w-fit">
                                {returnRecord.return_number}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {getReturnTypeIcon(returnRecord.return_type)}
                                <Badge variant="secondary" className="text-[10px] w-fit">
                                  {getReturnTypeLabel(returnRecord.return_type)}
                                </Badge>
                              </div>
                              <Badge className={`text-[10px] w-fit ${getStatusColor(returnRecord.status)}`}>
                                {returnRecord.status}
                              </Badge>
                            </div>
                            {returnRecord.reference_number && (
                              <Badge variant="outline" className="text-[10px] w-fit">
                                <FileText className="w-3 h-3 mr-1" />
                                Ref: {returnRecord.reference_number}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReturn(returnRecord);
                              setIsDetailsDialogOpen(true);
                            }}
                            className="h-9 touch-manipulation flex-shrink-0"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium truncate">
                              {formatDate(new Date(returnRecord.created_at), "MMM dd")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-bold truncate text-green-600">{format(returnRecord.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Items</p>
                            <Badge variant="outline" className="text-xs">
                              {returnRecord.items_count}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Processed By</p>
                            <p className="font-medium truncate text-xs">{returnRecord.processed_by_name || 'Unknown'}</p>
                          </div>
                        </div>

                        {returnRecord.supplier_name && (
                          <div className="flex items-center gap-2">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{returnRecord.supplier_name}</p>
                          </div>
                        )}

                        {returnRecord.reason && (
                          <div className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {returnRecord.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-6xl p-0 gap-0 flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">Create New Return</DialogTitle>
            <DialogDescription className="text-xs">Select return type and enter details</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Return Type Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Return Type *</Label>
                <Select value={returnType} onValueChange={(value) => setReturnType(value as ReturnType)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SalesReturn">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Sales Return - Customer returns purchased items
                      </div>
                    </SelectItem>
                    <SelectItem value="PurchaseReturn">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Purchase Return - Return items to suppliers
                      </div>
                    </SelectItem>
                    <SelectItem value="InventoryReturn">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4" />
                        Inventory Return - Return items to warehouse
                      </div>
                    </SelectItem>
                    <SelectItem value="TransferReturn">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Transfer Return - Return items to another location
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Selection based on return type */}
              {returnType === 'SalesReturn' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Original Sale (Optional)</Label>
                  <Popover open={salePopoverOpen} onOpenChange={(open) => {
                    setSalePopoverOpen(open);
                    if (open && sales.length === 0) {
                      // Load sales if not already loaded
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-11"
                      >
                        {referenceNumber || "Select sale..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search sales..." />
                        <CommandList>
                          <CommandGroup>
                            {sales.map((sale) => (
                              <CommandItem
                                key={sale.id}
                                onSelect={() => {
                                  setReferenceId(sale.id);
                                  setReferenceNumber(sale.sale_number);
                                  setSalePopoverOpen(false);
                                }}
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium">{sale.sale_number}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {sale.customer_name || "No customer"} • {format(sale.total_amount)}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {returnType === 'PurchaseReturn' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Supplier *</Label>
                    <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11"
                        >
                          {suppliers.find(s => s.id === supplierId)?.company_name || "Select supplier..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search suppliers..." />
                          <CommandList>
                            <CommandGroup>
                              {suppliers.map((supplier) => (
                                <CommandItem
                                  key={supplier.id}
                                  onSelect={() => {
                                    setSupplierId(supplier.id);
                                    setSupplierPopoverOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="font-medium">{supplier.company_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {supplier.contact_name || "No contact"}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Purchase Order (Optional)</Label>
                    <Popover open={purchasePopoverOpen} onOpenChange={setPurchasePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11"
                        >
                          {referenceNumber || "Select purchase order..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search purchase orders..." />
                          <CommandList>
                            <CommandGroup>
                              {purchaseOrders.map((po) => (
                                <CommandItem
                                  key={po.id}
                                  onSelect={() => {
                                    setReferenceId(po.id);
                                    setReferenceNumber(po.po_number);
                                    setPurchasePopoverOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="font-medium">{po.po_number}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {po.supplier_name} • {format(po.total_amount)} • {po.status}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {(returnType === 'InventoryReturn' || returnType === 'TransferReturn') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">From Location *</Label>
                    <Select value={fromLocationId?.toString() || ""} onValueChange={(value) => setFromLocationId(value ? parseInt(value) : null)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {returnType === 'TransferReturn' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">To Location *</Label>
                      <Select value={toLocationId?.toString() || ""} onValueChange={(value) => setToLocationId(value ? parseInt(value) : null)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Product Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Add Products *</Label>
                <Popover open={productPopoverOpen} onOpenChange={(open) => {
                  setProductPopoverOpen(open);
                  if (open && searchedProducts.length === 0) {
                    loadProducts();
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11"
                    >
                      Search products...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name or SKU..."
                        onValueChange={(value) => loadProducts(value)}
                      />
                      <CommandList>
                        {searchingProducts && (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Searching...
                          </div>
                        )}
                        {!searchingProducts && searchedProducts.length === 0 && (
                          <CommandEmpty>No products found.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {searchedProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => handleProductSelect(product)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                                  {product.category && (
                                    <Badge variant="secondary" className="text-xs mt-1 w-fit">
                                      {product.category}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-sm">
                                    {format(returnType === 'PurchaseReturn' ? product.cost_price : product.selling_price)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Stock: {product.current_stock || 0}</div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected Items */}
              {returnItemsForm.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Selected Items</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {returnItemsForm.map((item, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">
                                {searchedProducts.find(p => p.id === item.product_id)?.name || `Product #${item.product_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {searchedProducts.find(p => p.id === item.product_id)?.sku || ''}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReturnItemsForm(returnItemsForm.filter((_, i) => i !== index));
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Quantity</Label>
                              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleItemQuantityChange(index, Math.max(0, item.quantity - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                                  className="w-16 h-8 text-center text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Reason</Label>
                              <Select value={item.reason} onValueChange={(value) => {
                                const newItems = [...returnItemsForm];
                                newItems[index].reason = value as ReturnReason;
                                setReturnItemsForm(newItems);
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Defective">Defective</SelectItem>
                                  <SelectItem value="WrongItem">Wrong Item</SelectItem>
                                  <SelectItem value="Damaged">Damaged</SelectItem>
                                  <SelectItem value="Expired">Expired</SelectItem>
                                  <SelectItem value="Overstock">Overstock</SelectItem>
                                  <SelectItem value="Recall">Recall</SelectItem>
                                  <SelectItem value="CustomerDissatisfaction">Customer Dissatisfaction</SelectItem>
                                  <SelectItem value="WrongShipment">Wrong Shipment</SelectItem>
                                  <SelectItem value="QualityIssue">Quality Issue</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Disposition</Label>
                              <Select value={item.disposition} onValueChange={(value) => {
                                const newItems = [...returnItemsForm];
                                newItems[index].disposition = value as DispositionAction;
                                setReturnItemsForm(newItems);
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Restock">Restock</SelectItem>
                                  <SelectItem value="Dispose">Dispose</SelectItem>
                                  <SelectItem value="ReturnToSupplier">Return to Supplier</SelectItem>
                                  <SelectItem value="Transfer">Transfer</SelectItem>
                                  <SelectItem value="Repair">Repair</SelectItem>
                                  <SelectItem value="WriteOff">Write Off</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">@{format(item.unit_price)}</span>
                            <span className="text-sm font-bold">{format(item.line_total)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment/Credit Method */}
              {returnType === 'SalesReturn' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Refund Method *</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger className="h-11">
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
              )}

              {returnType === 'PurchaseReturn' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Credit Method *</Label>
                    <Select value={creditMethod} onValueChange={setCreditMethod}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Credit Note">Credit Note</SelectItem>
                        <SelectItem value="Refund">Refund</SelectItem>
                        <SelectItem value="Replacement">Replacement</SelectItem>
                        <SelectItem value="Account Credit">Account Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Expected Credit Date</Label>
                    <Input
                      type="date"
                      value={expectedCreditDate}
                      onChange={(e) => setExpectedCreditDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </>
              )}

              {/* Return Details */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Return Reason</Label>
                <Textarea
                  placeholder="Overall reason for this return..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={2}
                  className="resize-none"
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

              {/* Totals */}
              {returnItemsForm.length > 0 && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">{format(calculateTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-semibold">{format(calculateTotals().taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold">Total {returnType === 'PurchaseReturn' ? 'Credit' : 'Refund'}</span>
                      <span className="text-xl font-bold text-primary">{format(calculateTotals().total)}</span>
                    </div>
                  </CardContent>
                </Card>
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
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={submitting || returnItemsForm.length === 0 || (returnType === 'PurchaseReturn' && !supplierId) || ((returnType === 'InventoryReturn' || returnType === 'TransferReturn') && !fromLocationId)}
              className="flex-1 h-11"
            >
              {submitting ? "Creating..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
