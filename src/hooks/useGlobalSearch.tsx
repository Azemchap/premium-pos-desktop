import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

export interface SearchResult {
  id: string | number;
  type: "product" | "customer" | "employee" | "sale" | "order" | "supplier";
  title: string;
  subtitle?: string;
  route: string;
  metadata?: Record<string, any>;
}

export function useGlobalSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const query = searchQuery.toLowerCase();
        const allResults: SearchResult[] = [];

        // Search products
        try {
          const products = await invoke<any[]>("get_products");
          const productResults = products
            .filter(
              (p) =>
                p.name.toLowerCase().includes(query) ||
                p.sku.toLowerCase().includes(query) ||
                p.barcode?.toLowerCase().includes(query)
            )
            .slice(0, 5)
            .map((p) => ({
              id: p.id,
              type: "product" as const,
              title: p.name,
              subtitle: `SKU: ${p.sku} • ${p.category || "No category"}`,
              route: `/products`,
              metadata: p,
            }));
          allResults.push(...productResults);
        } catch (e) {
          console.error("Failed to search products:", e);
        }

        // Search customers
        try {
          const customers = await invoke<any[]>("get_customers");
          const customerResults = customers
            .filter(
              (c) =>
                c.name.toLowerCase().includes(query) ||
                c.email?.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            )
            .slice(0, 5)
            .map((c) => ({
              id: c.id,
              type: "customer" as const,
              title: c.name,
              subtitle: c.email || c.phone || "No contact info",
              route: `/customers`,
              metadata: c,
            }));
          allResults.push(...customerResults);
        } catch (e) {
          console.error("Failed to search customers:", e);
        }

        // Search employees
        try {
          const employees = await invoke<any[]>("get_employees");
          const employeeResults = employees
            .filter(
              (e) =>
                e.username?.toLowerCase().includes(query) ||
                e.first_name?.toLowerCase().includes(query) ||
                e.last_name?.toLowerCase().includes(query) ||
                e.email?.toLowerCase().includes(query)
            )
            .slice(0, 5)
            .map((e) => ({
              id: e.id,
              type: "employee" as const,
              title: `${e.first_name} ${e.last_name}`,
              subtitle: `${e.position || "Employee"} • ${e.email}`,
              route: `/employees`,
              metadata: e,
            }));
          allResults.push(...employeeResults);
        } catch (e) {
          console.error("Failed to search employees:", e);
        }

        // Search suppliers
        try {
          const suppliers = await invoke<any[]>("get_suppliers");
          const supplierResults = suppliers
            .filter(
              (s) =>
                s.name.toLowerCase().includes(query) ||
                s.email?.toLowerCase().includes(query) ||
                s.contact_person?.toLowerCase().includes(query)
            )
            .slice(0, 5)
            .map((s) => ({
              id: s.id,
              type: "supplier" as const,
              title: s.name,
              subtitle: s.contact_person || s.email || "No contact info",
              route: `/suppliers`,
              metadata: s,
            }));
          allResults.push(...supplierResults);
        } catch (e) {
          console.error("Failed to search suppliers:", e);
        }

        setResults(allResults);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const navigateToResult = (result: SearchResult) => {
    navigate(result.route);
    setSearchQuery("");
    setResults([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    results,
    isSearching,
    navigateToResult,
  };
}
