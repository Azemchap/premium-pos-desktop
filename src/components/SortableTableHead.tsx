import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  label: string;
  column: string;
  currentColumn: string;
  direction: "asc" | "desc";
  onSort: (column: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

export default function SortableTableHead({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className,
  align = "left",
}: SortableTableHeadProps) {
  const isActive = currentColumn === column;

  return (
    <TableHead
      className={cn(
        "h-9 px-2 sm:px-4 text-xs cursor-pointer hover:bg-muted/50",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      onClick={() => onSort(column)}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" && "justify-end",
          align === "center" && "justify-center"
        )}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}
