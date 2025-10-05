
// src/pages/Inventory.tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, History, Warehouse, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface InventoryItem {
  id: number;
  product_id: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number | null;
  reserved_stock: number;
  available_stock: number;
  last_updated: string;
  product?: { name: string; sku: string };
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "subtract" | "set">("add");
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState("");

  const [stockTakeOpen, setStockTakeOpen] = useState(false);
  const [stockTakeQty, setStockTakeQty] = useState<number>(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [movements, setMovements] = useState<{ id: number; movement_type: string; quantity_change: number; notes?: string | null; created_at: string; }[]>([]);
  const [minStock, setMinStock] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number | null>(null);
  const { user } = useAuthStore();
  const canAdjust = user?.role === "Admin" || user?.role === "Manager";

  const load = async () => {
    try {
      setRefreshing(true);
      const data = await invoke<InventoryItem[]>("get_inventory");
      setItems(data);
    } catch (e) {
      toast.error("Failed to load inventory");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    (i.product?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.product?.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdjust = (item: InventoryItem) => {
    setSelected(item);
    setAdjustType("add");
    setAdjustQty(0);
    setAdjustNotes("");
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    if (!selected) return;
    if (adjustType !== "set" && adjustQty <= 0) { toast.error("Enter a quantity"); return; }
    try {
      await invoke("create_stock_adjustment", {
        productId: selected.product_id,
        adjustmentType: adjustType,
        quantity: adjustType === "set" ? stockTakeQty : adjustQty,
        notes: adjustNotes || undefined,
        userId: 1,
        userName: "System"
      });
      toast.success("Stock adjusted");
      setAdjustOpen(false);
      load();
    } catch (e) {
      toast.error("Failed to adjust stock");
    }
  };

  const openStockTake = (item: InventoryItem) => {
    setSelected(item);
    setStockTakeQty(item.current_stock);
    setStockTakeOpen(true);
  };

  const submitStockTake = async () => {
    if (!selected) return;
    try {
      await invoke("create_stock_adjustment", {
        productId: selected.product_id,
        adjustmentType: "set",
        quantity: stockTakeQty,
        notes: "Stock take",
        userId: 1,
        userName: "System"
      });
      toast.success("Stock count saved");
      setStockTakeOpen(false);
      load();
    } catch (e) {
      toast.error("Failed to save stock take");
    }
  };

  const openSettings = (item: InventoryItem) => {
    setSelected(item);
    setMinStock(item.minimum_stock);
    setMaxStock(item.maximum_stock);
    setSettingsOpen(true);
  };

  const submitSettings = async () => {
    if (!selected) return;
    try {
      await invoke("update_inventory_settings", {
        productId: selected.product_id,
        minimumStock: minStock,
        maximumStock: maxStock,
      });
      setSettingsOpen(false);
      load();
    } catch (e) {
      toast.error("Failed to update settings");
    }
  };

  const statusBadge = (item: InventoryItem) => {
    if (item.current_stock <= 0) return <Badge variant="destructive">Out</Badge>;
    if (item.current_stock <= item.minimum_stock) return <Badge variant="secondary">Low</Badge>;
    return <Badge>OK</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input className="pl-10" placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>On Hand</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.product?.name || ""}</TableCell>
                    <TableCell>{it.product?.sku || ""}</TableCell>
                    <TableCell className="font-medium">{it.current_stock}</TableCell>
                    <TableCell>{it.reserved_stock}</TableCell>
                    <TableCell>{it.available_stock}</TableCell>
                    <TableCell>{it.minimum_stock}</TableCell>
                    <TableCell>{new Date(it.last_updated).toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(it)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAdjust(it)} disabled={!canAdjust}>
                        <Plus className="w-4 h-4 mr-1" /> Adjust
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openStockTake(it)} disabled={!canAdjust}>
                        <Warehouse className="w-4 h-4 mr-1" /> Stock Take
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSettings(it)} disabled={!canAdjust}>
                        Settings
                      </Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        setSelected(it);
                        try {
                          const data = await invoke<any[]>("get_stock_movements", { productId: it.product_id, limit: 50 });
                          setMovements(data.map(m => ({ id: m.id, movement_type: m.movement_type, quantity_change: m.quantity_change, notes: m.notes, created_at: m.created_at })));
                          setHistoryOpen(true);
                        } catch {
                          toast.error("Failed to load history");
                        }
                      }}>
                        <History className="w-4 h-4 mr-1" /> History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Movement History Drawer (modal) */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Movement History - {selected?.product?.name}</DialogTitle>
                  <DialogDescription>Recent inventory movements</DialogDescription>
                </DialogHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map(m => (
                        <TableRow key={m.id}>
                          <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
                          <TableCell>{m.movement_type}</TableCell>
                          <TableCell className={m.quantity_change < 0 ? "text-red-600" : "text-green-600"}>{m.quantity_change}</TableCell>
                          <TableCell>{m.notes || ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter>
                  <Button onClick={() => setHistoryOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selected?.product?.name}</DialogTitle>
            <DialogDescription>Increase, decrease or set a new on-hand quantity.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <select className="w-full border rounded h-10 px-3" value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)}>
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
                <option value="set">Set</option>
              </select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="md:col-span-3">
              <Label>Notes</Label>
              <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={submitAdjust}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Take Dialog */}
      <Dialog open={stockTakeOpen} onOpenChange={setStockTakeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Take - {selected?.product?.name}</DialogTitle>
            <DialogDescription>Set the counted on-hand quantity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Counted Quantity</Label>
            <Input type="number" value={stockTakeQty} onChange={(e) => setStockTakeQty(parseInt(e.target.value) || 0)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockTakeOpen(false)}>Cancel</Button>
            <Button onClick={submitStockTake}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory Settings - {selected?.product?.name}</DialogTitle>
            <DialogDescription>Update minimum/maximum stock thresholds.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Minimum Stock</Label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Maximum Stock</Label>
              <Input type="number" value={maxStock ?? 0} onChange={(e) => setMaxStock(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={submitSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}