// src/pages/Finance.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/useCurrency";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FinanceData {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  revenue_growth: number;
  expense_growth: number;
  profit_margin: number;
  accounts_receivable: number;
  accounts_payable: number;
}

export default function Finance() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceData>({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    revenue_growth: 0,
    expense_growth: 0,
    profit_margin: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
  });

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const result = await invoke<FinanceData>("get_finance_overview");
      setData(result);
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
              <span className="text-muted-foreground">{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
                  value={format(data.total_revenue)}
                  icon={TrendingUp}
                  trend={data.revenue_growth}
                  trendValue="vs last month"
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                  title="Total Expenses"
                  value={format(data.total_expenses)}
                  icon={TrendingDown}
                  trend={-data.expense_growth}
                  trendValue="vs last month"
                  color="bg-gradient-to-br from-red-500 to-red-600"
                />
                <StatCard
                  title="Net Profit"
                  value={format(data.net_profit)}
                  icon={Wallet}
                  trend={data.revenue_growth - data.expense_growth}
                  trendValue="vs last month"
                  color="bg-gradient-to-br from-green-500 to-green-600"
                />
                <StatCard
                  title="Profit Margin"
                  value={`${data.profit_margin.toFixed(1)}%`}
                  icon={PiggyBank}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
              </>
            )}
          </div>

          {/* Accounts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Accounts Receivable
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-green-600">{format(data.accounts_receivable)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Amount owed by customers</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Accounts Payable
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-red-600">{format(data.accounts_payable)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Amount owed to suppliers</p>
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
                    <span className="text-sm font-medium">Revenue</span>
                    <span className="text-sm font-bold text-green-600">{format(data.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Expenses</span>
                    <span className="text-sm font-bold text-red-600">-{format(data.total_expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-sm font-medium">Gross Profit</span>
                    <span className="text-sm font-bold">{format(data.total_revenue - data.total_expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-base font-semibold">Net Profit</span>
                    <span className="text-xl font-bold text-green-600">{format(data.net_profit)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Detailed revenue analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <TrendingDown className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Detailed expense analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Cash flow analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
