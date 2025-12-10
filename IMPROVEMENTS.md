# Code Quality & Scalability Improvements

## Executive Summary

This document outlines improvements for the QorBooks Desktop application to enhance maintainability, scalability, and code quality. The app is well-structured with a solid foundation, but several patterns can be standardized to reduce technical debt and improve developer experience.

---

## 🎯 Priority Matrix

### 🔴 Critical (Implement Immediately)
1. **Type Duplication** - Risk of type drift
2. **Standardize Error Handling** - Inconsistent UX
3. **Extract Reusable Hooks** - Reduce code duplication

### 🟡 High Priority (Next Sprint)
4. **Break Down Large Components** - Maintainability
5. **Add Request Cancellation** - Memory leaks
6. **Implement Data Caching** - Performance

### 🟢 Medium Priority (Future)
7. **Comprehensive ARIA Labels** - Accessibility
8. **Refactor ProductVariantManager** - Component size
9. **Add E2E Tests** - Quality assurance

---

## 1. Type Duplication Fix

### Problem
`Product` interface is duplicated in 5 files:
- `/src/types/index.ts` (source of truth)
- `/src/store/cartStore.ts`
- `/src/pages/Products.tsx`
- `/src/pages/Sales.tsx`
- `/src/pages/Inventory.tsx`

### Solution
**Use centralized types from `/src/types/index.ts`**

#### Before (src/pages/Products.tsx):
```typescript
interface Product {
  id: number;
  name: string;
  sku: string;
  // ... 20+ fields duplicated
}
```

#### After:
```typescript
import { Product } from "@/types";

// Now use Product type directly
const [products, setProducts] = useState<Product[]>([]);
```

### Action Items
- [ ] Remove Product interface from `cartStore.ts`
- [ ] Remove Product interface from `Products.tsx`
- [ ] Remove Product interface from `Sales.tsx`
- [ ] Remove Product interface from `Inventory.tsx`
- [ ] Import from `@/types` instead

### Benefits
- Single source of truth
- No type drift
- Easier maintenance
- Type safety across the app

---

## 2. Standardize Error Handling

### Problem
- Direct `invoke()` calls without consistent error handling
- Inconsistent toast messages
- No centralized error parsing
- No retry logic for network errors

### Solution
**Use the new error handling utilities**

Created: `/src/lib/errorHandling.ts`
- `parseError()` - Normalize errors
- `handleError()` - Show toast & log
- `retryWithBackoff()` - Retry failed requests
- `formatValidationErrors()` - Format Zod errors

#### Before:
```typescript
try {
  const result = await invoke<Product[]>("get_products");
  setProducts(result);
} catch (error) {
  console.error("Failed to load products:", error);
  toast.error("Failed to load products");
}
```

#### After:
```typescript
import { handleError, retryWithBackoff } from "@/lib/errorHandling";

try {
  // Add retry logic for network errors
  const result = await retryWithBackoff(
    () => invoke<Product[]>("get_products"),
    { maxRetries: 3 }
  );
  setProducts(result);
} catch (error) {
  handleError(error, "load products", {
    customMessage: "Unable to load products. Please try again.",
  });
}
```

### Benefits
- Consistent error messages
- Automatic retry for network errors
- Better user experience
- Centralized logging (ready for Sentry/LogRocket)

---

## 3. Extract Reusable Hooks

### Problem
- Pagination logic duplicated in 10+ pages
- CRUD patterns repeated everywhere
- No abstraction for common operations

### Solution
**Use the new custom hooks**

#### Created Hooks

1. **`useDataTable`** - Table data management
   - Pagination, sorting, filtering, search
   - Used in: Products, Sales, Employees, etc.

2. **`useCRUD`** - CRUD operations
   - Create, Read, Update, Delete
   - Dialog state management
   - Used in all entity pages

3. **`useAsyncAction`** - Async operations
   - Loading, error, success states
   - Toast notifications
   - Used for any async action

#### Example: Products Page Refactor

**Before (150 lines of boilerplate):**
```typescript
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const [sortColumn, setSortColumn] = useState("name");
const [sortDirection, setSortDirection] = useState("asc");
// ... 20+ more state variables
// ... 100+ lines of sorting/filtering/pagination logic

const loadProducts = async () => {
  try {
    setLoading(true);
    const result = await invoke<Product[]>("get_products");
    setProducts(result);
  } catch (error) {
    // error handling
  } finally {
    setLoading(false);
  }
};

// More CRUD functions...
```

**After (20 lines, cleaner):**
```typescript
import { useCRUD } from "@/hooks/useCRUD";
import { useDataTable } from "@/hooks/useDataTable";

// CRUD operations (create, update, delete)
const {
  items: products,
  loading,
  createItem: createProduct,
  updateItem: updateProduct,
  deleteItem: deleteProduct,
  isDialogOpen,
  openCreateDialog,
  openEditDialog,
  closeDialog,
} = useCRUD<Product>({
  resourceName: "product",
  listCommand: "get_products",
  createCommand: "create_product",
  updateCommand: "update_product",
  deleteCommand: "delete_product",
  reactivateCommand: "reactivate_product",
});

// Table features (pagination, sorting, search)
const {
  paginatedData,
  currentPage,
  totalPages,
  goToPage,
  searchQuery,
  setSearchQuery,
  toggleSort,
  sortColumn,
  sortDirection,
} = useDataTable({
  data: products,
  searchFields: ["name", "sku", "barcode"],
  pageSize: 20,
});
```

