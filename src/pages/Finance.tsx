// src/pages/Finance.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/useCurrency";
import { SalesReport, FinancialMetrics, CashFlowSummary, Expense } from "@/types";
import { invoke } from "@tauri-apps/api/core";
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

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
    <Card className={`shadow-md border-2 hover:shadow-lg transition-all duration-200`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="font-medium">{Math.abs(trend).toFixed(1)}%</span>
              {trendValue && <span className="text-muted-foreground">{trendValue}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category_id ? `Category ${expense.category_id}` : 'Uncategorized';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={DollarSign}
        title="Finance"
        subtitle="Financial overview and insights"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Total Revenue"
                  value={format(salesReport?.total_sales || 0)}
                  icon={TrendingUp}
                  trend={financialMetrics?.revenue_growth_rate}
                  trendValue="growth rate"
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                  title="Total Expenses"
                  value={format(totalExpenses)}
                  icon={TrendingDown}
                  color="bg-gradient-to-br from-red-500 to-red-600"
                />
                <StatCard
                  title="Net Profit"
                  value={format(financialMetrics?.net_profit || 0)}
                  icon={Wallet}
                  trend={financialMetrics?.net_profit_margin}
                  trendValue="margin"
                  color="bg-gradient-to-br from-green-500 to-green-600"
                />
                <StatCard
                  title="Gross Profit Margin"
                  value={`${(financialMetrics?.gross_profit_margin || 0).toFixed(1)}%`}
                  icon={PiggyBank}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
              </>
            )}
          </div>

          {/* Cash Flow Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                  Cash Inflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-green-600">{format(cashFlowSummary?.cash_inflow || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total cash received</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  Cash Outflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-red-600">{format(cashFlowSummary?.cash_outflow || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total cash paid</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Net Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div>
                    <p className={`text-3xl font-bold ${(cashFlowSummary?.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {format(cashFlowSummary?.net_cash_flow || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Net position</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Gross Revenue</span>
                    <span className="text-sm font-bold text-green-600">{format(salesReport?.total_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Cost of Goods Sold</span>
                    <span className="text-sm font-bold text-red-600">-{format(financialMetrics?.total_cogs || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Gross Profit</span>
                    <span className="text-sm font-bold">{format(financialMetrics?.gross_profit || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Operating Expenses</span>
                    <span className="text-sm font-bold text-red-600">-{format(financialMetrics?.operating_expenses || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-base font-semibold">Net Profit</span>
                    <span className="text-xl font-bold text-green-600">{format(financialMetrics?.net_profit || 0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              {/* Revenue Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Sales"
                  value={format(salesReport?.total_sales || 0)}
                  icon={DollarSign}
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                  title="Total Transactions"
                  value={salesReport?.total_transactions || 0}
                  icon={Receipt}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <StatCard
                  title="Average Transaction"
                  value={format(salesReport?.average_transaction || 0)}
                  icon={BarChart3}
                  color="bg-gradient-to-br from-green-500 to-green-600"
                />
              </div>

              {/* Revenue by Payment Method */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Revenue by Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Cash</span>
                      </div>
                      <span className="font-bold">{format(salesReport?.cash_sales || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Card</span>
                      </div>
                      <span className="font-bold">{format(salesReport?.card_sales || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Mobile Payment</span>
                      </div>
                      <span className="font-bold">{format(salesReport?.mobile_sales || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">Check</span>
                      </div>
                      <span className="font-bold">{format(salesReport?.check_sales || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profitability Metrics */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Profitability Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total Profit</p>
                      <p className="text-3xl font-bold text-green-600">{format(salesReport?.total_profit || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Profit Margin</p>
                      <p className="text-3xl font-bold text-blue-600">{(salesReport?.profit_margin || 0).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Basket Size</p>
                      <p className="text-3xl font-bold">{format(financialMetrics?.average_basket_size || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">ROI</p>
                      <p className="text-3xl font-bold text-purple-600">{(financialMetrics?.return_on_investment || 0).toFixed(2)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              {/* Expense Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Expenses"
                  value={format(totalExpenses)}
                  icon={TrendingDown}
                  color="bg-gradient-to-br from-red-500 to-red-600"
                />
                <StatCard
                  title="Total Items"
                  value={expenses.length}
                  icon={Receipt}
                  color="bg-gradient-to-br from-orange-500 to-orange-600"
                />
                <StatCard
                  title="Operating Expenses"
                  value={format(financialMetrics?.operating_expenses || 0)}
                  icon={DollarSign}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
              </div>

              {/* Expense Breakdown by Category */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Expense Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(expensesByCategory).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(expensesByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, amount]) => (
                          <div key={category} className="flex justify-between items-center py-3 border-b last:border-0">
                            <span className="font-medium">{category}</span>
                            <span className="font-bold">{format(amount)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No expenses recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length > 0 ? (
                    <div className="space-y-3">
                      {expenses.slice(0, 10).map((expense) => (
                        <div key={expense.id} className="flex justify-between items-start py-2 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">{expense.expense_date}</span>
                              {expense.vendor && (
                                <span className="text-sm text-muted-foreground">• {expense.vendor}</span>
                              )}
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                expense.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                expense.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {expense.status}
                              </span>
                            </div>
                          </div>
                          <span className="font-bold text-red-600">{format(expense.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No expenses recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              {/* Cash Flow Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Cash Inflow"
                  value={format(cashFlowSummary?.cash_inflow || 0)}
                  icon={ArrowUpRight}
                  color="bg-gradient-to-br from-green-500 to-green-600"
                />
                <StatCard
                  title="Cash Outflow"
                  value={format(cashFlowSummary?.cash_outflow || 0)}
                  icon={ArrowDownRight}
                  color="bg-gradient-to-br from-red-500 to-red-600"
                />
                <StatCard
                  title="Net Cash Flow"
                  value={format(cashFlowSummary?.net_cash_flow || 0)}
                  icon={Wallet}
                  color={`bg-gradient-to-br ${(cashFlowSummary?.net_cash_flow || 0) >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`}
                />
              </div>

              {/* Cash Flow Statement */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Cash Flow Statement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-medium">Opening Balance</span>
                      <span className="text-sm font-bold">{format(cashFlowSummary?.opening_balance || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-medium text-green-600">+ Cash Inflow</span>
                      <span className="text-sm font-bold text-green-600">{format(cashFlowSummary?.cash_inflow || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-medium text-red-600">- Cash Outflow</span>
                      <span className="text-sm font-bold text-red-600">{format(cashFlowSummary?.cash_outflow || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-medium">Cash from Operations</span>
                      <span className="text-sm font-bold">{format(cashFlowSummary?.cash_from_operations || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-base font-semibold">Closing Balance</span>
                      <span className="text-xl font-bold text-green-600">{format(cashFlowSummary?.closing_balance || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Metrics */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Additional Financial Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Inventory Turnover Ratio</p>
                      <p className="text-3xl font-bold">{(financialMetrics?.inventory_turnover_ratio || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Revenue Growth Rate</p>
                      <p className="text-3xl font-bold text-green-600">{(financialMetrics?.revenue_growth_rate || 0).toFixed(2)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
