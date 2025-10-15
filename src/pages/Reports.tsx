// src/pages/Reports.tsx
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
  FileText,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

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

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getDateRange = () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (dateRange) {
      case "today":
        return { start: formatDate(today), end: formatDate(today) };
      case "week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return { start: formatDate(weekAgo), end: formatDate(today) };
      }
      case "month": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return { start: formatDate(monthAgo), end: formatDate(today) };
      }
      case "year": {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return { start: formatDate(yearAgo), end: formatDate(today) };
      }
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const range = getDateRange();

      const [salesData, productsData, dailyData, categoriesData] = await Promise.all([
        invoke<SalesReport>("get_sales_report", {
          startDate: range.start,
          endDate: range.end,
        }),
        invoke<ProductPerformance[]>("get_product_performance", {
          startDate: range.start,
          endDate: range.end,
          limit: 10,
        }),
        invoke<DailySales[]>("get_daily_sales", {
          startDate: range.start,
          endDate: range.end,
        }),
        invoke<CategoryPerformance[]>("get_category_performance", {
          startDate: range.start,
          endDate: range.end,
        }),
      ]);

      setSalesReport(salesData);
      setProductPerformance(productsData);
      setDailySales(dailyData);
      setCategoryPerformance(categoriesData);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const profitMargin = salesReport
    ? salesReport.total_sales > 0
      ? (salesReport.total_profit / salesReport.total_sales) * 100
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
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

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Sales
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesReport?.total_sales || 0)}
                  </p>
                  <p className="text-sm text-green-600">
                    {salesReport?.total_transactions || 0} transactions
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Profit
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesReport?.total_profit || 0)}
                  </p>
                  <p className="text-sm text-blue-600">
                    {profitMargin.toFixed(1)}% margin
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Transaction
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesReport?.average_transaction || 0)}
                  </p>
                  <p className="text-sm text-purple-600">Per sale</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <ShoppingCart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Tax
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesReport?.total_tax || 0)}
                  </p>
                  <p className="text-sm text-orange-600">Collected</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FileText className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="daily">
            <Calendar className="w-4 h-4 mr-2" />
            Daily Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">Cash</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(salesReport?.cash_sales || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {salesReport?.total_sales
                          ? (
                              ((salesReport.cash_sales || 0) /
                                salesReport.total_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm">Card</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(salesReport?.card_sales || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {salesReport?.total_sales
                          ? (
                              ((salesReport.card_sales || 0) /
                                salesReport.total_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm">Mobile Payment</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(salesReport?.mobile_sales || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {salesReport?.total_sales
                          ? (
                              ((salesReport.mobile_sales || 0) /
                                salesReport.total_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm">Check</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(salesReport?.check_sales || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {salesReport?.total_sales
                          ? (
                              ((salesReport.check_sales || 0) /
                                salesReport.total_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Gross Sales
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(salesReport?.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Discounts
                    </span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(salesReport?.total_discount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tax</span>
                    <span className="font-semibold">
                      {formatCurrency(salesReport?.total_tax || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Net Sales</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(
                          (salesReport?.total_sales || 0) -
                            (salesReport?.total_discount || 0)
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-600">
                      Total Profit
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(salesReport?.total_profit || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.map((product) => {
                      const margin =
                        product.total_revenue > 0
                          ? (product.total_profit / product.total_revenue) * 100
                          : 0;
                      return (
                        <TableRow key={product.product_id}>
                          <TableCell>
                            <div className="font-medium">
                              {product.product_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.transaction_count} transactions
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {product.sku}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.category || "Uncategorized"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.total_quantity_sold}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.total_revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">
                              {formatCurrency(product.total_profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={margin > 30 ? "default" : "secondary"}
                            >
                              {margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {!loading && productPerformance.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No sales data</h3>
                  <p className="text-muted-foreground">
                    No products sold in the selected period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
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
                    {categoryPerformance.map((category) => {
                      const margin =
                        category.total_revenue > 0
                          ? (category.total_profit / category.total_revenue) *
                            100
                          : 0;
                      return (
                        <TableRow key={category.category}>
                          <TableCell>
                            <div className="font-medium">
                              {category.category}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {category.product_count}
                          </TableCell>
                          <TableCell className="text-right">
                            {category.total_items_sold}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(category.total_revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">
                              {formatCurrency(category.total_profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={margin > 30 ? "default" : "secondary"}
                            >
                              {margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {!loading && categoryPerformance.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    No category data
                  </h3>
                  <p className="text-muted-foreground">
                    No sales recorded in the selected period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">
                        Transactions
                      </TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">
                        Avg Transaction
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySales.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>
                          <div className="font-medium">
                            {formatDate(day.date)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {day.transaction_count}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">
                            {formatCurrency(day.total_sales)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(day.average_transaction)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!loading && dailySales.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No sales data</h3>
                  <p className="text-muted-foreground">
                    No sales recorded in the selected period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
