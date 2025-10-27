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
      <div className="rounded-xl border-2 border-border/50 overflow-hidden bg-card shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted/50 to-muted/30 border-b-2 border-border/50">
              <tr>
                {columns
                  .filter(col => !col.mobileHidden || window.innerWidth >= 768)
                  .map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-foreground uppercase tracking-wider ${column.className || ""}`}
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
                      <td key={column.key} className="px-4 md:px-6 py-4">
                        <Skeleton className="h-6 w-full" />
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
      <div className="rounded-xl border-2 border-border/50 bg-card shadow-lg p-12 text-center">
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-border/50 overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted/50 to-muted/30 border-b-2 border-border/50 sticky top-0 z-10">
              <tr>
                {columns.map((column) => {
                  let classes = `px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-foreground uppercase tracking-wider ${column.className || ""}`;
                  
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
                    hover:bg-primary/5 transition-all duration-200
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${rowClassName ? rowClassName(item) : ""}
                  `}
                >
                  {columns.map((column) => {
                    let classes = `px-4 md:px-6 py-4 text-sm md:text-base ${column.className || ""}`;
                    
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
        <div className="flex items-center justify-between px-4 py-3 bg-card rounded-xl border-2 border-border/50 shadow-md">
          <div className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-2"
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
