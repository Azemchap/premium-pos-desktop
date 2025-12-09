// src/pages/Dashboard.tsx - Stripe-inspired professional design
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
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
    Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, activityData, configData] = await Promise.all([
                invoke<DashboardStats>("get_stats"),
                invoke<RecentActivity>("get_recent_activity", { limit: 5 }),
                invoke<StoreConfig>("get_store_config")
            ]);
            setStats(statsData);
            setRecentActivity(activityData);
            setStoreConfig(configData);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

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
    }, [preferences.autoSave]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const getSalesGrowth = () => {
        if (!stats || stats.week_sales === 0) return 0;
        const dailyAvg = stats.week_sales / 7;
        if (dailyAvg === 0) return 0;
        return ((stats.today_sales - dailyAvg) / dailyAvg) * 100;
    };

    const getStockHealth = () => {
        if (!stats || stats.total_products === 0) return 0;
        return ((stats.total_products - stats.low_stock_items) / stats.total_products) * 100;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <StatsGrid columns={4}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4 md:p-6">
                                <Skeleton className="h-4 w-24 mb-3" />
                                <Skeleton className="h-8 w-32 mb-1" />
                                <Skeleton className="h-3 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </StatsGrid>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Store}
                title="Dashboard"
                subtitle={`${getGreeting()}, ${user?.first_name || ''}`}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshData}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                }
            />

            {/* Stats Overview - Gradient cards for consistency */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-xs opacity-90 font-medium">Today's Sales</p>
                                <p className="text-lg font-bold mt-2">{formatCurrency(stats?.today_sales || 0)}</p>
                                <p className="text-xs opacity-75 mt-1">{stats?.today_transactions || 0} transactions</p>
                            </div>
                            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        {getSalesGrowth() !== 0 && (
                            <div className="mt-3 pt-3 border-t border-white/20">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className={`w-3 h-3 ${getSalesGrowth() > 0 ? 'text-white' : 'text-white/70'}`} />
                                    <span className="text-xs text-white/90">
                                        {getSalesGrowth() > 0 ? '+' : ''}{getSalesGrowth().toFixed(1)}% vs daily avg
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-xs opacity-90 font-medium">Week Sales</p>
                                <p className="text-lg font-bold mt-2">{formatCurrency(stats?.week_sales || 0)}</p>
                                <p className="text-xs opacity-75 mt-1">{formatCurrency((stats?.week_sales || 0) / 7)}/day average</p>
                            </div>
                            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-xs opacity-90 font-medium">Total Products</p>
                                <p className="text-lg font-bold mt-2">{stats?.total_products || 0}</p>
                                <p className="text-xs opacity-75 mt-1">{getStockHealth().toFixed(0)}% stock health</p>
                            </div>
                            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-xs opacity-90 font-medium">Low Stock Alerts</p>
                                <p className="text-lg font-bold mt-2">{stats?.low_stock_items || 0}</p>
                                <p className="text-xs opacity-75 mt-1">
                                    {(stats?.low_stock_items || 0) > 0 ? 'Need attention' : 'All healthy'}
                                </p>
                            </div>
                            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                            onClick={() => navigate('/sales')}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            <span className="text-sm font-medium">New Sale</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                            onClick={() => navigate('/products')}
                        >
                            <Package className="w-5 h-5" />
                            <span className="text-sm font-medium">Products</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                            onClick={() => navigate('/inventory')}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-sm font-medium">Inventory</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                            onClick={() => navigate('/reports')}
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-sm font-medium">Reports</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Summary */}
            <StatsGrid columns={2}>
                <Card className="shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Sales Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Month Sales</span>
                                <span className="font-semibold">{formatCurrency(stats?.month_sales || 0)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Avg Transaction</span>
                                <span className="font-semibold">{formatCurrency(stats?.average_transaction_value || 0)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Daily Average</span>
                                <span className="font-semibold">{formatCurrency((stats?.month_sales || 0) / 30)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Inventory Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Products</span>
                            <span className="font-semibold">{stats?.total_products || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Low Stock</span>
                            <Badge variant={(stats?.low_stock_items || 0) > 0 ? "destructive" : "outline"}>
                                {stats?.low_stock_items || 0}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Health Score</span>
                            <span className="font-semibold">{getStockHealth().toFixed(0)}%</span>
                        </div>
                    </CardContent>
                </Card>
            </StatsGrid>

            {/* Recent Activity */}
            <StatsGrid columns={2}>
                <Card className="shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/sales-records')}
                            >
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity?.sales && recentActivity.sales.length > 0 ? (
                                recentActivity.sales.map((sale) => (
                                    <div
                                        key={sale.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{sale.sale_number}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {sale.customer_name || 'Walk-in'}
                                                <span>•</span>
                                                <Clock className="w-3 h-3" />
                                                {formatDate(sale.created_at)}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-sm">
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
                    </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">Low Stock Items</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/inventory')}
                            >
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity?.low_stock_items && recentActivity.low_stock_items.length > 0 ? (
                                recentActivity.low_stock_items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {item.product?.name || 'Unknown Product'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                SKU: {item.product?.sku} • Stock: {item.current_stock}/{item.minimum_stock}
                                            </p>
                                        </div>
                                        <Badge variant={item.current_stock === 0 ? "destructive" : "secondary"} className="ml-2">
                                            {item.current_stock === 0 ? 'Out' : 'Low'}
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
                    </CardContent>
                </Card>
            </StatsGrid>

            {/* Store Info Footer */}
            <Card className="shadow-md">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            <span>{storeConfig?.name || 'Business Suite'}</span>
                        </div>
                        <span>Tax Rate: {((storeConfig?.tax_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
