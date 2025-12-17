import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import SortableTableHead from "@/components/SortableTableHead";
import { formatCurrency } from "@/lib/currency";
import { formatLocalDate, parseUTCDate } from "@/lib/date-utils";
import { printReceipt } from "@/lib/receipt-printer";
import { format as formatDate, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Eye,
  Printer,
  TrendingUp,
} from "lucide-react";
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
type SortColumn = "created_at" | "sale_number" | "total_amount" | "profit";
type SortDirection = "asc" | "desc";

const paymentMethodColors: Record<string, string> = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  card: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  mobile: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  check: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function SalesRecords() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 20;

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Track the latest sale details request to prevent race conditions
  const latestSaleRequestRef = useRef(0);

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

  const loadSales = useCallback(async () => {
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
  }, [dateRange, paymentMethod, startDate, endDate]);

  const loadSaleDetails = async (saleId: number) => {
    // Increment request counter and capture current value
    const requestId = ++latestSaleRequestRef.current;

    try {
      const [sale, items] = await invoke<[Sale, SaleItem[]]>("get_sale_details", { saleId });

      // Only update state if this is still the latest request
      if (requestId !== latestSaleRequestRef.current) {
        return; // Discard stale response
      }

      setSelectedSale(sale);
      setSaleItems(items);

      const saleWithDetails = sales.find((s) => s.id === saleId);
      setSelectedSaleDetails(saleWithDetails || null);

      setIsDetailsOpen(true);
      toast.success("Sale details loaded");
    } catch (error) {
      // Only show error if this is still the latest request
      if (requestId === latestSaleRequestRef.current) {
        console.error("Failed to load sale details:", error);
        toast.error("Failed to load sale details");
      }
    }
  };

  const printSaleReceipt = async () => {
    if (!selectedSale || saleItems.length === 0) {
      toast.error("No sale data available");
      return;
    }

    try {
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
        amount_received: undefined,
        change: undefined,
      };

      await printReceipt(saleData);
    } catch (error) {
      console.error("Failed to print receipt:", error);
      toast.error("Failed to print receipt");
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
      let aValue: string | number, bValue: string | number;
      switch (sortColumn) {
        case "created_at":
          aValue = parseUTCDate(a.created_at).getTime();
          bValue = parseUTCDate(b.created_at).getTime();
          break;
        case "sale_number":
          aValue = a.sale_number;
          bValue = b.sale_number;
          break;
        case "total_amount":
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case "profit":
          aValue = a.profit;
          bValue = b.profit;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, dateRange, paymentMethod, startDate, endDate, sortColumn, sortDirection]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Calendar}
          title="Sales Records"
          subtitle="View and analyze sales transactions"
          badge={stats ? { text: `${stats.total_transactions} transactions`, variant: "secondary" } : undefined}
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Date Range Selector */}
          <Card className="shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">Date Range</Label>
                  <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
                    <SelectTrigger className="h-9">
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
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-medium">Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-medium">End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total Sales"
                value={formatCurrency(stats.total_sales)}
                icon={DollarSign}
                gradient="bg-gradient-to-br from-green-500 to-green-600"
              />
              <StatCard
                title="Total Profit"
                value={formatCurrency(stats.total_profit)}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Avg Transaction"
                value={formatCurrency(stats.average_transaction)}
                icon={CreditCard}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <Card className="shadow-md">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 sm:p-4">
                  <div className="text-white">
                    <p className="text-[10px] sm:text-xs opacity-90 font-medium mb-2">Payment Methods</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Cash</span>
                        <span className="font-semibold">{formatCurrency(stats.cash_sales)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Card</span>
                        <span className="font-semibold">{formatCurrency(stats.card_sales)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Mobile</span>
                        <span className="font-semibold">{formatCurrency(stats.mobile_sales)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {/* Sales Table */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Sales Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredAndSortedSales.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-base font-medium mb-2">No sales found</h3>
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearchQuery ? "Try adjusting your search criteria" : "No sales in this date range"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <SortableTableHead
                            label="Date"
                            column="created_at"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            label="Sale #"
                            column="sale_number"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                          />
                          <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                            Customer
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                            Cashier
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                            Items
                          </TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                            Payment
                          </TableHead>
                          <SortableTableHead
                            label="Total"
                            column="total_amount"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                            align="right"
                          />
                          <SortableTableHead
                            label="Profit"
                            column="profit"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                            align="right"
                            className="hidden lg:table-cell"
                          />
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            className={`hover:bg-muted/50 ${sale.is_voided ? "opacity-50" : ""}`}
                          >
                            <TableCell className="px-2 sm:px-4 py-2">
                              <div>
                                <div className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                                  {formatLocalDate(sale.created_at, "short-date")}
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                  {formatLocalDate(sale.created_at, "short-time")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2">
                              <div className="font-mono text-[10px] sm:text-xs line-clamp-1">
                                {sale.sale_number}
                              </div>
                              {sale.is_voided && (
                                <Badge variant="destructive" className="mt-1 text-[10px]">
                                  Voided
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 hidden lg:table-cell">
                              {sale.customer_name ? (
                                <div className="text-xs line-clamp-1">{sale.customer_name}</div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Walk-in</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 hidden lg:table-cell">
                              <span className="text-xs line-clamp-1">
                                {sale.cashier_name || `Cashier #${sale.cashier_id}`}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 hidden md:table-cell">
                              <Badge variant="outline" className="text-[10px]">
                                {sale.items_count} items
                              </Badge>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 hidden md:table-cell">
                              <Badge className={`${paymentMethodColors[sale.payment_method] || ""} text-[10px]`}>
                                {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-right">
                              <div className="font-bold text-xs sm:text-sm">
                                {formatCurrency(sale.total_amount)}
                              </div>
                              {sale.discount_amount > 0 && (
                                <div className="text-[10px] text-red-600">
                                  -{formatCurrency(sale.discount_amount)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-right hidden lg:table-cell">
                              <div className={`font-semibold text-xs ${sale.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(sale.profit)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {sale.total_amount > 0 ? ((sale.profit / sale.total_amount) * 100).toFixed(1) : 0}%
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => loadSaleDetails(sale.id)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center p-4 border-t">
                      <Pagination>
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
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  isActive={currentPage === pageNum}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNum);
                                  }}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
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
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Sale Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete information about this sale
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4 mt-4">
              {/* Sale Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Sale Number</Label>
                  <p className="font-mono font-medium text-sm mt-1">{selectedSale.sale_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Date</Label>
                  <p className="text-sm mt-1">{formatLocalDate(selectedSale.created_at, "long")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Customer</Label>
                  <p className="text-sm mt-1">{selectedSale.customer_name || "Walk-in"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Cashier</Label>
                  <p className="text-sm mt-1">
                    {selectedSaleDetails?.cashier_name || `Cashier #${selectedSale.cashier_id}`}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-2 block">Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{item.product?.name || `Product #${item.product_id}`}</TableCell>
                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{formatCurrency(item.line_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(selectedSale.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(selectedSale.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total_amount)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button size="sm" onClick={printSaleReceipt}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
