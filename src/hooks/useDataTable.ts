/**
 * useDataTable - Reusable hook for table data management
 * Handles pagination, sorting, filtering, and search
 */
import { useMemo, useState, useCallback } from "react";

export type SortDirection = "asc" | "desc";

export interface UseDataTableOptions<T> {
  data: T[];
  searchFields?: (keyof T)[];
  pageSize?: number;
  initialSortColumn?: keyof T;
  initialSortDirection?: SortDirection;
}

export interface UseDataTableReturn<T> {
  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Sorting
  sortColumn: keyof T | null;
  sortDirection: SortDirection;
  setSorting: (column: keyof T, direction?: SortDirection) => void;
  toggleSort: (column: keyof T) => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredData: T[];

  // Metadata
  totalRecords: number;
  filteredRecords: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export function useDataTable<T extends Record<string, any>>({
  data,
  searchFields = [],
  pageSize: initialPageSize = 20,
  initialSortColumn,
  initialSortDirection = "asc",
}: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortColumn, setSortColumn] = useState<keyof T | null>(initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery || searchFields.length === 0) return data;

    const lowercaseQuery = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowercaseQuery);
      })
    );
  }, [data, searchQuery, searchFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, sortColumn, sortDirection]);

  // Pagination functions
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Sorting functions
  const setSorting = useCallback((column: keyof T, direction?: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction || "asc");
  }, []);

  const toggleSort = useCallback((column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    // Pagination
    currentPage,
    totalPages: totalPages || 1,
    pageSize,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handlePageSizeChange,

    // Sorting
    sortColumn,
    sortDirection,
    setSorting,
    toggleSort,

    // Search & Filter
    searchQuery,
    setSearchQuery,
    filteredData: sortedData,

    // Metadata
    totalRecords: data.length,
    filteredRecords: sortedData.length,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages || totalPages === 0,
  };
}
