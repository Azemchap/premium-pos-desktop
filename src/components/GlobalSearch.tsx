import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Search, Package, Users, UserCog, Truck, ShoppingCart, Loader2 } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEffect, useState } from "react";

const typeIcons = {
  product: Package,
  customer: Users,
  employee: UserCog,
  supplier: Truck,
  sale: ShoppingCart,
  order: ShoppingCart,
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { searchQuery, setSearchQuery, results, isSearching, navigateToResult } = useGlobalSearch();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (result: any) => {
    navigateToResult(result);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="relative max-w-md w-full hidden sm:flex items-center h-9 pl-9 pr-4 text-sm bg-muted/50 border-0 rounded-md hover:bg-muted transition-colors text-muted-foreground"
      >
        <Search className="absolute left-3 w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search products, customers, employees..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isSearching && results.length === 0 && searchQuery.length >= 2 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {!isSearching && results.length > 0 && (
            <>
              {["product", "customer", "employee", "supplier", "sale", "order"].map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;

                const Icon = typeIcons[type as keyof typeof typeIcons];
                return (
                  <CommandGroup
                    key={type}
                    heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                  >
                    {typeResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}-${result.title}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
