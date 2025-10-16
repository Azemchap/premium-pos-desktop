// src/pages/Inventory.tsx - Enhanced Stock Management
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Plus,
  Minus,
  RefreshCw,
  MoreHorizontal,
  PackagePlus,
  ClipboardCheck,
  History,
  Lock,
  Unlock,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { formatDistance } from "date-fns";

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

export default function Inventory() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialogs state
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isStockTakeDialogOpen, setIsStockTakeDialogOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Receive stock form
  const [receiveQuantity, setReceiveQuantity] = useState(0);
  const [receiveCostPrice, setReceiveCostPrice] = useState(0);
  const [receiveSupplier, setReceiveSupplier] = useState("");
  const [receiveReference, setReceiveReference] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  // Adjust stock form
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Stock take form
  const [stockTakeCount, setStockTakeCount] = useState(0);
  const [stockTakeNotes, setStockTakeNotes] = useState("");

  // Reserve stock form
  const [reserveQuantity, setReserveQuantity] = useState(0);
  const [reserveNotes, setReserveNotes] = useState("");

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

  // ========== RECEIVE STOCK ==========
  const handleReceiveStock = async () => {
    if (!selectedItem) return;
    if (receiveQuantity <= 0) {
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
    setReceiveNotes("");
  };

  // ========== ADJUST STOCK ==========
  const handleAdjustStock = async () => {
    if (!selectedItem) return;
    if (adjustQuantity <= 0) {
      toast.error("❌ Quantity must be greater than 0");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("❌ Reason is required");
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

      const action = adjustType === "add" ? "Added" : "Removed";
      toast.success(`✅ ${action} ${adjustQuantity} units of ${selectedItem.product?.name}`);
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

  // ========== STOCK TAKE ==========
  const handleStockTake = async () => {
    if (!selectedItem) return;
    if (stockTakeCount < 0) {
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
      toast.success(
        `✅ Stock take completed. Difference: ${difference > 0 ? "+" : ""}${difference} units`
      );
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

  // ========== RESERVE STOCK ==========
  const handleReserveStock = async () => {
    if (!selectedItem) return;
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

  // ========== DIALOGS ==========
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

  const [productMovements, setProductMovements] = useState<InventoryMovement[]>([]);
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

  // Filters
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || item.product?.category === filterCategory;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "in-stock" && item.available_stock > 0) ||
      (filterStatus === "low-stock" &&
        item.current_stock <= item.minimum_stock &&
        item.current_stock > 0) ||
      (filterStatus === "out-of-stock" && item.current_stock === 0) ||
      (filterStatus === "reserved" && item.reserved_stock > 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(inventory.map((i) => i.product?.category).filter(Boolean))];

  // Statistics
  const totalItems = inventory.length;
  const inStock = inventory.filter((i) => i.available_stock > 0).length;
  const lowStock = inventory.filter(
    (i) => i.current_stock <= i.minimum_stock && i.current_stock > 0
  ).length;
  const outOfStock = inventory.filter((i) => i.current_stock === 0).length;
  const totalValue = inventory.reduce(
    (sum, item) => sum + (item.current_stock * (item.product?.cost_price || 0)),
    0
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { label: "Out of Stock", color: "destructive" };
    if (item.current_stock <= item.minimum_stock)
      return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "receipt":
        return <PackagePlus className="w-4 h-4 text-green-600" />;
      case "sale":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "adjustment":
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case "stock_take":
        return <ClipboardCheck className="w-4 h-4 text-purple-600" />;
      case "reservation":
        return <Lock className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    loadInventory();
    loadMovements();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage stock levels, receive inventory, and track movements
          </p>
        </div>
        <Button onClick={loadInventory} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{inStock}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStock}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{format(totalValue)}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="reserved">Has Reservations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="w-4 h-4 mr-2" />
            Movement History
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Min/Max</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product?.name}</div>
                              {item.product?.category && (
                                <div className="text-sm text-muted-foreground">
                                  {item.product.category}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.product?.sku}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {item.current_stock}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.reserved_stock > 0 ? (
                              <Badge variant="outline">{item.reserved_stock}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.available_stock}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.minimum_stock} / {item.maximum_stock}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={
                                  status.color === "destructive"
                                    ? "destructive"
                                    : status.color === "warning"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {status.label}
                              </Badge>
                              {!item.product?.is_active && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                  Inactive Product
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openReceiveDialog(item)}>
                                  <PackagePlus className="w-4 h-4 mr-2" />
                                  Receive Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAdjustDialog(item)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Adjust Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openStockTakeDialog(item)}>
                                  <ClipboardCheck className="w-4 h-4 mr-2" />
                                  Stock Take
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReserveDialog(item)}>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Reserve Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMovementDialog(item)}>
                                  <History className="w-4 h-4 mr-2" />
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
              )}

              {!loading && filteredInventory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No inventory found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || filterCategory !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Create products to start managing inventory"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement History Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistance(new Date(movement.created_at), new Date(), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.product_name || `Product #${movement.product_id}`}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <span className="capitalize">{movement.movement_type.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-bold ${
                            movement.quantity_change > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {movement.quantity_change > 0 ? "+" : ""}
                          {movement.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{movement.previous_stock}</TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.new_stock}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {movements.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No movements yet</h3>
                  <p className="text-muted-foreground">
                    Stock movements will appear here as you manage inventory
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECEIVE STOCK DIALOG */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
            <DialogDescription>
              Add new stock for {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receive-quantity">Quantity *</Label>
              <Input
                id="receive-quantity"
                type="number"
                value={receiveQuantity}
                onChange={(e) => setReceiveQuantity(parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receive-cost-price">Cost Price (per unit)</Label>
              <Input
                id="receive-cost-price"
                type="number"
                step="0.01"
                value={receiveCostPrice}
                onChange={(e) => setReceiveCostPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receive-supplier">Supplier</Label>
              <Input
                id="receive-supplier"
                value={receiveSupplier}
                onChange={(e) => setReceiveSupplier(e.target.value)}
                placeholder="e.g. ABC Wholesale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receive-reference">Reference Number</Label>
              <Input
                id="receive-reference"
                value={receiveReference}
                onChange={(e) => setReceiveReference(e.target.value)}
                placeholder="e.g. PO-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receive-notes">Notes</Label>
              <Textarea
                id="receive-notes"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceiveStock}>Receive Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADJUST STOCK DIALOG */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust stock for {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adjustment Type *</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2 text-green-600" />
                      Add Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center">
                      <Minus className="w-4 h-4 mr-2 text-red-600" />
                      Remove Stock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-quantity">Quantity *</Label>
              <Input
                id="adjust-quantity"
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason *</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="adjust-notes">Additional Notes</Label>
              <Textarea
                id="adjust-notes"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock}>Adjust Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STOCK TAKE DIALOG */}
      <Dialog open={isStockTakeDialogOpen} onOpenChange={setIsStockTakeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Take / Physical Count</DialogTitle>
            <DialogDescription>
              Enter the actual physical count for {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">System Count</p>
                  <p className="text-2xl font-bold">{selectedItem?.current_stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Difference</p>
                  <p
                    className={`text-2xl font-bold ${
                      stockTakeCount - (selectedItem?.current_stock || 0) > 0
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
            <div className="space-y-2">
              <Label htmlFor="stock-take-count">Actual Count *</Label>
              <Input
                id="stock-take-count"
                type="number"
                value={stockTakeCount}
                onChange={(e) => setStockTakeCount(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-take-notes">Notes</Label>
              <Textarea
                id="stock-take-notes"
                value={stockTakeNotes}
                onChange={(e) => setStockTakeNotes(e.target.value)}
                rows={2}
                placeholder="Explain any discrepancies..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockTakeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockTake}>Complete Stock Take</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESERVE STOCK DIALOG */}
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve Stock</DialogTitle>
            <DialogDescription>
              Reserve stock for orders or quotes - {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{selectedItem?.available_stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Already Reserved</p>
                  <p className="text-2xl font-bold">{selectedItem?.reserved_stock}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-quantity">Quantity to Reserve *</Label>
              <Input
                id="reserve-quantity"
                type="number"
                value={reserveQuantity}
                onChange={(e) => setReserveQuantity(parseInt(e.target.value) || 0)}
                min="1"
                max={selectedItem?.available_stock || 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-notes">Notes (Order ID, Customer name, etc.)</Label>
              <Textarea
                id="reserve-notes"
                value={reserveNotes}
                onChange={(e) => setReserveNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReserveStock}>Reserve Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVEMENT HISTORY DIALOG */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Movement History - {selectedItem?.product?.name}</DialogTitle>
            <DialogDescription>All stock movements for this product</DialogDescription>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">New Stock</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {formatDistance(new Date(movement.created_at), new Date(), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        <span className="capitalize">
                          {movement.movement_type.replace("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-bold ${
                          movement.quantity_change > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {movement.quantity_change > 0 ? "+" : ""}
                        {movement.quantity_change}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.new_stock}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {productMovements.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No movements for this product yet</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMovementDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
