import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { parseUTCDate } from "@/lib/date-utils";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { formatDistance } from "date-fns";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardCheck,
  History,
  Lock,
  Minus,
  MoreHorizontal,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit_of_measure: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
}

interface InventoryItem {
  id: number;
  product_id: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  reserved_stock: number;
  available_stock: number;
  last_updated: string;
  last_stock_take?: string;
  stock_take_count: number;
  product?: Product;
}

interface InventoryMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: number;
  reference_type?: string;
  notes?: string;
  user_id?: number;
  created_at: string;
  product_name?: string;
  user_name?: string;
}

type SortColumn = 'name' | 'sku' | 'current_stock' | 'available_stock';
type SortDirection = 'asc' | 'desc';

export default function Inventory() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Dialogs state
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isStockTakeDialogOpen, setIsStockTakeDialogOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [receiveQuantity, setReceiveQuantity] = useState(0);
  const [receiveCostPrice, setReceiveCostPrice] = useState(0);
  const [receiveSupplier, setReceiveSupplier] = useState("");
  const [receiveReference, setReceiveReference] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveBatchNumber, setReceiveBatchNumber] = useState("");
  const [receiveExpiryDate, setReceiveExpiryDate] = useState("");
  const [receiveLocation, setReceiveLocation] = useState("main");
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [stockTakeCount, setStockTakeCount] = useState(0);
  const [stockTakeNotes, setStockTakeNotes] = useState("");
  const [reserveQuantity, setReserveQuantity] = useState(0);
  const [reserveNotes, setReserveNotes] = useState("");
  const [productMovements, setProductMovements] = useState<InventoryMovement[]>([]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const result = await invoke<InventoryItem[]>("get_inventory");
      setInventory(result);
      toast.success(`✅ Loaded ${result.length} inventory items`);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      toast.error("❌ Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const result = await invoke<InventoryMovement[]>("get_inventory_movements", {
        productId: null,
        limit: 100,
        offset: 0,
      });
      setMovements(result);
    } catch (error) {
      console.error("Failed to load movements:", error);
      toast.error("❌ Failed to load movement history");
    }
  };

  const loadProductMovements = async (productId: number) => {
    try {
      const result = await invoke<InventoryMovement[]>("get_inventory_movements", {
        productId,
        limit: 50,
        offset: 0,
      });
      setProductMovements(result);
    } catch (error) {
      console.error("Failed to load product movements:", error);
    }
  };

  const handleReceiveStock = async () => {
    if (!selectedItem || receiveQuantity <= 0) {
      toast.error("❌ Quantity must be greater than 0");
      return;
    }
    try {
      await invoke("receive_stock", {
        request: {
          product_id: selectedItem.product_id,
          quantity: receiveQuantity,
          cost_price: receiveCostPrice,
          supplier: receiveSupplier || null,
          reference_number: receiveReference || null,
          batch_number: receiveBatchNumber || null,
          expiry_date: receiveExpiryDate || null,
          location: receiveLocation,
          notes: receiveNotes || null,
        },
        userId: user?.id,
      });
      toast.success(`✅ Received ${receiveQuantity} units of ${selectedItem.product?.name}`);
      setIsReceiveDialogOpen(false);
      resetReceiveForm();
      loadInventory();
      loadMovements();
    } catch (error) {
      console.error("Failed to receive stock:", error);
      toast.error(`❌ Failed to receive stock: ${error}`);
    }
  };

  const resetReceiveForm = () => {
    setReceiveQuantity(0);
    setReceiveCostPrice(0);
    setReceiveSupplier("");
    setReceiveReference("");
    setReceiveBatchNumber("");
    setReceiveExpiryDate("");
    setReceiveLocation("main");
    setReceiveNotes("");
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || adjustQuantity <= 0 || !adjustReason.trim()) {
      toast.error(adjustQuantity <= 0 ? "❌ Quantity must be greater than 0" : "❌ Reason is required");
      return;
    }
    try {
      await invoke("adjust_stock", {
        request: {
          product_id: selectedItem.product_id,
          adjustment_type: adjustType,
          quantity: adjustQuantity,
          reason: adjustReason,
          notes: adjustNotes || null,
        },
        userId: user?.id,
      });
      toast.success(`✅ ${adjustType === "add" ? "Added" : "Removed"} ${adjustQuantity} units of ${selectedItem.product?.name}`);
      setIsAdjustDialogOpen(false);
      resetAdjustForm();
      loadInventory();
      loadMovements();
    } catch (error) {
      console.error("Failed to adjust stock:", error);
      toast.error(`❌ Failed to adjust stock: ${error}`);
    }
  };

  const resetAdjustForm = () => {
    setAdjustType("add");
    setAdjustQuantity(0);
    setAdjustReason("");
    setAdjustNotes("");
  };

  const handleStockTake = async () => {
    if (!selectedItem || stockTakeCount < 0) {
      toast.error("❌ Count cannot be negative");
      return;
    }
    try {
      await invoke("stock_take", {
        productId: selectedItem.product_id,
        actualCount: stockTakeCount,
        userId: user?.id,
        notes: stockTakeNotes || null,
      });
      const difference = stockTakeCount - selectedItem.current_stock;
      toast.success(`✅ Stock take completed. Difference: ${difference > 0 ? "+" : ""}${difference} units`);
      setIsStockTakeDialogOpen(false);
      resetStockTakeForm();
      loadInventory();
      loadMovements();
    } catch (error) {
      console.error("Failed to perform stock take:", error);
      toast.error(`❌ Failed to perform stock take: ${error}`);
    }
  };

  const resetStockTakeForm = () => {
    setStockTakeCount(0);
    setStockTakeNotes("");
  };

  const handleReserveStock = async () => {
    if (!selectedItem) {
      toast.error("❌ No item selected");
      return;
    }
    if (reserveQuantity <= 0) {
      toast.error("❌ Quantity must be greater than 0");
      return;
    }
    if (reserveQuantity > selectedItem.available_stock) {
      toast.error(`❌ Only ${selectedItem.available_stock} units available`);
      return;
    }

    try {
      await invoke("reserve_stock", {
        productId: selectedItem.product_id,
        quantity: reserveQuantity,
        userId: user?.id,
        notes: reserveNotes || null,
      });
      toast.success(`✅ Reserved ${reserveQuantity} units of ${selectedItem.product?.name}`);
      setIsReserveDialogOpen(false);
      resetReserveForm();
      loadInventory();
      loadMovements();
    } catch (error) {
      console.error("Failed to reserve stock:", error);
      toast.error(`❌ Failed to reserve stock: ${error}`);
    }
  };

  const resetReserveForm = () => {
    setReserveQuantity(0);
    setReserveNotes("");
  };

  const openReceiveDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setReceiveCostPrice(item.product?.cost_price || 0);
    setIsReceiveDialogOpen(true);
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustDialogOpen(true);
  };

  const openStockTakeDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockTakeCount(item.current_stock);
    setIsStockTakeDialogOpen(true);
  };

  const openReserveDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsReserveDialogOpen(true);
  };

  const openMovementDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    loadProductMovements(item.product_id);
    setIsMovementDialogOpen(true);
  };

  // Filtered and sorted inventory
  const filteredAndSortedInventory = useMemo(() => {
    let filtered = inventory.filter((item) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        item.product?.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.product?.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || item.product?.category === filterCategory;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "in-stock" && item.available_stock > 0) ||
        (filterStatus === "low-stock" && item.current_stock <= item.minimum_stock && item.current_stock > 0) ||
        (filterStatus === "out-of-stock" && item.current_stock === 0) ||
        (filterStatus === "reserved" && item.reserved_stock > 0);
      return matchesSearch && matchesCategory && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortColumn) {
        case 'name':
          aValue = a.product?.name.toLowerCase() || '';
          bValue = b.product?.name.toLowerCase() || '';
          break;
        case 'sku':
          aValue = a.product?.sku.toLowerCase() || '';
          bValue = b.product?.sku.toLowerCase() || '';
          break;
        case 'current_stock':
          aValue = a.current_stock;
          bValue = b.current_stock;
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
  }, [inventory, debouncedSearchQuery, filterCategory, filterStatus, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedInventory.length / itemsPerPage);
  const paginatedInventory = filteredAndSortedInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const categories = [...new Set(inventory.map((i) => i.product?.category).filter(Boolean))];
  const totalItems = inventory.length;
  const inStock = inventory.filter((i) => i.available_stock > 0).length;
  const lowStock = inventory.filter((i) => i.current_stock <= i.minimum_stock && i.current_stock > 0).length;
  const outOfStock = inventory.filter((i) => i.current_stock === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * (item.product?.cost_price || 0)), 0);

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { label: "Out of Stock", color: "destructive" };
    if (item.current_stock <= item.minimum_stock) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "receipt": return <PackagePlus className="w-4 h-4 text-green-600" />;
      case "sale": return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "adjustment": return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case "stock_take": return <ClipboardCheck className="w-4 h-4 text-purple-600" />;
      case "reservation": return <Lock className="w-4 h-4 text-orange-600" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    loadInventory();
    loadMovements();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterCategory, filterStatus, sortColumn, sortDirection]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Package}
        title="Inventory Management"
        subtitle="Manage stock levels, receive inventory, and track movements"
        actions={
          <Button onClick={loadInventory} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Statistics - Compact & Responsive */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Total Items</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{totalItems}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">In Stock</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{inStock}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Low Stock</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{lowStock}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200">
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Out of Stock</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{outOfStock}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200 col-span-2">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Total Value</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{format(totalValue)}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters - Compact */}
      <Card className="shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative group col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 text-sm"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category || ""}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">✓ In Stock</SelectItem>
                <SelectItem value="low-stock">⚠ Low Stock</SelectItem>
                <SelectItem value="out-of-stock">✗ Out of Stock</SelectItem>
                <SelectItem value="reserved">🔒 Has Reservations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs - Compact */}
      <Tabs defaultValue="inventory" className="space-y-3 sm:space-y-4">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="inventory" className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2">
            <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Inventory</span>
            <span className="sm:hidden">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2">
            <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Movement History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Package className="w-4 h-4 mr-2 text-primary" />
                Stock Levels
                <Badge className="ml-2 text-xs" variant="secondary">{filteredAndSortedInventory.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-3">
              {loading ? (
                <div className="space-y-2 p-3 sm:p-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="h-9 px-2 sm:px-4 text-xs cursor-pointer" onClick={() => handleSort('name')}>
                            Product {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />) : <ArrowUpDown className="inline w-3 h-3" />}
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs cursor-pointer hidden md:table-cell" onClick={() => handleSort('sku')}>
                            SKU {sortColumn === 'sku' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />) : <ArrowUpDown className="inline w-3 h-3" />}
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right cursor-pointer" onClick={() => handleSort('current_stock')}>
                            Stock {sortColumn === 'current_stock' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />) : <ArrowUpDown className="inline w-3 h-3" />}
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right hidden lg:table-cell">Reserved</TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right cursor-pointer" onClick={() => handleSort('available_stock')}>
                            Avail {sortColumn === 'available_stock' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />) : <ArrowUpDown className="inline w-3 h-3" />}
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right hidden xl:table-cell">Min/Max</TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs hidden sm:table-cell">Status</TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInventory.map((item) => {
                          const status = getStockStatus(item);
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/50 transition-colors border-b h-12">
                              <TableCell className="py-2 px-2 sm:px-4">
                                <div>
                                  <div className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]">{item.product?.name}</div>
                                  {item.product?.category && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0 h-4 mt-0.5">
                                      {item.product.category}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 font-mono text-[10px] sm:text-xs hidden md:table-cell">
                                {item.product?.sku}
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 text-right">
                                <span className="text-sm sm:text-base font-bold">{item.current_stock}</span>
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 text-right hidden lg:table-cell">
                                {item.reserved_stock > 0 ? (
                                  <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 text-[10px] sm:text-xs px-1.5 py-0 h-5">
                                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                                    {item.reserved_stock}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 text-right">
                                <span className="text-sm sm:text-base font-bold text-primary">{item.available_stock}</span>
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 text-right text-[10px] sm:text-xs text-muted-foreground hidden xl:table-cell">
                                {item.minimum_stock} / {item.maximum_stock}
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 hidden sm:table-cell">
                              <div className="flex flex-col gap-1">
                                {!item.product?.is_active && (
                                  <Badge variant="outline" className="text-xs text-red-600 border-red-600 bg-red-50">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                                {item.product?.is_active && (
                                  <Badge
                                    className={
                                      status.color === "destructive"
                                        ? "bg-red-100 text-red-700 border-red-200"
                                        : status.color === "warning"
                                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                          : "bg-green-100 text-green-700 border-green-200"
                                    }
                                    variant="outline"
                                  >
                                    {status.color === "destructive" ? <TrendingDown className="w-3 h-3 mr-1" /> : 
                                     status.color === "warning" ? <AlertCircle className="w-3 h-3 mr-1" /> : 
                                     <TrendingUp className="w-3 h-3 mr-1" />}
                                    {status.label}
                                  </Badge>
                                )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => openReceiveDialog(item)} className="text-xs">
                                      <PackagePlus className="w-3.5 h-3.5 mr-2" />
                                      Receive Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openAdjustDialog(item)} className="text-xs">
                                      <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                      Adjust Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openStockTakeDialog(item)} className="text-xs">
                                      <ClipboardCheck className="w-3.5 h-3.5 mr-2" />
                                      Stock Take
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openReserveDialog(item)} className="text-xs">
                                      <Lock className="w-3.5 h-3.5 mr-2" />
                                      Reserve Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openMovementDialog(item)} className="text-xs">
                                      <History className="w-3.5 h-3.5 mr-2" />
                                      View History
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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
              )}
              {!loading && filteredAndSortedInventory.length === 0 && (
                <div className="text-center py-6 md:py-12">
                  <Package className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No inventory found</h3>
                  <p className="text-muted-foreground">
                    {debouncedSearchQuery || filterCategory !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Create products to start managing inventory"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement History Tab - Compact & Responsive */}
        <TabsContent value="movements">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
              <CardTitle className="flex items-center text-sm sm:text-base">
                <History className="w-4 h-4 mr-2 text-primary" />
                Recent Stock Movements
                <Badge className="ml-2 text-xs" variant="secondary">{movements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="h-9 px-2 sm:px-4 text-xs">Date</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs">Product</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs">Type</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Change</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs text-right hidden md:table-cell">Previous</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">New</TableHead>
                      <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id} className="hover:bg-muted/50 transition-colors border-b h-12">
                        <TableCell className="py-2 px-2 sm:px-4">
                          <div className="text-[10px] sm:text-xs">
                            {formatDistance(parseUTCDate(movement.created_at), new Date(), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <div className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[150px]">{movement.product_name || `Product #${movement.product_id}`}</div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <div className="flex items-center gap-1">
                            {getMovementIcon(movement.movement_type)}
                            <span className="text-[10px] sm:text-xs capitalize hidden sm:inline">{movement.movement_type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-right">
                          <span
                            className={`text-xs sm:text-sm font-bold ${movement.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {movement.quantity_change > 0 ? "+" : ""}
                            {movement.quantity_change}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-right text-xs hidden md:table-cell">{movement.previous_stock}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium">
                          {movement.new_stock}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] hidden lg:table-cell">
                          {movement.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {movements.length === 0 && (
                <div className="text-center py-6 md:py-12">
                  <History className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <h3 className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">No movements yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Stock movements will appear here as you manage inventory
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Receive Stock Dialog - Enhanced & Responsive */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Receive Stock</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add new stock for {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="receive-quantity" className="text-xs sm:text-sm">Quantity *</Label>
                <Input
                  id="receive-quantity"
                  type="number"
                  value={receiveQuantity}
                  onChange={(e) => setReceiveQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receive-cost-price" className="text-xs sm:text-sm">Cost Price (per unit)</Label>
                <Input
                  id="receive-cost-price"
                  type="number"
                  step="0.01"
                  value={receiveCostPrice}
                  onChange={(e) => setReceiveCostPrice(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="receive-supplier" className="text-xs sm:text-sm">Supplier</Label>
                <Input
                  id="receive-supplier"
                  value={receiveSupplier}
                  onChange={(e) => setReceiveSupplier(e.target.value)}
                  placeholder="e.g. ABC Wholesale"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receive-reference" className="text-xs sm:text-sm">Reference Number</Label>
                <Input
                  id="receive-reference"
                  value={receiveReference}
                  onChange={(e) => setReceiveReference(e.target.value)}
                  placeholder="e.g. PO-12345"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="receive-batch" className="text-xs sm:text-sm">Batch Number</Label>
                <Input
                  id="receive-batch"
                  value={receiveBatchNumber}
                  onChange={(e) => setReceiveBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2024-001"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receive-expiry" className="text-xs sm:text-sm">Expiry Date</Label>
                <Input
                  id="receive-expiry"
                  type="date"
                  value={receiveExpiryDate}
                  onChange={(e) => setReceiveExpiryDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receive-location" className="text-xs sm:text-sm">Storage Location</Label>
              <Select value={receiveLocation} onValueChange={setReceiveLocation}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Warehouse</SelectItem>
                  <SelectItem value="back">Back Storage</SelectItem>
                  <SelectItem value="front">Front Store</SelectItem>
                  <SelectItem value="cold">Cold Storage</SelectItem>
                  <SelectItem value="display">Display Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receive-notes" className="text-xs sm:text-sm">Notes</Label>
              <Textarea
                id="receive-notes"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleReceiveStock} size="sm" className="flex-1 sm:flex-none">
              Receive Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog - Responsive */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Adjust Stock</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Manually adjust stock for {selectedItem?.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Adjustment Type *</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-2 text-green-600" />
                      Add Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center">
                      <Minus className="w-3.5 h-3.5 mr-2 text-red-600" />
                      Remove Stock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-quantity" className="text-xs sm:text-sm">Quantity *</Label>
              <Input
                id="adjust-quantity"
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                min="1"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason" className="text-xs sm:text-sm">Reason *</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged goods</SelectItem>
                  <SelectItem value="lost">Lost/Missing</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="correction">Inventory correction</SelectItem>
                  <SelectItem value="promotion">Promotional giveaway</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-notes" className="text-xs sm:text-sm">Additional Notes</Label>
              <Textarea
                id="adjust-notes"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleAdjustStock} size="sm" className="flex-1 sm:flex-none">Adjust Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Take Dialog - Responsive */}
      <Dialog open={isStockTakeDialogOpen} onOpenChange={setIsStockTakeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Stock Take / Physical Count</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Enter the actual physical count for {selectedItem?.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">System Count</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedItem?.current_stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Difference</p>
                  <p
                    className={`text-xl sm:text-2xl font-bold ${stockTakeCount - (selectedItem?.current_stock || 0) > 0
                      ? "text-green-600"
                      : stockTakeCount - (selectedItem?.current_stock || 0) < 0
                        ? "text-red-600"
                        : ""
                      }`}
                  >
                    {stockTakeCount - (selectedItem?.current_stock || 0) > 0 ? "+" : ""}
                    {stockTakeCount - (selectedItem?.current_stock || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-take-count" className="text-xs sm:text-sm">Actual Count *</Label>
              <Input
                id="stock-take-count"
                type="number"
                value={stockTakeCount}
                onChange={(e) => setStockTakeCount(parseInt(e.target.value) || 0)}
                min="0"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-take-notes" className="text-xs sm:text-sm">Notes</Label>
              <Textarea
                id="stock-take-notes"
                value={stockTakeNotes}
                onChange={(e) => setStockTakeNotes(e.target.value)}
                rows={2}
                placeholder="Explain any discrepancies..."
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsStockTakeDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleStockTake} size="sm" className="flex-1 sm:flex-none">Complete Stock Take</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve Stock Dialog - Responsive */}
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Reserve Stock</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Reserve stock for orders or quotes - {selectedItem?.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Available</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedItem?.available_stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Already Reserved</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedItem?.reserved_stock}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reserve-quantity" className="text-xs sm:text-sm">Quantity to Reserve *</Label>
              <Input
                id="reserve-quantity"
                type="number"
                value={reserveQuantity}
                onChange={(e) => setReserveQuantity(parseInt(e.target.value) || 0)}
                min="1"
                max={selectedItem?.available_stock || 0}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reserve-notes" className="text-xs sm:text-sm">Notes (Order ID, Customer name, etc.)</Label>
              <Textarea
                id="reserve-notes"
                value={reserveNotes}
                onChange={(e) => setReserveNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleReserveStock} size="sm" className="flex-1 sm:flex-none">Reserve Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog - Responsive & Compact */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Movement History - {selectedItem?.product?.name}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">All stock movements for this product</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="h-9 px-2 sm:px-4 text-xs">Date</TableHead>
                  <TableHead className="h-9 px-2 sm:px-4 text-xs">Type</TableHead>
                  <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Change</TableHead>
                  <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">New Stock</TableHead>
                  <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productMovements.map((movement) => (
                  <TableRow key={movement.id} className="hover:bg-muted/50 transition-colors border-b h-12">
                    <TableCell className="py-2 px-2 sm:px-4 text-[10px] sm:text-xs">
                      {formatDistance(parseUTCDate(movement.created_at), new Date(), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-4">
                      <div className="flex items-center gap-1">
                        {getMovementIcon(movement.movement_type)}
                        <span className="text-[10px] sm:text-xs capitalize">{movement.movement_type.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-4 text-right">
                      <span
                        className={`text-xs sm:text-sm font-bold ${movement.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {movement.quantity_change > 0 ? "+" : ""}
                        {movement.quantity_change}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium">
                      {movement.new_stock}
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-4 text-[10px] sm:text-xs text-muted-foreground hidden md:table-cell">
                      {movement.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {productMovements.length === 0 && (
              <div className="text-center py-6 md:py-12">
                <History className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs sm:text-sm text-muted-foreground">No movements for this product yet</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setIsMovementDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}