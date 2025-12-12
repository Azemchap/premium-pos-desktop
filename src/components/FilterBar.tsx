import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchBar from "./SearchBar";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  className?: string;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  className,
}: FilterBarProps) {
  const gridCols = filters.length === 0 ? "grid-cols-1" :
                   filters.length === 1 ? "grid-cols-2 sm:grid-cols-3" :
                   filters.length === 2 ? "grid-cols-2 sm:grid-cols-4" :
                   "grid-cols-2 sm:grid-cols-5";

  return (
    <Card className={cn("shadow-md", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className={cn("grid gap-3 sm:gap-4", gridCols)}>
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className={filters.length === 0 ? "col-span-1" : "col-span-2"}
          />
          {filters.map((filter, index) => (
            <Select
              key={index}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
