// src/pages/SalesRecords.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
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
  TrendingUp,
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

      const saleWithDetails = sales.find((s) => s.id === saleId);
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
  }, [dateRange, paymentMethod, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, dateRange, paymentMethod, startDate, endDate, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="inline w-4 h-4 ml-1" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="inline w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="inline w-4 h-4 ml-1" />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 ">
      <PageHeader
        icon={Calendar}
        title="Sales Records"
        subtitle="View and analyze sales transactions"
        badge={stats ? { text: `${stats.total_transactions} transactions`, variant: "secondary" } : undefined}
      />

      {/* Date Range Selector */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date Range</Label>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
                <SelectTrigger className="h-9 text-sm">
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
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Total Sales</p>
                  <p className="text-sm sm:text-xl md:text-2xl font-bold text-green-900 dark:text-green-100 truncate">
                    {formatCurrency(stats.total_sales)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-green-600 dark:text-green-400 mt-1">
                    {stats.total_transactions} transactions
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-2 border-emerald-200 dark:border-emerald-800 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Profit</p>
                  <p className="text-sm sm:text-xl md:text-2xl font-bold text-emerald-900 dark:text-emerald-100 truncate">
                    {formatCurrency(stats.total_profit)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.profit_margin.toFixed(1)}% margin
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Avg Transaction</p>
                  <p className="text-sm sm:text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 truncate">
                    {formatCurrency(stats.average_transaction)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">per sale</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-2 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Payment Methods
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-purple-600 dark:text-purple-400">Cash</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100 truncate ml-2">
                      {formatCurrency(stats.cash_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-purple-600 dark:text-purple-400">Card</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100 truncate ml-2">
                      {formatCurrency(stats.card_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-purple-600 dark:text-purple-400">Mobile</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100 truncate ml-2">
                      {formatCurrency(stats.mobile_sales)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Table */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2 p-3">
          <CardTitle className=" text-lg font-bold flex items-center gap-1">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full p-1 text-white" />
            Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="space-y-2 md:space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                        <TableRow>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            onClick={() => handleSort("created_at")}
                          >
                            Date <SortIcon column="created_at" />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            onClick={() => handleSort("sale_number")}
                          >
                            Sale # <SortIcon column="sale_number" />
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                            Customer
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                            Cashier
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                            Items
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                            Payment
                          </TableHead>
                          <TableHead
                            className="text-right cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            onClick={() => handleSort("total_amount")}
                          >
                            Total <SortIcon column="total_amount" />
                          </TableHead>
                          <TableHead
                            className="text-right cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell"
                            onClick={() => handleSort("profit")}
                          >
                            Profit <SortIcon column="profit" />
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/30">
                        {paginatedSales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            className={`hover:bg-primary/5 transition-all duration-200 ${sale.is_voided ? "opacity-50" : ""
                              }`}
                          >
                            <TableCell className="px-4 py-3">
                              <div>
                                <div className="font-semibold text-sm whitespace-nowrap">
                                  {formatLocalDate(sale.created_at, "short-date")}
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatLocalDate(sale.created_at, "short-time")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="font-mono text-xs truncate max-w-[120px]" title={sale.sale_number}>
                                {sale.sale_number}
                              </div>
                              {sale.is_voided && (
                                <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                                  Voided
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden lg:table-cell">
                              {sale.customer_name ? (
                                <div>
                                  <div className="font-medium text-sm truncate max-w-[150px]" title={sale.customer_name}>
                                    {sale.customer_name}
                                  </div>
                                  {sale.customer_phone && (
                                    <div className="text-xs text-muted-foreground truncate" title={sale.customer_phone}>
                                      {sale.customer_phone}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Walk-in</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden lg:table-cell">
                              <span
                                className="text-xs sm:text-sm truncate max-w-[120px] inline-block"
                                title={sale.cashier_name || `Cashier #${sale.cashier_id}`}
                              >
                                {sale.cashier_name || `Cashier #${sale.cashier_id}`}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden md:table-cell">
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {sale.items_count} items
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden md:table-cell">
                              <Badge className={`${paymentMethodColors[sale.payment_method] || ""} text-xs px-2 py-0.5`}>
                                {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="font-bold text-sm sm:text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                {formatCurrency(sale.total_amount)}
                              </div>
                              {sale.discount_amount > 0 && (
                                <div className="text-xs text-red-600">-{formatCurrency(sale.discount_amount)}</div>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right hidden lg:table-cell">
                              <div className={`font-semibold text-sm ${sale.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(sale.profit)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sale.total_amount > 0 ? ((sale.profit / sale.total_amount) * 100).toFixed(1) : 0}% margin
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="View sale details"
                                className="h-8 w-8 p-0"
                                onClick={() => loadSaleDetails(sale.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
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
                        let pageNum;
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

          {!loading && filteredAndSortedSales.length === 0 && (
            <div className="text-center py-6 md:py-12">
              <Calendar className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No sales found</h3>
              <p className="text-muted-foreground text-sm">
                {debouncedSearchQuery ? "Try adjusting your search criteria" : "No sales in this date range"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog - Mobile Responsive */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Sale Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete information about this sale
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4 mt-4">
              {/* Sale Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Sale Number</Label>
                  <p className="font-mono font-medium text-sm mt-1 break-all">{selectedSale.sale_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Date & Time</Label>
                  <p className="font-medium text-sm mt-1">{formatLocalDate(selectedSale.created_at, "short-datetime")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Payment Method</Label>
                  <Badge className={`${paymentMethodColors[selectedSale.payment_method] || ""} mt-1 text-xs`}>
                    {selectedSale.payment_method.charAt(0).toUpperCase() + selectedSale.payment_method.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                  <Badge variant={selectedSale.is_voided ? "destructive" : "default"} className="mt-1 text-xs">
                    {selectedSale.is_voided ? "Voided" : "Completed"}
                  </Badge>
                </div>
              </div>

              {/* Customer Info */}
              {selectedSale.customer_name && (
                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground font-medium">Customer Information</Label>
                  <div className="mt-1.5 space-y-1">
                    <p className="font-medium text-sm break-words">{selectedSale.customer_name}</p>
                    {selectedSale.customer_phone && <p className="text-xs break-all">{selectedSale.customer_phone}</p>}
                    {selectedSale.customer_email && <p className="text-xs break-all">{selectedSale.customer_email}</p>}
                  </div>
                </div>
              )}

              {/* Sale Items */}
              <div className="border-t pt-3">
                <Label className="text-xs text-muted-foreground font-medium">Items</Label>
                <div className="mt-2 overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-xs px-3 py-2">Product</TableHead>
                            <TableHead className="text-xs px-3 py-2 text-center">Qty</TableHead>
                            <TableHead className="text-xs px-3 py-2 text-right">Price</TableHead>
                            <TableHead className="text-xs px-3 py-2 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="py-2.5 px-3 text-sm max-w-[150px] sm:max-w-none">
                                <span className="block truncate" title={item.product?.name || `Product #${item.product_id}`}>
                                  {item.product?.name || `Product #${item.product_id}`}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-sm text-center">{item.quantity}</TableCell>
                              <TableCell className="py-2.5 px-3 text-sm text-right whitespace-nowrap">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 font-medium text-sm text-right whitespace-nowrap">
                                {formatCurrency(item.line_total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{formatCurrency(selectedSale.tax_amount)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600 text-sm">
                      <span>Discount</span>
                      <span className="font-medium">-{formatCurrency(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground font-medium">Notes</Label>
                  <p className="mt-1 text-sm break-words">{selectedSale.notes}</p>
                </div>
              )}

              {/* Void Info */}
              {selectedSale.is_voided && selectedSale.void_reason && (
                <div className="border-t pt-3">
                  <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 sm:p-4 rounded-lg">
                    <Label className="text-xs font-semibold text-red-800 dark:text-red-200">Void Reason</Label>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 break-words">{selectedSale.void_reason}</p>
                    {selectedSale.voided_at && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Voided on {formatLocalDate(selectedSale.voided_at, "short-datetime")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full sm:flex-1">
              Close
            </Button>
            <Button onClick={printSaleReceipt} className="w-full sm:flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}