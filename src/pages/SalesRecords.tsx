import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatCurrency } from "@/lib/currency";
import { formatLocalDate, parseUTCDate } from "@/lib/date-utils";
import { printReceipt } from "@/lib/receipt-printer";
import { invoke } from "@tauri-apps/api/core";
import { format as formatDate, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CreditCard,
  DollarSign,
  Eye,
  Printer,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
  product?: {
    name: string;
  };
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
type SortColumn = 'created_at' | 'sale_number' | 'total_amount' | 'profit';
type SortDirection = 'asc' | 'desc';

export default function SalesRecords() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 20;

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getDateRangeDates = (range: DateRange): { start: string; end: string } => {
    const today = new Date();
    const formatDateString = (date: Date) => formatDate(date, "yyyy-MM-dd");

    switch (range) {
      case "today":
        return { start: formatDateString(today), end: formatDateString(today) };
      case "week":
        return { start: formatDateString(startOfWeek(today)), end: formatDateString(today) };
      case "month":
        return { start: formatDateString(startOfMonth(today)), end: formatDateString(today) };
      case "quarter":
        return { start: formatDateString(startOfQuarter(today)), end: formatDateString(today) };
      case "year":
        return { start: formatDateString(startOfYear(today)), end: formatDateString(today) };
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: formatDateString(today), end: formatDateString(today) };
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

      // Find the sale with details for printing
      const saleWithDetails = sales.find(s => s.id === saleId);
      setSelectedSaleDetails(saleWithDetails || null);

      setIsDetailsOpen(true);
      toast.success("✅ Sale details loaded");
    } catch (error) {
      console.error("Failed to load sale details:", error);
      toast.error("❌ Failed to load sale details");
    }
  };

  const printSaleReceipt = async () => {
    if (!selectedSale || saleItems.length === 0) {
      toast.error("❌ No sale data available");
      return;
    }

    try {
      // Prepare sale data for the centralized receipt printer
      const saleData = {
        sale_number: selectedSale.sale_number,
        created_at: selectedSale.created_at,
        cashier_name: selectedSaleDetails?.cashier_name,
        customer_name: selectedSale.customer_name,
        customer_phone: selectedSale.customer_phone,
        items: saleItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product?.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          tax_amount: item.tax_amount,
        })),
        subtotal: selectedSale.subtotal,
        tax_amount: selectedSale.tax_amount,
        discount_amount: selectedSale.discount_amount,
        total_amount: selectedSale.total_amount,
        payment_method: selectedSale.payment_method,
        notes: selectedSale.notes,
        amount_received: undefined, // Not provided in current data; adjust if available
        change: undefined, // Not provided in current data; adjust if available
      };

      // Use centralized receipt printer
      await printReceipt(saleData);
    } catch (error) {
      console.error("Failed to print receipt:", error);
      toast.error("❌ Failed to print receipt");
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Filtered and sorted sales
  const filteredAndSortedSales = useMemo(() => {
    let filtered = sales.filter((sale) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        sale.sale_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
        (sale.customer_phone && sale.customer_phone.includes(debouncedSearchQuery));

      return matchesSearch;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortColumn) {
        case 'created_at':
          aValue = parseUTCDate(a.created_at).getTime();
          bValue = parseUTCDate(b.created_at).getTime();
          break;
        case 'sale_number':
          aValue = a.sale_number;
          bValue = b.sale_number;
          break;
        case 'total_amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'profit':
          aValue = a.profit;
          bValue = b.profit;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sales, debouncedSearchQuery, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedSales.length / salesPerPage);
  const paginatedSales = filteredAndSortedSales.slice(
    (currentPage - 1) * salesPerPage,
    currentPage * salesPerPage
  );

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    loadSales();
  }, [dateRange, paymentMethod, startDate, endDate]);

  useEffect(() => {
    // Reset to first page when filters or sort change
    setCurrentPage(1);
  }, [debouncedSearchQuery, dateRange, paymentMethod, startDate, endDate, sortColumn, sortDirection]);

  const paymentMethodColors: Record<string, string> = {
    cash: "bg-green-100 text-green-800",
    card: "bg-blue-100 text-blue-800",
    mobile: "bg-purple-100 text-purple-800",
    check: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-3 sm:space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-lg  md:text-3xl font-bold">Sales Records</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze sales transactions
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 md:gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
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
            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-4 md:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(stats.total_sales)}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.total_profit)}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(stats.average_transaction)}</p>
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
                    <span className="font-medium">{formatCurrency(stats.cash_sales)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Card</span>
                    <span className="font-medium">{formatCurrency(stats.card_sales)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Mobile</span>
                    <span className="font-medium">{formatCurrency(stats.mobile_sales)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 md:space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                      Date & Time {sortColumn === 'created_at' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4 md:h-4" /> : <ArrowDown className="inline w-4 h-4 md:h-4" />) : <ArrowUpDown className="inline w-4 h-4 md:h-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('sale_number')}>
                      Sale # {sortColumn === 'sale_number' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4 md:h-4" /> : <ArrowDown className="inline w-4 h-4 md:h-4" />) : <ArrowUpDown className="inline w-4 h-4 md:h-4" />}
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('total_amount')}>
                      Total {sortColumn === 'total_amount' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4 md:h-4" /> : <ArrowDown className="inline w-4 h-4 md:h-4" />) : <ArrowUpDown className="inline w-4 h-4 md:h-4" />}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('profit')}>
                      Profit {sortColumn === 'profit' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4 md:h-4" /> : <ArrowDown className="inline w-4 h-4 md:h-4" />) : <ArrowUpDown className="inline w-4 h-4 md:h-4" />}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id} className={sale.is_voided ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatLocalDate(sale.created_at, "short-date")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatLocalDate(sale.created_at, "short-time")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs sm:text-sm">{sale.sale_number}</div>
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
                        <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                        {sale.discount_amount > 0 && (
                          <div className="text-xs text-red-600">
                            -{formatCurrency(sale.discount_amount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-medium ${sale.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(sale.profit)}
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

          {!loading && filteredAndSortedSales.length === 0 && (
            <div className="text-center py-6 md:py-12">
              <Calendar className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No sales found</h3>
              <p className="text-muted-foreground">
                {debouncedSearchQuery ? "Try adjusting your search criteria" : "No sales in this date range"}
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
            <div className="space-y-3 sm:space-y-3 md:space-y-6">
              {/* Sale Header */}
              <div className="grid grid-cols-1 lg:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1 md:gap-4">
                <div>
                  <Label className="text-muted-foreground">Sale Number</Label>
                  <p className="font-mono font-medium">{selectedSale.sale_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">
                    {formatLocalDate(selectedSale.created_at, "short-datetime")}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2 items-center">
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <Badge className={`${paymentMethodColors[selectedSale.payment_method] || ""} mt-1`}>
                    {selectedSale.payment_method.charAt(0).toUpperCase() + selectedSale.payment_method.slice(1)}
                  </Badge>
                </div>
                <div className="flex gap-1 sm:gap-2 items-center">
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
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product?.name || `Product #${item.product_id}`}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.line_total)}
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
                    <span className="font-medium">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{formatCurrency(selectedSale.tax_amount)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatCurrency(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total_amount)}</span>
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
                      Voided on {formatLocalDate(selectedSale.voided_at, "short-datetime")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-1 sm:gap-2">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="flex-1">
              Close
            </Button>
            <Button onClick={printSaleReceipt} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}