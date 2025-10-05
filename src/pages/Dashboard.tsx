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
import { listen } from "@tauri-apps/api/event";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load stats and recent activity in parallel
            const [statsData, activityData] = await Promise.all([
                invoke<DashboardStats>("get_dashboard_stats"),
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

        // Refresh automatically when a sale is created
        let unlisten: (() => void) | undefined;
        (async () => {
            try {
                const off = await listen("sale_created", async () => {
                    await loadDashboardData();
                });
                unlisten = off;
            } catch (e) {
                // Event bus might not be available in some contexts
            }
        })();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const getStockStatus = (current: number, minimum: number) => {
        if (current <= 0) return { status: 'Out of Stock', color: 'destructive' as const };
        if (current <= minimum) return { status: 'Low Stock', color: 'secondary' as const };
        return { status: 'In Stock', color: 'default' as const };
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <Button variant="outline" onClick={refreshData} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats?.today_sales || 0)}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats?.today_transactions || 0} transactions
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Week Sales</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats?.week_sales || 0)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Month Sales</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats?.month_sales || 0)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.low_stock_items || 0}</div>
                            <p className="text-xs text-muted-foreground">items below threshold</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
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
                                                {sale.customer_name || 'Walk-in'} • {new Date(sale.created_at).toLocaleString()}
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