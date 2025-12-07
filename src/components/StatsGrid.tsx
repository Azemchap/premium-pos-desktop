import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/**
 * Reusable StatsGrid component for flexible grid layouts
 * Features:
 * - Responsive grid layouts (1-4 columns)
 * - Configurable gap sizes
 * - Automatic mobile optimization
 */
interface StatsGridProps {
    children: ReactNode;
    columns?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}

const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
};

const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export function StatsGrid({
    children,
    columns = 4,
    gap = 'md',
    className,
}: StatsGridProps) {
    return (
        <div className={cn(
            "grid",
            columnClasses[columns],
            gapClasses[gap],
            className
        )}>
            {children}
        </div>
    );
}
