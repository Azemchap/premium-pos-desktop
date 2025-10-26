// src/pages/Reports.tsx - World-Class Financial Analytics & Accounting Insights
// import { hapticFeedback } from "@/lib/mobile-utils";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
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
  // BarChart3,
  // Calendar,
  RefreshCw,
  CreditCard,
  Wallet,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
// import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { format as formatDate, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  // const { user } = useAuthStore();
  const { format: formatCurrency } = useCurrency();
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
    const formatDateString = (d: Date) => formatDate(d, "yyyy-MM-dd");

    switch (dateRange) {
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
        return { start: formatDateString(startOfMonth(today)), end: formatDateString(today) };
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

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, gradient }: any) => (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-md transition-all duration-200">
      <div className={`${gradient || 'bg-gradient-to-br from-blue-500 to-blue-600'} p-3 sm:p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-white">
            <p className="text-[10px] sm:text-xs opacity-90 font-medium">{title}</p>
            <p className="text-base sm:text-xl md:text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs opacity-80 mt-0.5">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center mt-1 text-[10px] sm:text-xs ${trend >= 0 ? 'bg-white/20' : 'bg-black/20'} px-1.5 py-0.5 rounded w-fit`}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                <span className="font-medium">{Math.abs(trend).toFixed(1)}%</span>
                {trendValue && <span className="ml-0.5 opacity-80">({trendValue})</span>}
              </div>
            )}
          </div>
          <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Activity}
        title="Financial Reports & Analytics"
        subtitle="Comprehensive business insights and accounting metrics"
        actions={
          <Button onClick={loadReports} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Date Range Selector - Compact */}
      <Card className="shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Date Range</Label>
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
                  <Label className="text-xs sm:text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">End Date</Label>
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

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 sm:h-24" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="overview" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Overview</TabsTrigger>
            <TabsTrigger value="financial" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Financial</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Cash</TabsTrigger>
            <TabsTrigger value="products" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Products</TabsTrigger>
            <TabsTrigger value="categories" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3 py-1.5 sm:py-2">Categories</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 sm:space-y-4">
            {/* Key Revenue Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                title="Total Sales"
                value={salesReport ? formatCurrency(salesReport.total_sales) : '0'}
                subtitle={`${salesReport?.total_transactions || 0} transactions`}
                icon={DollarSign}
                gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              />
              <MetricCard
                title="Gross Profit"
                value={formatCurrency(financialMetrics?.gross_profit || 0)}
                subtitle={`${financialMetrics?.gross_profit_margin.toFixed(1) || 0}% margin`}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <MetricCard
                title="Net Profit"
                value={formatCurrency(financialMetrics?.net_profit || 0)}
                subtitle={`${financialMetrics?.net_profit_margin.toFixed(1) || 0}% margin`}
                icon={Target}
                gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
              />
              <MetricCard
                title="Avg Transaction"
                value={formatCurrency(salesReport?.average_transaction || 0)}
                subtitle={`${financialMetrics?.average_basket_size.toFixed(1) || 0} items/sale`}
                icon={ShoppingCart}
                gradient="bg-gradient-to-br from-orange-500 to-pink-600"
              />
            </div>

            {/* Payment Methods with Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="shadow-md">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="flex items-center text-sm sm:text-base">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Method Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cash', value: salesReport?.cash_sales || 0, color: '#10b981' },
                          { name: 'Card', value: salesReport?.card_sales || 0, color: '#3b82f6' },
                          { name: 'Mobile', value: salesReport?.mobile_sales || 0, color: '#8b5cf6' },
                          { name: 'Check', value: salesReport?.check_sales || 0, color: '#f97316' },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Cash', value: salesReport?.cash_sales || 0, color: '#10b981' },
                          { name: 'Card', value: salesReport?.card_sales || 0, color: '#3b82f6' },
                          { name: 'Mobile', value: salesReport?.mobile_sales || 0, color: '#8b5cf6' },
                          { name: 'Check', value: salesReport?.check_sales || 0, color: '#f97316' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-sm sm:text-base">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100">Cash</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-bold text-green-600">
                          {formatCurrency(salesReport?.cash_sales || 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-400">
                          {salesReport && salesReport.total_sales > 0
                            ? ((salesReport.cash_sales / salesReport.total_sales) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">Card</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-bold text-blue-600">
                          {formatCurrency(salesReport?.card_sales || 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400">
                          {salesReport && salesReport.total_sales > 0
                            ? ((salesReport.card_sales / salesReport.total_sales) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100">Mobile</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-bold text-purple-600">
                          {formatCurrency(salesReport?.mobile_sales || 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-400">
                          {salesReport && salesReport.total_sales > 0
                            ? ((salesReport.mobile_sales / salesReport.total_sales) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-100">Check</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-bold text-orange-600">
                          {formatCurrency(salesReport?.check_sales || 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-400">
                          {salesReport && salesReport.total_sales > 0
                            ? ((salesReport.check_sales / salesReport.total_sales) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Sales Trend with Chart */}
            <Card className="shadow-md">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <Activity className="w-4 h-4 mr-2" />
                  Daily Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={dailySales.slice(0, 14).reverse().map(day => ({
                      ...day,
                      dateFormatted: formatDate(new Date(day.date), "MMM dd")
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateFormatted" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total_sales" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorSales)"
                      name="Sales"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Daily Sales</p>
                      <p className="text-sm sm:text-base font-bold">
                        {formatCurrency(dailySales.reduce((sum, day) => sum + day.total_sales, 0) / (dailySales.length || 1))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total Transactions</p>
                      <p className="text-sm sm:text-base font-bold">
                        {dailySales.reduce((sum, day) => sum + day.transaction_count, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Best Day</p>
                      <p className="text-sm sm:text-base font-bold">
                        {formatCurrency(Math.max(...dailySales.map(d => d.total_sales)))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-3 sm:space-y-4">
            {/* Financial Health Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard
                title="Gross Profit Margin"
                value={`${financialMetrics?.gross_profit_margin.toFixed(1) || 0}%`}
                subtitle="Industry avg: 30-40%"
                icon={Percent}
                gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              />
              <MetricCard
                title="Net Profit Margin"
                value={`${financialMetrics?.net_profit_margin.toFixed(1) || 0}%`}
                subtitle="Industry avg: 10-15%"
                icon={Target}
                gradient="bg-gradient-to-br from-violet-500 to-purple-600"
              />
              <MetricCard
                title="Return on Investment"
                value={`${financialMetrics?.return_on_investment.toFixed(1) || 0}%`}
                subtitle="ROI percentage"
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              />
            </div>

            {/* Profit & Loss Statement */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-xs sm:text-sm font-medium">Revenue</span>
                    <span className="text-sm sm:text-base font-bold text-green-600">
                      {formatCurrency(salesReport?.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <span className="text-xs sm:text-sm text-muted-foreground">Cost of Goods Sold</span>
                    <span className="text-xs sm:text-sm text-red-600">
                      -{formatCurrency(financialMetrics?.total_cogs || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-xs sm:text-sm font-medium">Gross Profit</span>
                    <span className="text-sm sm:text-base font-bold">
                      {formatCurrency(financialMetrics?.gross_profit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <span className="text-xs sm:text-sm text-muted-foreground">Operating Expenses</span>
                    <span className="text-xs sm:text-sm text-red-600">
                      -{formatCurrency(financialMetrics?.operating_expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <span className="text-xs sm:text-sm text-muted-foreground">Tax</span>
                    <span className="text-xs sm:text-sm text-red-600">
                      -{formatCurrency(salesReport?.total_tax || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2">
                    <span className="text-sm sm:text-base font-bold">Net Profit</span>
                    <span className={`text-base sm:text-lg font-bold ${(financialMetrics?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialMetrics?.net_profit || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Key Performance Indicators (KPIs)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-medium">Inventory Turnover Ratio</span>
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{financialMetrics?.inventory_turnover_ratio.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Times inventory sold & replaced
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-medium">Average Basket Size</span>
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{financialMetrics?.average_basket_size.toFixed(1) || '0.0'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Items per transaction
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cashflow" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard
                title="Cash Inflow"
                value={formatCurrency(cashFlow?.cash_inflow || 0)}
                subtitle="From sales"
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              />
              <MetricCard
                title="Cash Outflow"
                value={formatCurrency(cashFlow?.cash_outflow || 0)}
                subtitle="COGS + expenses"
                icon={TrendingDown}
                gradient="bg-gradient-to-br from-red-500 to-rose-600"
              />
              <MetricCard
                title="Net Cash Flow"
                value={formatCurrency(cashFlow?.net_cash_flow || 0)}
                subtitle={`${(cashFlow?.net_cash_flow || 0) >= 0 ? 'Positive' : 'Negative'} flow`}
                icon={(cashFlow?.net_cash_flow || 0) >= 0 ? ArrowUpRight : ArrowDownRight}
                gradient={(cashFlow?.net_cash_flow || 0) >= 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-orange-500 to-red-600"}
              />
            </div>

            {/* Cash Flow Statement */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <Wallet className="w-4 h-4 mr-2" />
                  Cash Flow Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Opening Balance</span>
                    <span className="text-sm sm:text-base font-bold">
                      {formatCurrency(cashFlow?.opening_balance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-2 sm:pl-4 text-green-600">
                    <span className="text-xs sm:text-sm">Cash Inflow</span>
                    <span className="text-xs sm:text-sm font-medium">
                      +{formatCurrency(cashFlow?.cash_inflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pl-2 sm:pl-4 text-red-600">
                    <span className="text-xs sm:text-sm">Cash Outflow</span>
                    <span className="text-xs sm:text-sm font-medium">
                      -{formatCurrency(cashFlow?.cash_outflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-xs sm:text-sm font-medium">Net Cash from Operations</span>
                    <span className={`text-xs sm:text-sm font-bold ${(cashFlow?.cash_from_operations || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlow?.cash_from_operations || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2">
                    <span className="text-sm sm:text-base font-bold">Closing Balance</span>
                    <span className="text-base sm:text-lg font-bold text-primary">
                      {formatCurrency(cashFlow?.closing_balance || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-3 sm:space-y-4">
            {/* Product Performance Chart */}
            <Card className="shadow-md">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <Package className="w-4 h-4 mr-2" />
                  Top Products by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={productPerformance.slice(0, 8).map(p => ({
                      name: p.product_name.length > 20 ? p.product_name.substring(0, 20) + '...' : p.product_name,
                      revenue: p.total_revenue,
                      profit: p.total_profit
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <Package className="w-4 h-4 mr-2" />
                  Top Performing Products - Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-8 px-2 sm:px-4 text-xs">Product</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-xs hidden sm:table-cell">Category</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs">Qty</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs">Revenue</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs hidden md:table-cell">Profit</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs hidden lg:table-cell">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productPerformance.map((product) => (
                        <TableRow key={product.product_id} className="hover:bg-muted/50 transition-colors border-b h-10">
                          <TableCell className="py-2 px-2 sm:px-4 break-words">
                            <div>
                              <div className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]" title={product.product_name}>{product.product_name}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground" title={product.sku}>{product.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 hidden sm:table-cell">
                            {product.category && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5" title={product.category}>{product.category}</Badge>}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">{product.total_quantity_sold}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">{formatCurrency(product.total_revenue)}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-green-600 font-medium text-xs sm:text-sm hidden md:table-cell">
                            {formatCurrency(product.total_profit)}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm hidden lg:table-cell">
                            {product.total_revenue > 0 
                              ? ((product.total_profit / product.total_revenue) * 100).toFixed(1)
                              : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-3 sm:space-y-4">
            {/* Category Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="shadow-md">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="flex items-center text-sm sm:text-base">
                    <PieChartIcon className="w-4 h-4 mr-2" />
                    Revenue by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryPerformance.map((cat, idx) => ({
                          name: cat.category,
                          value: cat.total_revenue,
                          color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryPerformance.map((_, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="flex items-center text-sm sm:text-base">
                    <PieChartIcon className="w-4 h-4 mr-2" />
                    Profit by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={categoryPerformance}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total_profit" fill="#10b981" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <PieChartIcon className="w-4 h-4 mr-2" />
                  Category Performance - Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-8 px-2 sm:px-4 text-xs">Category</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs">Products</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs hidden sm:table-cell">Items Sold</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs">Revenue</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs hidden md:table-cell">Profit</TableHead>
                        <TableHead className="h-8 px-2 sm:px-4 text-right text-xs hidden lg:table-cell">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryPerformance.map((category) => (
                        <TableRow key={category.category} className="hover:bg-muted/50 transition-colors border-b h-10">
                          <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium break-words" title={category.category}>{category.category}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right">
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5">{category.product_count}</Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm hidden sm:table-cell">{category.total_items_sold}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">{formatCurrency(category.total_revenue)}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-green-600 font-medium text-xs sm:text-sm hidden md:table-cell">
                            {formatCurrency(category.total_profit)}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm hidden lg:table-cell">
                            {category.total_revenue > 0
                              ? ((category.total_profit / category.total_revenue) * 100).toFixed(1)
                              : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
