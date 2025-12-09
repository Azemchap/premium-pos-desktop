import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./ui/card";

/**
 * Reusable StatsCard component - Financial software grade
 * Features:
 * - Subtle background colors
 * - Max font size: lg (16px)
 * - Compact spacing
 * - Professional typography
 */
interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: React.ComponentType<{ className?: string }>;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    description?: string;
    onClick?: () => void;
    variant?: 'default' | 'compact';
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    onClick,
    variant = 'default',
}: StatsCardProps) {
    const isCompact = variant === 'compact';

    return (
        <Card
            className={cn(
                "transition-all duration-150 hover:shadow-sm border border-border/50 bg-muted/20",
                onClick && "cursor-pointer hover:bg-muted/30 hover:border-border",
                isCompact ? "p-3" : "p-4"
            )}
            onClick={onClick}
        >
            {/* Header: Title and Icon */}
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {title}
                </h3>
                {Icon && (
                    <Icon className="h-4 w-4 text-muted-foreground/50" />
                )}
            </div>

            {/* Value - MAX lg */}
            <div className={cn(
                "font-semibold text-foreground mb-1 text-financial",
                isCompact ? "text-base" : "text-lg"
            )}>
                {value}
            </div>

            {/* Trend and Description */}
            {(trend || description) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {trend && (
                        <div className="flex items-center gap-1 text-xs">
                            {trend.isPositive ? (
                                <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={cn(
                                "font-medium",
                                trend.isPositive ? "text-green-600" : "text-red-600"
                            )}>
                                {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
                            </span>
                            {trend.label && (
                                <span className="text-muted-foreground">{trend.label}</span>
                            )}
                        </div>
                    )}
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            )}
        </Card>
    );
}