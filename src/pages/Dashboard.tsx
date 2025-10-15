// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    AlertCircle,
    RefreshCw,
    Calendar,
    BarChart3
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

interface DashboardStats {
    today_sales: number; // This is likely f64 in Rust, maps to number in TS
    today_transactions: number; // This is likely i32 in Rust, maps to number in TS
    total_products: number; // This is likely i32 in Rust, maps to number in TS
    low_stock_items: number; // This is likely i32 in Rust, maps to number in TS
    average_transaction_value: number; // This is likely f64 in Rust, maps to number in TS
    week_sales: number; // This is likely f64 in Rust, maps to number in TS
    month_sales: number; // This is likely f64 in Rust, maps to number in TS
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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();
    const { format: formatCurrency } = useCurrency();

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load stats and recent activity in parallel
            const [statsData, activityData] = await Promise.all([
                invoke<DashboardStats>("get_stats"),
                invoke<RecentActivity>("get_recent_activity", { limit: 5 })
            ]);

            setStats(statsData);
            setRecentActivity(activityData);
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
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStockStatus = (current: number, minimum: number) => {
        if (current === 0) return { status: 'Out of Stock', color: 'destructive' as const };
        if (current <= minimum) return { status: 'Low Stock', color: 'destructive' as const };
        if (current <= minimum * 1.5) return { status: 'Warning', color: 'secondary' as const };
        return { status: 'In Stock', color: 'default' as const };
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="flex items-center justify-between py-2">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {user?.first_name}! Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshData}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Today's Sales
                                </p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(stats?.today_sales || 0)}
                                </p>
                                <p className="text-sm text-green-600">
                                    {stats?.today_transactions || 0} transactions
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Week Sales
                                </p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(stats?.week_sales || 0)}
                                </p>
                                <p className="text-sm text-blue-600">
                                    <Calendar className="w-3 h-3 inline mr-1" />
                                    Last 7 days
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Products
                                </p>
                                <p className="text-2xl font-bold">
                                    {stats?.total_products || 0}
                                </p>
                                <p className="text-sm text-purple-600">
                                    Active products
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                                <Package className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Low Stock Items
                                </p>
                                <p className="text-2xl font-bold">
                                    {stats?.low_stock_items || 0}
                                </p>
                                <p className="text-sm text-orange-600">
                                    Need attention
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <DollarSign className="w-5 h-5 mr-2" />
                            Sales Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Transaction</span>
                            <span className="font-semibold">
                                {formatCurrency(stats?.average_transaction_value || 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Month Sales</span>
                            <span className="font-semibold">
                                {formatCurrency(stats?.month_sales || 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Today's Transactions</span>
                            <span className="font-semibold">
                                {stats?.today_transactions || 0}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Package className="w-5 h-5 mr-2" />
                            Inventory Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Products</span>
                            <span className="font-semibold">{stats?.total_products || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Low Stock Items</span>
                            <Badge variant="destructive">{stats?.low_stock_items || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Stock Health</span>
                            <span className="font-semibold text-green-600">
                                {stats && stats.total_products > 0
                                    ? Math.round(((stats.total_products - stats.low_stock_items) / stats.total_products) * 100)
                                    : 0}% Healthy
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity?.sales && recentActivity.sales.length > 0 ? (
                                recentActivity.sales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                        <div>
                                            <p className="font-medium">{sale.sale_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {sale.customer_name || 'Walk-in Customer'} • {formatDate(sale.created_at)}
                                            </p>
                                        </div>
                                        <p className="font-semibold">{formatCurrency(sale.total_amount)}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No recent sales</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Low Stock Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity?.low_stock_items && recentActivity.low_stock_items.length > 0 ? (
                                recentActivity.low_stock_items.map((item) => {
                                    const stockStatus = getStockStatus(item.current_stock, item.minimum_stock);
                                    return (
                                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                            <div>
                                                <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    SKU: {item.product?.sku} • Stock: {item.current_stock}/{item.minimum_stock}
                                                </p>
                                            </div>
                                            <Badge variant={stockStatus.color}>{stockStatus.status}</Badge>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>All products well stocked</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}