### Benefits
- **80% less boilerplate code**
- Consistent patterns across pages
- Easier to maintain
- Easier to test
- Reusable logic

---

## 4. Break Down Large Components

### Problem
- `Products.tsx` - 1,212 lines
- `Sales.tsx` - 1,120 lines
- `Settings.tsx` - 894 lines
- `ProductVariantManager.tsx` - 14,885 bytes

### Solution
**Extract into smaller, focused components**

#### Example: Products.tsx Refactor

```
src/pages/Products/
├── index.tsx (main component, 200 lines)
├── components/
│   ├── ProductsTable.tsx (table display)
│   ├── ProductsFilters.tsx (search & filters)
│   ├── ProductsStats.tsx (statistics cards)
│   ├── ProductDialog.tsx (create/edit form)
│   └── ProductVariantSection.tsx (variants)
└── hooks/
    └── useProductsData.ts (business logic)
```

#### Benefits
- Easier to understand
- Easier to test
- Better code organization
- Reusable components
- Faster code navigation

---

## 5. Add Request Cancellation

### Problem
- `useEffect` fetches data but doesn't cleanup
- Can cause memory leaks on unmount
- Race conditions possible

### Solution
**Use AbortController for cleanup**

#### Before:
```typescript
useEffect(() => {
  loadProducts();
}, []);
```

#### After:
```typescript
useEffect(() => {
  const controller = new AbortController();

  const loadProducts = async () => {
    try {
      const result = await invoke<Product[]>("get_products", {
        signal: controller.signal, // Pass abort signal
      });
      setProducts(result);
    } catch (error) {
      if (error.name !== "AbortError") {
        handleError(error, "load products");
      }
    }
  };

  loadProducts();

  // Cleanup: cancel request on unmount
  return () => controller.abort();
}, []);
```

### Benefits
- No memory leaks
- Cleaner unmount
- Better performance

---

## 6. Implement Data Caching

### Problem
- Every page mount = new API call
- No background data refresh
- Duplicate requests possible

### Solution
**Add React Query or SWR**

#### Installation:
```bash
npm install @tanstack/react-query
```

#### Setup (src/lib/queryClient.ts):
```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

#### Usage:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function Products() {
  const queryClient = useQueryClient();

  // Fetch with caching
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => invoke<Product[]>("get_products"),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create with cache invalidation
  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) =>
      invoke("create_product", { request: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created!");
    },
  });

  return <div>{/* UI */}</div>;
}
```

### Benefits
- Automatic caching
- Background refetch
- Request deduplication
- Optimistic updates
- Better performance

---

## 7. Comprehensive ARIA Labels

### Current Status
Partial implementation exists. Need full audit.

### Checklist

#### Forms
- [ ] All inputs have `aria-label` or associated `<label>`
- [ ] Error messages have `aria-describedby`
- [ ] Required fields marked with `aria-required`
- [ ] Invalid fields marked with `aria-invalid`

#### Buttons & Actions
- [ ] Icon-only buttons have `aria-label`
- [ ] Loading buttons have `aria-busy="true"`
- [ ] Disabled buttons have `aria-disabled`

#### Navigation
- [ ] Current page highlighted with `aria-current="page"`
- [ ] Breadcrumbs use `aria-label="Breadcrumb"`
- [ ] Pagination has proper `aria-labels`

#### Data Tables
- [ ] Table has `role="table"` (or use semantic `<table>`)
- [ ] Sortable columns have `aria-sort`
- [ ] Row selection uses `aria-selected`

#### Dialogs & Modals
- [ ] Use `role="dialog"` and `aria-modal="true"`
- [ ] Have `aria-labelledby` pointing to title
- [ ] Have `aria-describedby` pointing to description

#### Live Regions
- [ ] Toast notifications use `role="alert"` or `aria-live="polite"`
- [ ] Loading states use `aria-busy`
- [ ] Dynamic content updates announce properly

### Example Improvements

**Before:**
```tsx
<button onClick={handleDelete}>
  <Trash2 className="w-4 h-4" />
</button>
```

**After:**
```tsx
<button
  onClick={handleDelete}
  aria-label="Delete product"
  aria-describedby={isDeleting ? "delete-status" : undefined}
>
  <Trash2 className="w-4 h-4" />
  {isDeleting && (
    <span id="delete-status" className="sr-only">
      Deleting product...
    </span>
  )}
</button>
```

---

## 8. Design System Enforcement

### Problem
- `designSystem.ts` exists but underutilized
- Most components use inline Tailwind classes
- Inconsistent styling

### Solution
**Migrate to design tokens**

#### Before:
```tsx
<Card className="shadow-md border-2 hover:shadow-lg transition-all duration-200 p-6 rounded-xl">
```

