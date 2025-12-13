import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/useCurrency";
import { CashFlowSummary, Expense, FinancialMetrics, SalesReport } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Finance() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      // Load all financial data in parallel
      const [salesData, metricsData, cashFlowData, expensesData] = await Promise.all([
        invoke<SalesReport>("get_sales_report", { start_date: null, end_date: null }),
        invoke<FinancialMetrics>("get_financial_metrics", { start_date: null, end_date: null }),
        invoke<CashFlowSummary>("get_cash_flow_summary", { start_date: null, end_date: null }),
        invoke<Expense[]>("get_expenses", { status: null }),
      ]);

      setSalesReport(salesData);
      setFinancialMetrics(metricsData);
      setCashFlowSummary(cashFlowData);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Failed to load finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category_id ? `Category ${expense.category_id}` : "Uncategorized";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={DollarSign}
        title="Finance"
        subtitle="Financial overview and insights"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={loadFinanceData} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={format(salesReport?.total_sales || 0)}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Total Expenses"
          value={format(totalExpenses)}
          icon={TrendingDown}
          gradient="bg-gradient-to-br from-red-500 to-pink-600"
        />
        <StatCard
          title="Net Profit"
          value={format((salesReport?.total_sales || 0) - totalExpenses)}
          icon={Wallet}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Transactions"
          value={salesReport?.total_transactions || 0}
          icon={Receipt}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-sm sm:text-base">
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-sm sm:text-base">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-sm sm:text-base">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-sm sm:text-base">
            Cash Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Growth</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-2">
                          {(financialMetrics?.revenue_growth_rate || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <ArrowUpRight className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Net Profit Margin</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-2">
                          {(financialMetrics?.net_profit_margin || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-2">
                          {(financialMetrics?.return_on_investment || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gross Profit</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-2">
                          {format(financialMetrics?.gross_profit || 0)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Financial Summary */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Gross Revenue</span>
                    <span className="text-sm sm:text-base font-bold text-green-600">
                      {format(salesReport?.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Cost of Goods Sold</span>
                    <span className="text-sm sm:text-base font-bold text-red-600">
                      -{format(financialMetrics?.total_cogs || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Gross Profit</span>
                    <span className="text-sm sm:text-base font-bold">
                      {format(financialMetrics?.gross_profit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Operating Expenses</span>
                    <span className="text-sm sm:text-base font-bold text-red-600">
                      -{format(financialMetrics?.operating_expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                    <span className="text-base sm:text-lg font-semibold">Net Profit</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-600">
                      {format(financialMetrics?.net_profit || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 sm:space-y-6">
          {/* Expense Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatCard
              title="Total Expenses"
              value={format(totalExpenses)}
              icon={TrendingDown}
              gradient="bg-gradient-to-br from-red-500 to-red-600"
            />
            <StatCard
              title="Total Items"
              value={expenses.length}
              icon={Receipt}
              gradient="bg-gradient-to-br from-orange-500 to-orange-600"
            />
            <StatCard
              title="Operating Expenses"
              value={format(financialMetrics?.operating_expenses || 0)}
              icon={DollarSign}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
          </div>

          {/* Expense Breakdown */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Expense Breakdown by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <div
                        key={category}
                        className="flex justify-between items-center py-4 border-b last:border-0"
                      >
                        <span className="text-sm sm:text-base font-medium">{category}</span>
                        <span className="text-sm sm:text-base font-bold">
                          {format(amount)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 text-base text-muted-foreground">
                  No expenses recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Expenses Table */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Recent Expenses</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {expenses.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-xs">Description</TableHead>
                        <TableHead className="h-9 text-xs">Date</TableHead>
                        <TableHead className="h-9 text-xs">Vendor</TableHead>
                        <TableHead className="h-9 text-xs text-right">Amount</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.slice(0, 10).map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/50">
                          <TableCell className="py-3">
                            <p className="font-medium text-sm truncate max-w-[200px]">
                              {expense.description || "Untitled Expense"}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm">
                              {expense.vendor || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <p className="font-bold text-sm text-red-600">
                              -{format(expense.amount)}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant={
                                expense.status === "Paid"
                                  ? "default"
                                  : expense.status === "Pending"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {expense.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-base text-muted-foreground">
                  No expenses recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4 sm:space-y-6">
          {/* Revenue Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatCard
              title="Total Revenue"
              value={format(salesReport?.total_sales || 0)}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-500 to-green-600"
            />
            <StatCard
              title="Total Profit"
              value={format(salesReport?.total_profit || 0)}
              icon={Wallet}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Profit Margin"
              value={`${(salesReport?.profit_margin || 0).toFixed(2)}%`}
              icon={BarChart3}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatCard
              title="Transactions"
              value={salesReport?.total_transactions || 0}
              icon={Receipt}
              gradient="bg-gradient-to-br from-orange-500 to-orange-600"
            />
          </div>

          {/* Payment Methods */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Revenue by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium">Card Payment</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold">
                      {format(salesReport?.card_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium">Cash Payment</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold">
                      {format(salesReport?.cash_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium">Mobile Payment</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold">
                      {format(salesReport?.mobile_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-orange-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium">Check</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold">
                      {format(salesReport?.check_sales || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4 sm:space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Opening Balance</span>
                    <span className="text-sm sm:text-base font-bold">
                      {format(cashFlowSummary?.opening_balance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Cash Inflow</span>
                    <span className="text-sm sm:text-base font-bold text-green-600">
                      +{format(cashFlowSummary?.cash_inflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b">
                    <span className="text-sm sm:text-base font-medium">Cash Outflow</span>
                    <span className="text-sm sm:text-base font-bold text-red-600">
                      -{format(cashFlowSummary?.cash_outflow || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                    <span className="text-base sm:text-lg font-semibold">Closing Balance</span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">
                      {format(cashFlowSummary?.closing_balance || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
