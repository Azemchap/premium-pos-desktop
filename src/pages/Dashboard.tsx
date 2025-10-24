// src/pages/Dashboard.tsx - Enhanced with Store Config & Settings
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import {
    AlertCircle,
    ArrowRight,
    BarChart3,
    Calendar,
    Clock,
    DollarSign,
    Eye,
    MapPin,
    Package,
    Plus,
    RefreshCw,
    ShoppingCart,
    Sparkles,
    Store,
    TrendingDown,
    TrendingUp,
    Users,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface StoreConfig {
    id: number;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_rate: number;
    currency: string;
    timezone: string;
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

            // Load all data in parallel for optimal performance
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
            if (preferences.soundEffects) {
                // Play success sound (simple beep)
                const beep = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZTR4NVK3n77BdGAg+ltryxnMpBSh+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXvzn4uBiZzwvDemUccD1qy6O6qWhYJPJPY8sFuJAUneMrx25BGCRditOvssVwXCT6X2/LGciQFKH3N8tmJNwoYY7nr5J9PEBBNJ+Xx7m0gBTKJ0/LSg");
                beep.volume = 0.2;
                beep.play().catch(() => {});
            }
            toast.success("✨ Dashboard refreshed");
        } catch (error) {
            toast.error("❌ Failed to refresh dashboard");
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        
        // Auto-refresh every 5 minutes if enabled
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

    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
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

    const getStockStatus = (current: number, minimum: number) => {
        if (current === 0) return { status: 'Out of Stock', color: 'destructive' as const };
        if (current <= minimum) return { status: 'Low Stock', color: 'destructive' as const };
        if (current <= minimum * 1.5) return { status: 'Warning', color: 'secondary' as const };
        return { status: 'In Stock', color: 'default' as const };
    };

    if (loading) {
        return (
            <div className="space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 md:space-y-4">
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
        <div className="space-y-6 md:space-y-8">
            {/* Enhanced Header with Store Info & Time */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-4 md:gap-6">
                        <h1 className="text-xl sm:text-lg  md:text-2xl  font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            {getGreeting()}, {user?.first_name}!
                        </h1>
                        <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Store className="w-4 h-4" />
                        <span className="font-medium">{storeConfig?.name || 'Loading...'}</span>
                        {storeConfig?.address && (
                            <>
                                <span>•</span>
                                <MapPin className="w-3 h-3" />
                                <span className="text-xs">{storeConfig.address}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="hidden md:flex flex-col items-end">
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{getCurrentTime()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshData}
                        disabled={refreshing}
                        className="shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Enhanced Stats Grid with Growth Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500 hover:scale-105">
                    <CardContent className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            {getSalesGrowth() !== 0 && (
                                <Badge 
                                    variant={getSalesGrowth() > 0 ? "default" : "destructive"}
                                    className="flex items-center gap-1"
                                >
                                    {getSalesGrowth() > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    {Math.abs(getSalesGrowth()).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Today's Sales
                            </p>
                            <p className="text-xl sm:text-lg  md:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                                {formatCurrency(stats?.today_sales || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3" />
                                {stats?.today_transactions || 0} transactions
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary hover:scale-105">
                    <CardContent className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                7 days
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Week Sales
                            </p>
                            <p className="text-xl sm:text-lg  md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                                {formatCurrency(stats?.week_sales || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Avg: {formatCurrency((stats?.week_sales || 0) / 7)}/day
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 hover:scale-105">
                    <CardContent className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate('/products')}
                                className="h-8"
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Products
                            </p>
                            <p className="text-xl sm:text-lg  md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                                {stats?.total_products || 0}
                            </p>
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Stock Health</span>
                                    <span>{getStockHealth().toFixed(0)}%</span>
                                </div>
                                <Progress value={getStockHealth()} className="h-1.5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`hover:shadow-xl transition-all duration-300 border-l-4 hover:scale-105 ${
                    (stats?.low_stock_items || 0) > 0 ? 'border-l-orange-500' : 'border-l-green-500'
                }`}>
                    <CardContent className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className={`p-3 rounded-xl shadow-lg ${
                                (stats?.low_stock_items || 0) > 0 
                                    ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
                                    : 'bg-gradient-to-br from-green-500 to-green-600'
                            }`}>
                                {(stats?.low_stock_items || 0) > 0 ? (
                                    <AlertCircle className="w-6 h-6 text-white" />
                                ) : (
                                    <Zap className="w-6 h-6 text-white" />
                                )}
                            </div>
                            {(stats?.low_stock_items || 0) > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => navigate('/inventory')}
                                    className="h-8 text-orange-600"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Low Stock Alerts
                            </p>
                            <p className={`text-3xl font-bold ${
                                (stats?.low_stock_items || 0) > 0 
                                    ? 'text-orange-600' 
                                    : 'text-green-600'
                            }`}>
                                {stats?.low_stock_items || 0}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {(stats?.low_stock_items || 0) > 0 
                                    ? 'Need attention' 
                                    : 'All products healthy'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-2 border-dashed hover:border-primary transition-colors shadow-md">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-xl">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <Button
                            variant="outline"
                            className="h-24 md:h-28 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-green-500 hover:bg-green-50 transition-all hover:shadow-md"
                            onClick={() => navigate('/sales')}
                        >
                            <div className="p-2 rounded-lg bg-green-100">
                                <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                            </div>
                            <span className="text-sm md:text-base font-medium">New Sale</span>
                        </Button>
                        
                        <Button
                            variant="outline"
                            className="h-24 md:h-28 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-primary hover:bg-blue-50 transition-all hover:shadow-md"
                            onClick={() => navigate('/products')}
                        >
                            <div className="p-2 rounded-lg bg-blue-100">
                                <Plus className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                            </div>
                            <span className="text-sm md:text-base font-medium">Add Product</span>
                        </Button>
                        
                        <Button
                            variant="outline"
                            className="h-24 md:h-28 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-purple-500 hover:bg-purple-50 transition-all hover:shadow-md"
                            onClick={() => navigate('/inventory')}
                        >
                            <div className="p-2 rounded-lg bg-purple-100">
                                <Package className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
                            </div>
                            <span className="text-sm md:text-base font-medium">Manage Stock</span>
                        </Button>
                        
                        <Button
                            variant="outline"
                            className="h-24 md:h-28 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-orange-500 hover:bg-orange-50 transition-all hover:shadow-md"
                            onClick={() => navigate('/reports')}
                        >
                            <div className="p-2 rounded-lg bg-orange-100">
                                <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
                            </div>
                            <span className="text-sm md:text-base font-medium">View Reports</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Stats - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-1 sm:gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Sales Performance
                        </CardTitle>
                        <Badge variant="outline">This Month</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 md:space-y-4">
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Month Sales</p>
                                <p className="text-lg  md:text-2xl font-bold">
                                    {formatCurrency(stats?.month_sales || 0)}
                                </p>
                                <Progress 
                                    value={((stats?.month_sales || 0) / 100000) * 100} 
                                    className="h-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Transaction</p>
                                <p className="text-lg  md:text-2xl font-bold">
                                    {formatCurrency(stats?.average_transaction_value || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.today_transactions || 0} transactions today
                                </p>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Daily Average</span>
                                <span className="font-semibold text-blue-600">
                                    {formatCurrency((stats?.month_sales || 0) / 30)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1 sm:gap-2">
                            <Package className="w-5 h-5 text-purple-600" />
                            Inventory
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 md:space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Products</span>
                                <span className="font-bold">{stats?.total_products || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Low Stock</span>
                                <Badge variant={
                                    (stats?.low_stock_items || 0) > 0 ? "destructive" : "default"
                                }>
                                    {stats?.low_stock_items || 0}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Health Score</span>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="font-bold text-green-600">
                                        {getStockHealth().toFixed(0)}%
                                    </span>
                                    {getStockHealth() >= 90 ? (
                                        <Sparkles className="w-4 h-4 text-green-600" />
                                    ) : getStockHealth() >= 70 ? (
                                        <TrendingUp className="w-4 h-4 text-yellow-600" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity - Enhanced */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="flex items-center gap-1 sm:gap-2">
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                            Recent Sales
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate('/sales-records')}
                        >
                            <Eye className="w-4 h-4 mr-1" />
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity?.sales && recentActivity.sales.length > 0 ? (
                                recentActivity.sales.map((sale) => (
                                    <div 
                                        key={sale.id} 
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                                    >
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{sale.sale_number}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {sale.customer_name || 'Walk-in'}
                                                    <span>•</span>
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(sale.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-green-600">
                                            {formatCurrency(sale.total_amount)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 md:py-12 text-muted-foreground">
                                    <div className="w-16 h-16 mx-auto mb-2 md:mb-4 rounded-full bg-muted flex items-center justify-center">
                                        <ShoppingCart className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="font-medium">No recent sales</p>
                                    <p className="text-sm">Start selling to see transactions here</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => navigate('/sales')}
                                        className="mt-4"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Sale
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="flex items-center gap-1 sm:gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Low Stock Alerts
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate('/inventory')}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity?.low_stock_items && recentActivity.low_stock_items.length > 0 ? (
                                recentActivity.low_stock_items.map((item) => {
                                    const stockStatus = getStockStatus(item.current_stock, item.minimum_stock);
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`p-2 rounded-lg ${
                                                    stockStatus.color === 'destructive' 
                                                        ? 'bg-red-100 dark:bg-red-900/20' 
                                                        : 'bg-yellow-100 dark:bg-yellow-900/20'
                                                }`}>
                                                    <Package className={`w-4 h-4 ${
                                                        stockStatus.color === 'destructive' 
                                                            ? 'text-red-600' 
                                                            : 'text-yellow-600'
                                                    }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {item.product?.name || 'Unknown Product'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        SKU: {item.product?.sku} • 
                                                        Stock: {item.current_stock}/{item.minimum_stock}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={stockStatus.color} className="shrink-0">
                                                {stockStatus.status}
                                            </Badge>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 md:py-12 text-muted-foreground">
                                    <div className="w-16 h-16 mx-auto mb-2 md:mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                        <Zap className="w-8 h-8 text-green-600" />
                                    </div>
                                    <p className="font-medium text-green-600">All Products Healthy!</p>
                                    <p className="text-sm">Your inventory is well-stocked</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer Info */}
            <Card className="bg-gradient-to-r from-primary/10 to-blue-600/10 border-dashed border-2 shadow-md">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-6">
                            <Store className="w-8 h-8 text-primary" />
                            <div>
                                <p className="font-semibold">{storeConfig?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {storeConfig?.email} • Tax Rate: {((storeConfig?.tax_rate || 0) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span>Powered by Premium POS</span>
                            <Badge variant="outline">v1.0</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}