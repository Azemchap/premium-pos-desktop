// src/pages/Dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    ShoppingCart,
    Package,
    Users,
    TrendingUp,
    AlertCircle
} from "lucide-react";

export default function Dashboard() {
    const stats = [
        {
            title: "Today's Sales",
            value: "$2,345.67",
            change: "+12%",
            icon: DollarSign,
            color: "text-green-600",
        },
        {
            title: "Transactions",
            value: "127",
            change: "+8%",
            icon: ShoppingCart,
            color: "text-blue-600",
        },
        {
            title: "Products",
            value: "1,234",
            change: "+3%",
            icon: Package,
            color: "text-purple-600",
        },
        {
            title: "Low Stock Items",
            value: "23",
            change: "-5%",
            icon: AlertCircle,
            color: "text-orange-600",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Button>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Report
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className={`text-sm ${stat.color}`}>
                                        {stat.change} from yesterday
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div>
                                        <p className="font-medium">Sale #00{i}</p>
                                        <p className="text-sm text-muted-foreground">2 minutes ago</p>
                                    </div>
                                    <p className="font-semibold">${(Math.random() * 100).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Low Stock Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {['Product A', 'Product B', 'Product C'].map((product) => (
                                <div key={product} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div>
                                        <p className="font-medium">{product}</p>
                                        <p className="text-sm text-muted-foreground">Stock: {Math.floor(Math.random() * 5) + 1}</p>
                                    </div>
                                    <Button variant="outline" size="sm">Restock</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}