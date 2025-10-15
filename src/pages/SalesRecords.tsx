// src/pages/SalesRecords.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Eye,
  X,
  Filter,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";

interface SaleWithDetails {
  id: number;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  cashier_id: number;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  is_voided: boolean;
  voided_by?: number;
  voided_at?: string;
  void_reason?: string;
  shift_id?: number;
  created_at: string;
  items_count: number;
  profit: number;
}

interface SalesStats {
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
  total_profit: number;
  profit_margin: number;
  cash_sales: number;
  card_sales: number;
  mobile_sales: number;
  check_sales: number;
}

interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  tax_amount: number;
  cost_price: number;
  created_at: string;
}

interface Sale {
  id: number;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  cashier_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  is_voided: boolean;
  voided_by?: number;
  voided_at?: string;
  void_reason?: string;
  shift_id?: number;
  created_at: string;
}

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

export default function SalesRecords() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getDateRangeDates = (range: DateRange): { start: string; end: string } => {
    const today = new Date();
    const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

    switch (range) {
      case "today":
        return { start: formatDate(today), end: formatDate(today) };
      case "week":
        return { start: formatDate(startOfWeek(today)), end: formatDate(today) };
      case "month":
        return { start: formatDate(startOfMonth(today)), end: formatDate(today) };
      case "quarter":
        return { start: formatDate(startOfQuarter(today)), end: formatDate(today) };
      case "year":
        return { start: formatDate(startOfYear(today)), end: formatDate(today) };
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: formatDate(today), end: formatDate(today) };
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRangeDates(dateRange);

      const [salesData, statsData] = await Promise.all([
        invoke<SaleWithDetails[]>("get_sales_with_details", {
          startDate: start || undefined,
          endDate: end || undefined,
          paymentMethod: paymentMethod !== "all" ? paymentMethod : undefined,
          limit: 1000,
          offset: 0,
        }),
        invoke<SalesStats>("get_sales_stats", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
      ]);

      setSales(salesData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load sales:", error);
      toast.error("Failed to load sales records");
    } finally {
      setLoading(false);
    }
  };

  const loadSaleDetails = async (saleId: number) => {
    try {
      const [sale, items] = await invoke<[Sale, SaleItem[]]>("get_sale_details", { saleId });
      setSelectedSale(sale);
      setSaleItems(items);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error("Failed to load sale details:", error);
      toast.error("Failed to load sale details");
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      !searchQuery ||
      sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.customer_phone && sale.customer_phone.includes(searchQuery));

    return matchesSearch;
  });

  useEffect(() => {
    loadSales();
  }, [dateRange, paymentMethod, startDate, endDate]);

  const paymentMethodColors: Record<string, string> = {
    cash: "bg-green-100 text-green-800",
    card: "bg-blue-100 text-blue-800",
    mobile: "bg-purple-100 text-purple-800",
    check: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Records</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze sales transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">${stats.total_sales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total_transactions} transactions
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">${stats.total_profit.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.profit_margin.toFixed(1)}% margin
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-bold">${stats.average_transaction.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    per sale
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Payment Methods</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Cash</span>
                    <span className="font-medium">${stats.cash_sales.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Card</span>
                    <span className="font-medium">${stats.card_sales.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Mobile</span>
                    <span className="font-medium">${stats.mobile_sales.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Sale #, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadSales} className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredSales.length} of {sales.length} sales
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
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
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className={sale.is_voided ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(sale.created_at), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(sale.created_at), "hh:mm a")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{sale.sale_number}</div>
                      {sale.is_voided && (
                        <Badge variant="destructive" className="mt-1">
                          Voided
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sale.customer_name ? (
                        <div>
                          <div className="font-medium">{sale.customer_name}</div>
                          {sale.customer_phone && (
                            <div className="text-sm text-muted-foreground">
                              {sale.customer_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{sale.cashier_name || `Cashier #${sale.cashier_id}`}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.items_count} items</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentMethodColors[sale.payment_method] || ""}>
                        {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">${sale.total_amount.toFixed(2)}</div>
                      {sale.discount_amount > 0 && (
                        <div className="text-xs text-red-600">
                          -${sale.discount_amount.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-medium ${sale.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                        ${sale.profit.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sale.total_amount > 0 ? ((sale.profit / sale.total_amount) * 100).toFixed(1) : 0}% margin
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadSaleDetails(sale.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredSales.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No sales found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search criteria" : "No sales in this date range"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Complete information about this sale
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Sale Number</Label>
                  <p className="font-mono font-medium">{selectedSale.sale_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), "MMM dd, yyyy hh:mm a")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <Badge className={`${paymentMethodColors[selectedSale.payment_method] || ""} mt-1`}>
                    {selectedSale.payment_method.charAt(0).toUpperCase() + selectedSale.payment_method.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={selectedSale.is_voided ? "destructive" : "default"} className="mt-1">
                    {selectedSale.is_voided ? "Voided" : "Completed"}
                  </Badge>
                </div>
              </div>

              {/* Customer Info */}
              {selectedSale.customer_name && (
                <div>
                  <Label className="text-muted-foreground">Customer Information</Label>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedSale.customer_name}</p>
                    {selectedSale.customer_phone && <p className="text-sm">{selectedSale.customer_phone}</p>}
                    {selectedSale.customer_email && <p className="text-sm">{selectedSale.customer_email}</p>}
                  </div>
                </div>
              )}

              {/* Sale Items */}
              <div>
                <Label className="text-muted-foreground">Items</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>Product #{item.product_id}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.line_total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">${selectedSale.tax_amount.toFixed(2)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span className="font-medium">-${selectedSale.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>${selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{selectedSale.notes}</p>
                </div>
              )}

              {/* Void Info */}
              {selectedSale.is_voided && selectedSale.void_reason && (
                <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                  <Label className="text-red-800">Void Reason</Label>
                  <p className="text-red-700 mt-1">{selectedSale.void_reason}</p>
                  {selectedSale.voided_at && (
                    <p className="text-sm text-red-600 mt-1">
                      Voided on {format(new Date(selectedSale.voided_at), "MMM dd, yyyy hh:mm a")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
