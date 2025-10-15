// src/pages/SalesRecords.tsx
import ReceiptTemplate from "@/components/ReceiptTemplate";
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
import { useCurrency } from "@/hooks/useCurrency";
import { currencyFormatter, formatCurrency } from "@/lib/currency";
import { invoke } from "@tauri-apps/api/core";
import { format as formatDate, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  Printer,
  Search,
  TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
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

export default function SalesRecords() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);

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
      toast.success("🖨️ Preparing receipt...");

      // Create iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.error("❌ Failed to create print frame");
        return;
      }

      // Get store info
      const storeInfo = await invoke<any>("get_store_config").catch(() => null);
      
      // Build receipt HTML directly
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Receipt - ${selectedSale.sale_number}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                max-width: 80mm;
                margin: 0;
                padding: 10px;
              }
              .header {
                text-align: center;
                border-bottom: 2px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .header h1 {
                margin: 0;
                font-size: 18px;
              }
              .header p {
                margin: 2px 0;
                font-size: 10px;
              }
              .info {
                margin-bottom: 10px;
                font-size: 11px;
              }
              .items {
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 5px 0;
                margin: 10px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
              }
              .totals {
                margin-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
              }
              .grand-total {
                font-weight: bold;
                font-size: 14px;
                border-top: 2px solid #000;
                padding-top: 5px;
                margin-top: 5px;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                border-top: 2px dashed #000;
                padding-top: 10px;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${storeInfo?.store_name || 'Premium POS'}</h1>
              ${storeInfo ? `
                <p>${storeInfo.address}</p>
                <p>${storeInfo.city}, ${storeInfo.state} ${storeInfo.zip_code}</p>
                <p>Tel: ${storeInfo.phone}</p>
                ${storeInfo.email ? `<p>${storeInfo.email}</p>` : ''}
              ` : ''}
            </div>
            
            <div class="info">
              <p><strong>Receipt #:</strong> ${selectedSale.sale_number}</p>
              <p><strong>Date:</strong> ${formatDate(new Date(selectedSale.created_at), "MMM dd, yyyy hh:mm a")}</p>
              ${selectedSaleDetails?.cashier_name ? `<p><strong>Cashier:</strong> ${selectedSaleDetails.cashier_name}</p>` : ''}
              ${selectedSale.customer_name ? `<p><strong>Customer:</strong> ${selectedSale.customer_name}</p>` : ''}
              ${selectedSale.customer_phone ? `<p><strong>Phone:</strong> ${selectedSale.customer_phone}</p>` : ''}
            </div>
            
            <div class="items">
              ${saleItems.map((item) => `
                <div class="item">
                  <span>${item.product?.name || 'Product #' + item.product_id}</span>
                </div>
                <div class="item">
                  <span>&nbsp;&nbsp;${item.quantity} x ${currencyFormatter.format(item.unit_price)}</span>
                  <span>${currencyFormatter.format(item.line_total)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${currencyFormatter.format(selectedSale.subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Tax:</span>
                <span>${currencyFormatter.format(selectedSale.tax_amount)}</span>
              </div>
              ${selectedSale.discount_amount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${currencyFormatter.format(selectedSale.discount_amount)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>${currencyFormatter.format(selectedSale.total_amount)}</span>
              </div>
            </div>
            
            <div class="info">
              <p><strong>Payment:</strong> ${selectedSale.payment_method.toUpperCase()}</p>
            </div>
            
            <div class="footer">
              <p><strong>Thank you for your purchase!</strong></p>
              <p>Please keep this receipt for your records</p>
              <p style="font-size: 9px;">Powered by Premium POS System</p>
            </div>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      // Wait for content to load, then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        toast.success("✅ Receipt sent to printer!");
        
        // Clean up after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);

    } catch (error) {
      console.error("Failed to print receipt:", error);
      toast.error("❌ Failed to print receipt");
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
                  <p className="text-2xl font-bold">{formatCurrency(stats.total_sales)}</p>
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
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_profit)}</p>
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
                  <p className="text-2xl font-bold">{formatCurrency(stats.average_transaction)}</p>
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
                          {formatDate(new Date(sale.created_at), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(sale.created_at), "hh:mm a")}
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
                    {formatDate(new Date(selectedSale.created_at), "MMM dd, yyyy hh:mm a")}
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
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
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
                      Voided on {formatDate(new Date(selectedSale.voided_at), "MMM dd, yyyy hh:mm a")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
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
