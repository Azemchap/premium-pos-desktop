import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/authStore";
import {
  AlertCircle,
  BarChart3,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface StoreConfig {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  today_sales: number;
  today_transactions: number;
  total_products: number;
  low_stock_items: number;
  average_transaction_value: number;
  week_sales: number;
  month_sales: number;
}

interface RecentActivity {
  sales: Array<{
    id: number;
    sale_number: string;
    total_amount: number;
    customer_name?: string;
    created_at: string;
  }>;
  low_stock_items: Array<{
    id: number;
    current_stock: number;
    minimum_stock: number;
    product?: {
      name: string;
      sku: string;
    };
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { format: formatCurrency } = useCurrency();
  const { preferences } = useSettings();
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Use Promise.allSettled to allow partial success
      const results = await Promise.allSettled([
        invoke<DashboardStats>("get_stats"),
        invoke<RecentActivity>("get_recent_activity", { limit: 5 }),
        invoke<StoreConfig>("get_store_config"),
      ]);

      // Handle stats result
      if (results[0].status === "fulfilled") {
        setStats(results[0].value);
      } else {
        console.error("Failed to load stats:", results[0].reason);
      }

      // Handle recent activity result
      if (results[1].status === "fulfilled") {
        setRecentActivity(results[1].value);
      } else {
        console.error("Failed to load recent activity:", results[1].reason);
      }

      // Handle store config result
      if (results[2].status === "fulfilled") {
        setStoreConfig(results[2].value);
      } else {
        console.error("Failed to load store config:", results[2].reason);
      }

      // Only show error toast if all requests failed
      const allFailed = results.every(result => result.status === "rejected");
      if (allFailed) {
        toast.error("Failed to load dashboard data");
      } else if (results.some(result => result.status === "rejected")) {
        toast.warning("Some dashboard data failed to load");
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
      toast.success("Dashboard refreshed");
    } catch (error) {
      toast.error("Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    if (preferences.autoSave) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [preferences.autoSave, loadDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getStockHealth = () => {
    if (!stats || stats.total_products === 0) return 0;
    return ((stats.total_products - stats.low_stock_items) / stats.total_products) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Store}
          title="Dashboard"
          subtitle={`${getGreeting()}, ${user?.first_name || ""}`}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          }
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Stats Overview */}
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Today's Sales"
                value={formatCurrency(stats?.today_sales || 0)}
                icon={DollarSign}
                gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              />
              <StatCard
                title="Week Sales"
                value={formatCurrency(stats?.week_sales || 0)}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatCard
                title="Total Products"
                value={stats?.total_products || 0}
                icon={Package}
                gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
              />
              <StatCard
                title="Low Stock Alerts"
                value={stats?.low_stock_items || 0}
                icon={AlertCircle}
                gradient="bg-gradient-to-br from-orange-500 to-red-600"
              />
            </div>
          )}

          {/* Additional Metrics */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions Today</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {stats?.today_transactions || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Transaction</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {formatCurrency(stats?.average_transaction_value || 0)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Health</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {getStockHealth().toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                  onClick={() => navigate("/sales")}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-xs sm:text-sm font-medium">New Sale</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                  onClick={() => navigate("/products")}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs sm:text-sm font-medium">Products</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                  onClick={() => navigate("/inventory")}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs sm:text-sm font-medium">Inventory</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                  onClick={() => navigate("/reports")}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs sm:text-sm font-medium">Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Sales Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-xs sm:text-sm text-muted-foreground">Month Sales</span>
                      <span className="text-sm sm:text-base font-semibold">
                        {formatCurrency(stats?.month_sales || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Avg Transaction
                      </span>
                      <span className="text-sm sm:text-base font-semibold">
                        {formatCurrency(stats?.average_transaction_value || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Daily Average
                      </span>
                      <span className="text-sm sm:text-base font-semibold">
                        {formatCurrency((stats?.month_sales || 0) / 30)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Total Products
                      </span>
                      <span className="text-sm sm:text-base font-semibold">
                        {stats?.total_products || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-xs sm:text-sm text-muted-foreground">Low Stock</span>
                      <Badge
                        variant={(stats?.low_stock_items || 0) > 0 ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {stats?.low_stock_items || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Health Score
                      </span>
                      <span className="text-sm sm:text-base font-semibold">
                        {getStockHealth().toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/sales-records")}
                  >
                    <span className="text-xs sm:text-sm">View All</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity?.sales && recentActivity.sales.length > 0 ? (
                      recentActivity.sales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">
                              {sale.sale_number}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                              <Users className="w-3 h-3 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {sale.customer_name || "Walk-in"}
                              </span>
                              <span>•</span>
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>{formatDate(sale.created_at)}</span>
                            </p>
                          </div>
                          <p className="font-semibold text-xs sm:text-sm ml-2 flex-shrink-0">
                            {formatCurrency(sale.total_amount)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent sales</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Low Stock Items</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")}>
                    <span className="text-xs sm:text-sm">View All</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity?.low_stock_items &&
                    recentActivity.low_stock_items.length > 0 ? (
                      recentActivity.low_stock_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">
                              {item.product?.name || "Unknown Product"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              SKU: {item.product?.sku} • Stock: {item.current_stock}/
                              {item.minimum_stock}
                            </p>
                          </div>
                          <Badge
                            variant={
                              item.current_stock === 0 ? "destructive" : "secondary"
                            }
                            className="ml-2 text-[10px]"
                          >
                            {item.current_stock === 0 ? "Out" : "Low"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">All products healthy</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
