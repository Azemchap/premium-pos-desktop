// src/components/PageHeader.tsx - Enhanced Mobile-First PageHeader
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface StatusIndicator {
  variant: "success" | "warning" | "error" | "info";
  label: string;
}

interface PageHeaderProps {
  /** Icon to display before the title */
  icon?: LucideIcon;
  
  /** Main page title */
  title: string;
  
  /** Brief description under the title */
  subtitle?: string;
  
  /** Optional badge next to title */
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
  
  /** Action buttons or components */
  actions?: React.ReactNode;
  
  /** Breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[];
  
  /** Status indicator dot with label */
  status?: StatusIndicator;
  
  /** Additional metadata to display */
  meta?: React.ReactNode;
  
  /** Loading state */
  loading?: boolean;
  
  /** Custom className */
  className?: string;
  
  /** Compact mode - reduces padding */
  compact?: boolean;
  
  /** Hide on mobile - useful for sticky headers */
  hideOnMobile?: boolean;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  status,
  meta,
  loading = false,
  className,
  compact = false,
  hideOnMobile = false,
}: PageHeaderProps) {
  if (loading) {
    return (
      <div className={cn("space-y-3", compact ? "pb-2" : "pb-4", className)}>
        {breadcrumbs && <Skeleton className="h-4 w-48" />}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            {subtitle && <Skeleton className="h-4 w-96" />}
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  const statusVariants = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div
      className={cn(
        "space-y-3 transition-all duration-200",
        compact ? "pb-2" : "pb-4",
        hideOnMobile && "hidden sm:block",
        className
      )}
      role="banner"
      aria-label="Page header"
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden="true" />
              )}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
                    "touch-manipulation"
                  )}
                  aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={cn(
                    index === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Main Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        {/* Left: Title, Subtitle, Meta */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {Icon && (
              <div className="flex-shrink-0">
                <Icon
                  className={cn(
                    "text-muted-foreground transition-colors",
                    compact ? "h-4 w-4" : "h-5 w-5"
                  )}
                  aria-hidden="true"
                />
              </div>
            )}
            <h1
              className={cn(
                "font-semibold text-foreground tracking-tight min-w-0",
                compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
              )}
            >
              {title}
            </h1>
            {badge && (
              <Badge
                variant={badge.variant || "secondary"}
                className={cn(
                  "font-medium flex-shrink-0",
                  compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
                )}
              >
                {badge.text}
              </Badge>
            )}
            {status && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={cn("w-2 h-2 rounded-full animate-pulse", statusVariants[status.variant])}
                  aria-label={`Status: ${status.label}`}
                />
                <span className="text-xs text-muted-foreground font-medium">{status.label}</span>
              </div>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p
              className={cn(
                "text-muted-foreground leading-relaxed",
                compact ? "text-xs sm:text-sm" : "text-sm"
              )}
            >
              {subtitle}
            </p>
          )}

          {/* Meta Information */}
          {meta && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {meta}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        {actions && (
          <div
            className={cn(
              "flex items-center gap-2 flex-shrink-0",
              "self-start sm:self-auto" // Align to start on mobile
            )}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Optional Separator */}
      {!compact && <Separator className="mt-4" />}
    </div>
  );
}

/**
 * Compact variant for use in modals, dialogs, or tight spaces
 */
export function CompactPageHeader(props: Omit<PageHeaderProps, "compact">) {
  return <PageHeader {...props} compact />;
}

/**
 * Mobile-hidden variant for sticky headers
 */
export function DesktopOnlyPageHeader(props: Omit<PageHeaderProps, "hideOnMobile">) {
  return <PageHeader {...props} hideOnMobile />;
}