#### After:
```tsx
import { cardClasses } from "@/lib/designSystem";

<Card className={cardClasses("gradient")}>
```

### Action Items
1. Create component variant system
2. Document design tokens usage
3. Migrate pages incrementally
4. Add ESLint rule to enforce usage

---

## 9. Performance Optimizations

### Current Issues
- Large component re-renders
- No React.memo usage
- Heavy filtering calculations

### Solutions

#### 1. Memoize Expensive Calculations
```typescript
const filteredProducts = useMemo(() => {
  return products.filter(/* expensive filter */);
}, [products, filterCriteria]);
```

#### 2. Memoize Components
```typescript
const ProductCard = React.memo(({ product }: { product: Product }) => {
  return <Card>{/* product details */}</Card>;
});
```

#### 3. Virtual Scrolling for Large Lists
```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: products.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

---

## 10. Testing Strategy

### Current Status
- No unit tests
- No integration tests
- No E2E tests

### Recommended Setup

#### Unit Tests (Vitest)
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Test custom hooks:
```typescript
// src/hooks/__tests__/useDataTable.test.ts
import { renderHook, act } from "@testing-library/react";
import { useDataTable } from "../useDataTable";

describe("useDataTable", () => {
  it("should paginate data correctly", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: mockProducts,
        pageSize: 10,
      })
    );

    expect(result.current.paginatedData).toHaveLength(10);

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.currentPage).toBe(2);
  });
});
```

#### Integration Tests
```typescript
// src/pages/__tests__/Products.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Products from "../Products";

describe("Products Page", () => {
  it("should load and display products", async () => {
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Product 1")).toBeInTheDocument();
    });
  });

  it("should create new product", async () => {
    const user = userEvent.setup();
    render(<Products />);

    await user.click(screen.getByText("Create Product"));
    await user.type(screen.getByLabelText("Name"), "New Product");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("New Product")).toBeInTheDocument();
    });
  });
});
```

---

## 11. Documentation Standards

### Code Documentation

#### Components
```typescript
/**
 * ProductCard - Displays a single product with actions
 *
 * @param product - The product to display
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 *
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onEdit={(id) => console.log(id)}
 *   onDelete={(id) => console.log(id)}
 * />
 * ```
 */
export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  // ...
}
```

#### Hooks
```typescript
/**
 * useDataTable - Manages table state with pagination, sorting, and filtering
 *
 * @param options - Configuration options
 * @param options.data - Array of data to display
 * @param options.searchFields - Fields to search in
 * @param options.pageSize - Number of items per page
 *
 * @returns Table state and control functions
 *
 * @example
 * ```typescript
 * const { paginatedData, currentPage, goToPage } = useDataTable({
 *   data: products,
 *   searchFields: ["name", "sku"],
 *   pageSize: 20
 * });
 * ```
 */
export function useDataTable<T>(options: UseDataTableOptions<T>): UseDataTableReturn<T> {
  // ...
}
```

---

## 12. CI/CD Pipeline

### Recommended GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions-rs/toolchain@v1
      - run: npm ci
      - run: npm run tauri build
```

---

## Migration Plan

### Phase 1: Foundation (Week 1)
- [x] Create reusable hooks (`useDataTable`, `useCRUD`, `useAsyncAction`)
- [x] Create error handling utilities
- [ ] Fix type duplication
- [ ] Update 3 pages to use new hooks (Products, Employees, Sales)

### Phase 2: Standardization (Week 2)
- [ ] Migrate all pages to use new hooks
- [ ] Add request cancellation
- [ ] Enforce design system usage
- [ ] Add comprehensive ARIA labels

### Phase 3: Performance (Week 3)
- [ ] Implement React Query
- [ ] Add component memoization
- [ ] Virtual scrolling for large lists
- [ ] Performance profiling

### Phase 4: Quality (Week 4)
- [ ] Add unit tests (80% coverage target)
- [ ] Add E2E tests (critical paths)
- [ ] Set up CI/CD pipeline
- [ ] Documentation audit

---

## Metrics & Monitoring

### Code Quality Metrics
- [ ] TypeScript strict mode enabled
- [ ] ESLint errors: 0
- [ ] Test coverage: 80%+
- [ ] Bundle size: < 5MB
- [ ] Lighthouse score: 90+

### Performance Metrics
- [ ] First Contentful Paint: < 1.5s
- [ ] Time to Interactive: < 3.5s
- [ ] Average page load: < 2s
- [ ] Memory leaks: 0

---

## Conclusion

The QorBooks Desktop app has a solid foundation. These improvements will:

✅ **Reduce code duplication by 80%**
✅ **Improve maintainability** - Easier to understand and modify
✅ **Enhance scalability** - Ready for team growth
✅ **Better UX** - Consistent error handling and loading states
✅ **Performance gains** - Caching and optimization
✅ **Quality assurance** - Testing and monitoring

**Estimated Total Implementation Time**: 4 weeks
**Estimated Code Reduction**: 3,000+ lines removed (replaced with reusable hooks)

---

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Tauri Best Practices](https://tauri.app/v1/guides/building/)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)
