import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileHidden?: boolean; // Hide on mobile
  tabletHidden?: boolean; // Hide on tablet
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No data available",
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/20 border-b border-border/50">
              <tr>
                {columns
                  .filter(col => !col.mobileHidden || window.innerWidth >= 768)
                  .map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 md:px-4 py-2 md:py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide ${column.className || ""}`}
                    >
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns
                    .filter(col => !col.mobileHidden || window.innerWidth >= 768)
                    .map((column) => (
                      <td key={column.key} className="px-3 md:px-4 py-2.5 md:py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 overflow-hidden bg-card hover:border-border transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/20 border-b border-border/50 sticky top-0 z-10">
              <tr>
                {columns.map((column) => {
                  let classes = `px-3 md:px-4 py-2 md:py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide ${column.className || ""}`;

                  if (column.mobileHidden) {
                    classes += " hidden md:table-cell";
                  }
                  if (column.tabletHidden) {
                    classes += " hidden lg:table-cell";
                  }

                  return (
                    <th key={column.key} className={classes}>
                      {column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    hover:bg-muted/30 transition-colors
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${rowClassName ? rowClassName(item) : ""}
                  `}
                >
                  {columns.map((column) => {
                    let classes = `px-3 md:px-4 py-2.5 md:py-3 text-sm ${column.className || ""}`;

                    if (column.mobileHidden) {
                      classes += " hidden md:table-cell";
                    }
                    if (column.tabletHidden) {
                      classes += " hidden lg:table-cell";
                    }

                    return (
                      <td key={column.key} className={classes}>
                        {column.render
                          ? column.render(item)
                          : String((item as any)[column.key] ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {currentPage !== undefined && totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2.5 bg-card rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
