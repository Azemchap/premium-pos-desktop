import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Stripe-inspired PageHeader component
 * Clean, minimal, professional
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
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-6",
      className
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          {badge && (
            <Badge variant={badge.variant || "secondary"} className="text-[10px] font-medium">
              {badge.text}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
