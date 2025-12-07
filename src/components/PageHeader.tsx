import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Consistent PageHeader component - Stripe-inspired minimal design
 * Features:
 * - Clean, professional typography
 * - Minimal color usage
 * - Consistent spacing
 * - Max font size: 2xl desktop, xl mobile
 */
interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex items-start justify-between gap-4 pb-4 mb-4 md:mb-6 border-b border-border/40",
      className
    )}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            {badge && (
              <Badge variant={badge.variant || "outline"} className="text-xs font-normal">
                {badge.text}
              </Badge>
            )}
          </div>

          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
