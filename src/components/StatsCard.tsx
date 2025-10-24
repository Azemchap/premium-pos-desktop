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
            className={cn("transition-all hover:shadow-xl hover:scale-105 border-l-4 border-l-primary", onClick && "cursor-pointer")}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
                <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">{title}</CardTitle>
                <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
                <div className="text-2xl md:text-3xl font-bold text-primary">{value}</div>
                {trend && (
                    <div className="flex items-center text-xs md:text-sm text-muted-foreground">
                        {trend.isPositive ? (
                            <TrendingUp className="mr-1.5 h-4 w-4 text-green-600" />
                        ) : (
                            <TrendingDown className="mr-1.5 h-4 w-4 text-red-600" />
                        )}
                        <span className={trend.isPositive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {Math.abs(trend.value).toFixed(1)}%
                        </span>
                        <span className="ml-1.5">from last week</span>
                    </div>
                )}
                {description && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}