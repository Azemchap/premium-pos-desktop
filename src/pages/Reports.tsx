// src/pages/Reports.tsx - World-Class Financial Analytics & Accounting Insights
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  Calendar,
  RefreshCw,
  CreditCard,
  Wallet,
  PieChart,
  Activity,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";

interface SalesReport {
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
  total_profit: number;
  total_tax: number;
  total_discount: number;
  cash_sales: number;
  card_sales: number;
  mobile_sales: number;
  check_sales: number;
}

interface FinancialMetrics {
  gross_profit: number;
  gross_profit_margin: number;
  net_profit: number;
  net_profit_margin: number;
  revenue_growth_rate: number;
  average_basket_size: number;
  inventory_turnover_ratio: number;
  return_on_investment: number;
  total_cogs: number;
  operating_expenses: number;
}

interface CashFlowSummary {
  cash_inflow: number;
  cash_outflow: number;
  net_cash_flow: number;
  cash_from_operations: number;
  opening_balance: number;
  closing_balance: number;
}

interface ProductPerformance {
  product_id: number;
  product_name: string;
  sku: string;
  category?: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  transaction_count: number;
}

interface DailySales {
  date: string;
  total_sales: number;
  transaction_count: number;
  average_transaction: number;
}

interface CategoryPerformance {
  category: string;
  total_revenue: number;
  total_profit: number;
  total_items_sold: number;
  product_count: number;
}

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getDateRangeDates = (): { start: string; end: string } => {
    const today = new Date();
    const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

    switch (dateRange) {
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
        return { start: formatDate(startOfMonth(today)), end: formatDate(today) };
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRangeDates();

      const [sales, metrics, cash, products, daily, categories] = await Promise.all([
        invoke<SalesReport>("get_sales_report", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
        invoke<FinancialMetrics>("get_financial_metrics", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
        invoke<CashFlowSummary>("get_cash_flow_summary", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
        invoke<ProductPerformance[]>("get_product_performance", {
          startDate: start || undefined,
          endDate: end || undefined,
          limit: 10,
        }),
        invoke<DailySales[]>("get_daily_sales", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
        invoke<CategoryPerformance[]>("get_category_performance", {
          startDate: start || undefined,
          endDate: end || undefined,
        }),
      ]);

      setSalesReport(sales);
      setFinancialMetrics(metrics);
      setCashFlow(cash);
      setProductPerformance(products);
      setDailySales(daily);
      setCategoryPerformance(categories);
      toast.success("✅ Reports loaded successfully!");
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error(`❌ Failed to load reports: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange, startDate, endDate]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                <span className="font-medium">{Math.abs(trend).toFixed(1)}%</span>
                {trendValue && <span className="ml-1 text-muted-foreground">({trendValue})</span>}
              </div>
            )}
          </div>
          <Icon className="w-8 h-8 text-primary opacity-50" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive business insights and accounting metrics
          </p>
        </div>
        <Button onClick={loadReports} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Total Sales"
                value={salesReport ? format(salesReport.total_sales) : '0'}
                subtitle={`${salesReport?.total_transactions || 0} transactions`}
                icon={DollarSign}
              />
              <MetricCard
                title="Gross Profit"
                value={format(financialMetrics?.gross_profit || 0)}
                subtitle={`${financialMetrics?.gross_profit_margin.toFixed(1) || 0}% margin`}
                icon={TrendingUp}
              />
              <MetricCard
                title="Net Profit"
                value={format(financialMetrics?.net_profit || 0)}
                subtitle={`${financialMetrics?.net_profit_margin.toFixed(1) || 0}% margin`}
                icon={Target}
              />
              <MetricCard
                title="Avg Transaction"
                value={format(salesReport?.average_transaction || 0)}
                subtitle={`${financialMetrics?.average_basket_size.toFixed(1) || 0} items/sale`}
                icon={ShoppingCart}
              />
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Method Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">Cash</p>
                    <p className="text-2xl font-bold text-green-600">
                      {format(salesReport?.cash_sales || 0)}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {salesReport && salesReport.total_sales > 0
                        ? ((salesReport.cash_sales / salesReport.total_sales) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Card</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {format(salesReport?.card_sales || 0)}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {salesReport && salesReport.total_sales > 0
                        ? ((salesReport.card_sales / salesReport.total_sales) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-800 font-medium">Mobile</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {format(salesReport?.mobile_sales || 0)}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {salesReport && salesReport.total_sales > 0
                        ? ((salesReport.mobile_sales / salesReport.total_sales) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium">Check</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {format(salesReport?.check_sales || 0)}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      {salesReport && salesReport.total_sales > 0
                        ? ((salesReport.check_sales / salesReport.total_sales) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Daily Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead className="text-right">Avg/Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySales.slice(0, 10).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {formatDate(new Date(day.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{format(day.total_sales)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{day.transaction_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {format(day.average_transaction)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {/* Financial Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Gross Profit Margin"
                value={`${financialMetrics?.gross_profit_margin.toFixed(1) || 0}%`}
                subtitle="Industry avg: 30-40%"
                icon={Percent}
              />
              <MetricCard
                title="Net Profit Margin"
                value={`${financialMetrics?.net_profit_margin.toFixed(1) || 0}%`}
                subtitle="Industry avg: 10-15%"
                icon={Target}
              />
              <MetricCard
                title="Return on Investment"
                value={`${financialMetrics?.return_on_investment.toFixed(1) || 0}%`}
                subtitle="ROI percentage"
                icon={TrendingUp}
              />
            </div>

            {/* Profit & Loss Statement */}
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Revenue</span>
                    <span className="text-lg font-bold text-green-600">
                      {format(salesReport?.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-muted-foreground">Cost of Goods Sold</span>
                    <span className="text-red-600">
                      -{format(financialMetrics?.total_cogs || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Gross Profit</span>
                    <span className="text-lg font-bold">
                      {format(financialMetrics?.gross_profit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-muted-foreground">Operating Expenses</span>
                    <span className="text-red-600">
                      -{format(financialMetrics?.operating_expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-red-600">
                      -{format(salesReport?.total_tax || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2">
                    <span className="text-lg font-bold">Net Profit</span>
                    <span className={`text-2xl font-bold ${(financialMetrics?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {format(financialMetrics?.net_profit || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators (KPIs)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Inventory Turnover Ratio</span>
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-3xl font-bold">{financialMetrics?.inventory_turnover_ratio.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Times inventory sold & replaced
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Basket Size</span>
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-3xl font-bold">{financialMetrics?.average_basket_size.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Items per transaction
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cashflow" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Cash Inflow"
                value={format(cashFlow?.cash_inflow || 0)}
                subtitle="From sales"
                icon={TrendingUp}
              />
              <MetricCard
                title="Cash Outflow"
                value={format(cashFlow?.cash_outflow || 0)}
                subtitle="COGS + expenses"
                icon={TrendingDown}
              />
              <MetricCard
                title="Net Cash Flow"
                value={format(cashFlow?.net_cash_flow || 0)}
                subtitle={`${(cashFlow?.net_cash_flow || 0) >= 0 ? 'Positive' : 'Negative'} flow`}
                icon={(cashFlow?.net_cash_flow || 0) >= 0 ? ArrowUpRight : ArrowDownRight}
              />
            </div>

            {/* Cash Flow Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Cash Flow Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Opening Balance</span>
                    <span className="text-lg font-bold">
                      {format(cashFlow?.opening_balance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-4 text-green-600">
                    <span>Cash Inflow</span>
                    <span className="font-medium">
                      +{format(cashFlow?.cash_inflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-4 text-red-600">
                    <span>Cash Outflow</span>
                    <span className="font-medium">
                      -{format(cashFlow?.cash_outflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Net Cash from Operations</span>
                    <span className={`font-bold ${(cashFlow?.cash_from_operations || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {format(cashFlow?.cash_from_operations || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2">
                    <span className="text-lg font-bold">Closing Balance</span>
                    <span className="text-2xl font-bold text-primary">
                      {format(cashFlow?.closing_balance || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Top Performing Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.product_name}</div>
                            <div className="text-sm text-muted-foreground">{product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category && <Badge variant="secondary">{product.category}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{product.total_quantity_sold}</TableCell>
                        <TableCell className="text-right">{format(product.total_revenue)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {format(product.total_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.total_revenue > 0 
                            ? ((product.total_profit / product.total_revenue) * 100).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Category Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Items Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPerformance.map((category) => (
                      <TableRow key={category.category}>
                        <TableCell className="font-medium">{category.category}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{category.product_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{category.total_items_sold}</TableCell>
                        <TableCell className="text-right">{format(category.total_revenue)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {format(category.total_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {category.total_revenue > 0
                            ? ((category.total_profit / category.total_revenue) * 100).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
d>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
