// src/pages/Inventory.tsx
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
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  FileText,
  History,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  const { format } = useCurrency();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuthStore();

  const loadInventory = async () => {
    try {
      setLoading(true);
      const result = await invoke<InventoryItem[]>("get_inventory");
      setInventory(result);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const result = await invoke<InventoryMovement[]>("get_inventory_movements", {
        productId: null,
        limit: 50,
        offset: 0,
      });
      setMovements(result);
    } catch (error) {
      console.error("Failed to load movements:", error);
      toast.error("Failed to load inventory movements");
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || !user) {
      toast.error("Missing required information");
      return;
    }

    if (adjustmentQuantity === 0) {
      toast.error("Adjustment quantity cannot be zero");
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    try {
      await invoke("create_stock_adjustment", {
        productId: selectedItem.product_id,
        quantityChange: adjustmentQuantity,
        reason: adjustmentReason,
        userId: user.id,
      });

      toast.success("Stock adjusted successfully");
      setIsAdjustmentDialogOpen(false);
      setSelectedItem(null);
      setAdjustmentQuantity(0);
      setAdjustmentReason("");
      loadInventory();
      loadMovements();
    } catch (error) {
      console.error("Failed to adjust stock:", error);
      toast.error("Failed to adjust stock");
    }
  };

  const openAdjustmentDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentQuantity(0);
    setAdjustmentReason("");
    setIsAdjustmentDialogOpen(true);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) {
      return { label: "Out of Stock", color: "destructive" as const };
    }
    if (item.current_stock <= item.minimum_stock) {
      return { label: "Low Stock", color: "destructive" as const };
    }
    if (item.current_stock <= item.minimum_stock * 1.5) {
      return { label: "Warning", color: "secondary" as const };
    }
    if (item.maximum_stock > 0 && item.current_stock >= item.maximum_stock) {
      return { label: "Overstock", color: "secondary" as const };
    }
    return { label: "In Stock", color: "default" as const };
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product?.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || item.product?.category === filterCategory;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "low" && item.current_stock <= item.minimum_stock) ||
      (filterStatus === "out" && item.current_stock === 0) ||
      (filterStatus === "ok" && item.current_stock > item.minimum_stock);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(
    new Set(inventory.map((item) => item.product?.category).filter(Boolean))
  );

  const totalValue = inventory.reduce(
    (sum, item) =>
      sum + (item.product?.cost_price || 0) * item.current_stock,
    0
  );

  const lowStockCount = inventory.filter(
    (item) => item.current_stock <= item.minimum_stock
  ).length;

  const outOfStockCount = inventory.filter(
    (item) => item.current_stock === 0
  ).length;

  useEffect(() => {
    loadInventory();
    loadMovements();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your stock levels
          </p>
        </div>
        <Button onClick={() => { loadInventory(); loadMovements(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold">
                  {format(totalValue)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Low Stock
                </p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Warehouse className="w-4 h-4 mr-2" />
            Stock Overview
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="w-4 h-4 mr-2" />
            Movement History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="ok">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-10 w-[100px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Min/Max</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item);
                      const stockValue =
                        (item.product?.cost_price || 0) * item.current_stock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {item.product?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.product?.category}
                                {item.product?.brand &&
                                  ` • ${item.product.brand}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {item.product?.sku}
                            </div>
                            {item.product?.barcode && (
                              <div className="text-xs text-muted-foreground">
                                {item.product.barcode}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              {item.current_stock}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.product?.unit_of_measure}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{item.available_stock}</div>
                            {item.reserved_stock > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Reserved: {item.reserved_stock}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              Min: {item.minimum_stock}
                            </div>
                            {item.maximum_stock > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Max: {item.maximum_stock}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {format(stockValue)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{format(item.product?.cost_price || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentDialog(item)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Adjust
                            </Button>
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
                  <h3 className="text-lg font-medium mb-2">
                    No inventory items found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(movement.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {movement.product_name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {movement.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center ${
                            movement.quantity_change > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.quantity_change > 0 ? (
                            <Plus className="w-4 h-4 mr-1" />
                          ) : (
                            <Minus className="w-4 h-4 mr-1" />
                          )}
                          {Math.abs(movement.quantity_change)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movement.previous_stock} → {movement.new_stock}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movement.user_name || "System"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {movement.notes || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {movements.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    No movements recorded
                  </h3>
                  <p className="text-muted-foreground">
                    Stock movements will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={isAdjustmentDialogOpen}
        onOpenChange={setIsAdjustmentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              {selectedItem?.product?.name} (SKU: {selectedItem?.product?.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  Current Stock:
                </span>
                <span className="font-semibold">
                  {selectedItem?.current_stock}{" "}
                  {selectedItem?.product?.unit_of_measure}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  New Stock:
                </span>
                <span className="font-semibold">
                  {(selectedItem?.current_stock || 0) + adjustmentQuantity}{" "}
                  {selectedItem?.product?.unit_of_measure}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment Quantity</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAdjustmentQuantity(adjustmentQuantity - 1)
                  }
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  id="adjustment"
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) =>
                    setAdjustmentQuantity(parseInt(e.target.value) || 0)
                  }
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAdjustmentQuantity(adjustmentQuantity + 1)
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use negative numbers to decrease stock
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this adjustment..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockAdjustment}
              disabled={adjustmentQuantity === 0 || !adjustmentReason.trim()}
            >
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
