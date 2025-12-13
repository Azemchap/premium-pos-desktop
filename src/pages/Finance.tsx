import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { SalesReport, FinancialMetrics, CashFlowSummary, Expense } from "@/types";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Receipt,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";

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
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-none px-4 sm:px-8 py-4 sm:py-6 border-b bg-background/95">
        <PageHeader
          icon={DollarSign}
          title="Finance"
          subtitle="Financial overview and insights"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-8">
          <Tabs defaultValue="overview" className="space-y-6 sm:space-y-8">
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

            <TabsContent value="overview" className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                    <StatCard
                      title="Total Revenue"
                      value={format(salesReport?.total_sales || 0)}
                      icon={TrendingUp}
                      gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                    />
                    <StatCard
                      title="Total Expenses"
                      value={format(totalExpenses)}
                      icon={TrendingDown}
                      gradient="bg-gradient-to-br from-red-500 to-red-600"
                    />
                    <StatCard
                      title="Net Profit"
                      value={format(financialMetrics?.net_profit || 0)}
                      icon={Wallet}
                      gradient="bg-gradient-to-br from-green-500 to-green-600"
                    />
                    <StatCard
                      title="Gross Profit Margin"
                      value={`${(financialMetrics?.gross_profit_margin || 0).toFixed(1)}%`}
                      icon={PiggyBank}
                      gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                    />
                  </>
                )}
              </div>

              {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <Card className="shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-3">
                      <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      Cash Inflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <div>
                        <p className="text-3xl sm:text-4xl font-bold text-green-600">
                          {format(cashFlowSummary?.cash_inflow || 0)}
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2">
                          Total cash received
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-3">
                      <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      Cash Outflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <div>
                        <p className="text-3xl sm:text-4xl font-bold text-red-600">
                          {format(cashFlowSummary?.cash_outflow || 0)}
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2">
                          Total cash paid
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-3">
                      <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                      Net Cash Flow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <div>
                        <p
                          className={`text-3xl sm:text-4xl font-bold ${
                            (cashFlowSummary?.net_cash_flow || 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {format(cashFlowSummary?.net_cash_flow || 0)}
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2">Net position</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

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

            <TabsContent value="revenue" className="space-y-6 sm:space-y-8">
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard
                      title="Total Sales"
                      value={format(salesReport?.total_sales || 0)}
                      icon={DollarSign}
                      gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                    />
                    <StatCard
                      title="Total Transactions"
                      value={salesReport?.total_transactions || 0}
                      icon={Receipt}
                      gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                    />
                    <StatCard
                      title="Average Transaction"
                      value={format(salesReport?.average_transaction || 0)}
                      icon={BarChart3}
                      gradient="bg-gradient-to-br from-green-500 to-green-600"
                    />
                  </div>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">
                        Revenue by Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-4 border-b">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm sm:text-base font-medium">Cash</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold">
                            {format(salesReport?.cash_sales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm sm:text-base font-medium">Card</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold">
                            {format(salesReport?.card_sales || 0)}
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
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Profitability Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">
                            Total Profit
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold text-green-600">
                            {format(salesReport?.total_profit || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">
                            Profit Margin
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold text-blue-600">
                            {(salesReport?.profit_margin || 0).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">
                            Average Basket Size
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold">
                            {format(financialMetrics?.average_basket_size || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">ROI</p>
                          <p className="text-3xl sm:text-4xl font-bold text-purple-600">
                            {(financialMetrics?.return_on_investment || 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6 sm:space-y-8">
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Recent Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenses.length > 0 ? (
                        <div className="space-y-4">
                          {expenses.slice(0, 10).map((expense) => (
                            <div
                              key={expense.id}
                              className="flex justify-between items-start py-3 border-b last:border-0 gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm sm:text-base font-medium line-clamp-1">
                                  {expense.description}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2">
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {expense.expense_date}
                                  </span>
                                  {expense.vendor && (
                                    <>
                                      <span className="text-xs sm:text-sm text-muted-foreground">
                                        
                                      </span>
                                      <span className="text-xs sm:text-sm text-muted-foreground">
                                        {expense.vendor}
                                      </span>
                                    </>
                                  )}
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
                                </div>
                              </div>
                              <span className="text-sm sm:text-base font-bold text-red-600 flex-shrink-0">
                                {format(expense.amount)}
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
                </>
              )}
            </TabsContent>

            <TabsContent value="cashflow" className="space-y-6 sm:space-y-8">
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard
                      title="Cash Inflow"
                      value={format(cashFlowSummary?.cash_inflow || 0)}
                      icon={ArrowUpRight}
                      gradient="bg-gradient-to-br from-green-500 to-green-600"
                    />
                    <StatCard
                      title="Cash Outflow"
                      value={format(cashFlowSummary?.cash_outflow || 0)}
                      icon={ArrowDownRight}
                      gradient="bg-gradient-to-br from-red-500 to-red-600"
                    />
                    <StatCard
                      title="Net Cash Flow"
                      value={format(cashFlowSummary?.net_cash_flow || 0)}
                      icon={Wallet}
                      gradient={`bg-gradient-to-br ${
                        (cashFlowSummary?.net_cash_flow || 0) >= 0
                          ? "from-green-500 to-green-600"
                          : "from-red-500 to-red-600"
                      }`}
                    />
                  </div>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Cash Flow Statement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-4 border-b">
                          <span className="text-sm sm:text-base font-medium">Opening Balance</span>
                          <span className="text-sm sm:text-base font-bold">
                            {format(cashFlowSummary?.opening_balance || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b">
                          <span className="text-sm sm:text-base font-medium text-green-600">
                            + Cash Inflow
                          </span>
                          <span className="text-sm sm:text-base font-bold text-green-600">
                            {format(cashFlowSummary?.cash_inflow || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b">
                          <span className="text-sm sm:text-base font-medium text-red-600">
                            - Cash Outflow
                          </span>
                          <span className="text-sm sm:text-base font-bold text-red-600">
                            {format(cashFlowSummary?.cash_outflow || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b">
                          <span className="text-sm sm:text-base font-medium">
                            Cash from Operations
                          </span>
                          <span className="text-sm sm:text-base font-bold">
                            {format(cashFlowSummary?.cash_from_operations || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-4">
                          <span className="text-base sm:text-lg font-semibold">
                            Closing Balance
                          </span>
                          <span className="text-xl sm:text-2xl font-bold text-green-600">
                            {format(cashFlowSummary?.closing_balance || 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">
                        Additional Financial Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">
                            Inventory Turnover Ratio
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold">
                            {(financialMetrics?.inventory_turnover_ratio || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3">
                            Revenue Growth Rate
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold text-green-600">
                            {(financialMetrics?.revenue_growth_rate || 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
