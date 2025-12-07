import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./ui/card";

/**
 * Reusable StatsCard component - Stripe-inspired professional design
 * Features:
 * - Minimal color usage
 * - Consistent typography (max 2xl desktop, xl mobile)
 * - Reduced spacing for professional look
 * - Flexible grid layout support
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
                "transition-all duration-150 hover:shadow-md border border-border/40 bg-card",
                onClick && "cursor-pointer hover:border-border",
                isCompact ? "p-3 md:p-4" : "p-4 md:p-6"
            )}
            onClick={onClick}
        >
            {/* Header: Title and Icon */}
            <div className="flex items-start justify-between mb-2 md:mb-3">
                <h3 className={cn(
                    "font-medium text-muted-foreground",
                    isCompact ? "text-xs md:text-sm" : "text-sm md:text-base"
                )}>
                    {title}
                </h3>
                {Icon && (
                    <Icon className={cn(
                        "text-muted-foreground/60",
                        isCompact ? "h-4 w-4" : "h-4 w-4 md:h-5 md:w-5"
                    )} />
                )}
            </div>

            {/* Value */}
            <div className={cn(
                "font-semibold text-foreground mb-1",
                isCompact
                    ? "text-lg md:text-xl"
                    : "text-xl md:text-2xl"
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