import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  iconBg?: string;
  className?: string;
  colSpan?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  iconBg = "bg-white/20",
  className,
  colSpan,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200",
        colSpan,
        className
      )}
    >
      <div className={cn("p-3 sm:p-4", gradient)}>
        <div className="flex items-start gap-1 justify-between">
          <div className="text-white">
            <p className="text-[10px] sm:text-xs opacity-90 font-medium">
              {title}
            </p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
          <div
            className={cn(
              "p-2 sm:p-2.5 rounded-lg backdrop-blur-sm",
              iconBg
            )}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      </div>
    </Card>
  );
}
