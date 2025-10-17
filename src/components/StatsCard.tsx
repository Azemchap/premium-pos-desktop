import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

// src/components/StatsCard.tsx - Reusable stat card component
interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;
    onClick?: () => void;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    onClick,
}: StatsCardProps) {
    return (
        <Card
            className={cn("transition-all", onClick && "cursor-pointer hover:shadow-md")}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {trend.isPositive ? (
                            <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                        ) : (
                            <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                        )}
                        <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
                            {Math.abs(trend.value).toFixed(1)}%
                        </span>
                        <span className="ml-1">from last week</span>
                    </div>
                )}
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}