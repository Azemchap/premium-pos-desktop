import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
  actions?: React.ReactNode;
}

export default function PageHeader({ icon: Icon, title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 p-3 mb-6 shadow-md">
      {/* Animated background blur orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl animate-pulse delay-75" />

      <div className="relative z-10 flex items-start justify-between gap-4">

        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md border-2 border-primary/20">
                <Icon className="w-4 h-4 md:w-7 md:h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent line-clamp-2">
              {title}
            </h3>
            {badge && (
              <Badge variant={badge.variant || "default"} className="text-xs line-clamp-2">
                {badge.text}
              </Badge>
            )}
          </div>

          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
