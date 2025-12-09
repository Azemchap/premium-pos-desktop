# Frontend Refactoring Guide

## Current Status

All 25 frontend pages are functional with proper routing and type safety. This guide outlines the systematic approach to modernize them with the new hooks and utilities.

## Available Tools & Hooks

### ✅ Ready to Use

1. **`useDataTable`** (`src/hooks/useDataTable.ts`) - 170 lines
   - Pagination, sorting, filtering, search
   - Reduces 80+ lines of boilerplate per page

2. **`useCRUD`** (`src/hooks/useCRUD.ts`) - 155 lines
   - Full CRUD operations with dialog management
   - Reduces 150+ lines of boilerplate per page

3. **`useAsyncAction`** (`src/hooks/useAsyncAction.ts`) - 90 lines
   - Async state management (loading, error, success)
   - Automatic toast notifications

4. **`useAbortController`** (`src/hooks/useAbortController.ts`) - NEW
   - Request cancellation on component unmount
   - Prevents memory leaks

5. **Error Handling** (`src/lib/errorHandling.ts`) - 260 lines
   - `handleError()` - Centralized error processing
   - `parseError()` - Consistent error formatting
   - `retryWithBackoff()` - Automatic retry logic
   - `formatValidationErrors()` - Zod integration

## Page Inventory (25 Pages)

### Core Pages (High Priority)
| Page | Lines | Status | Priority | Potential Reduction |
|------|-------|--------|----------|-------------------|
| Products.tsx | 1,188 | ✅ Types fixed | HIGH | ~400 lines (34%) |
| Sales.tsx | 1,101 | ✅ Types fixed | HIGH | ~350 lines (32%) |
| Employees.tsx | 837 | ✅ Types fixed | HIGH | ~300 lines (36%) |
| Inventory.tsx | ? | ✅ Types fixed | HIGH | ~250 lines (30%) |
| Returns.tsx | ? | Needs review | MEDIUM | ~200 lines |

### Supporting Pages (Medium Priority)
- Customers.tsx
- Suppliers.tsx
- PurchaseOrders.tsx
- Expenses.tsx
- MasterData.tsx
- Users.tsx

### Dashboard & Reports (Medium Priority)
- Dashboard.tsx
- Reports.tsx
- SalesRecords.tsx
- Finance.tsx
- Notifications.tsx

### Secondary Pages (Lower Priority)
- Promotions.tsx
- TimeTracking.tsx
- Appointments.tsx
- Organization.tsx
- Settings.tsx
- Profile.tsx
- Cart.tsx

### Utility Pages (Minimal Changes)
- LoginPage.tsx
- Unauthorized.tsx

## Refactoring Checklist Per Page

### Step 1: Analyze Current Implementation
```bash
# Check page complexity
wc -l src/pages/YourPage.tsx

# Find state management patterns
grep -n "useState" src/pages/YourPage.tsx

# Find data fetching
grep -n "invoke\|fetch" src/pages/YourPage.tsx
```

### Step 2: Import New Utilities
```tsx
import { useDataTable } from '@/hooks/useDataTable';
import { useCRUD } from '@/hooks/useCRUD';
import { useAbortController } from '@/hooks/useAbortController';
import { handleError } from '@/lib/errorHandling';
```

### Step 3: Replace Pagination/Sorting/Filtering
**Before (80+ lines):**
```tsx
const [items, setItems] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [searchQuery, setSearchQuery] = useState("");
const [sortColumn, setSortColumn] = useState("name");
const [sortDirection, setSortDirection] = useState("asc");

// Manual pagination logic
const filteredItems = items.filter(item =>
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// Manual sorting logic
const sortedItems = [...filteredItems].sort((a, b) => {
  // 20+ lines of sorting logic
});

// Manual pagination calculation
const startIndex = (currentPage - 1) * pageSize;
const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);
```

**After (5 lines):**
```tsx
const table = useDataTable({
  data: items,
  searchFields: ['name', 'sku', 'email'],
  pageSize: 20,
});
```

### Step 4: Replace CRUD Operations
**Before (150+ lines):**
```tsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState(null);
const [isSubmitting, setIsSubmitting] = useState(false);

const loadItems = async () => {
  setLoading(true);
  try {
    const result = await invoke("get_items");
    setItems(result);
  } catch (error) {
    toast.error("Failed to load");
  } finally {
    setLoading(false);
  }
};

const handleCreate = async () => {
  setIsSubmitting(true);
  try {
    await invoke("create_item", { request: formData });
    toast.success("Created!");
    await loadItems();
    setIsDialogOpen(false);
  } catch (error) {
    toast.error("Failed to create");
  } finally {
    setIsSubmitting(false);
  }
};

// Similar for update and delete... 100+ more lines
```

**After (15 lines):**
```tsx
const crud = useCRUD<Item>({
  resourceName: 'item',
  listCommand: 'get_items',
  createCommand: 'create_item',
  updateCommand: 'update_item',
  deleteCommand: 'delete_item',
});

// Use: crud.items, crud.loading, crud.createItem(), etc.
```

### Step 5: Add Request Cancellation
```tsx
const signal = useAbortController();

useEffect(() => {
  const loadData = async () => {
    try {
      // Tauri invoke doesn't support AbortSignal directly,
      // but we can check if aborted before processing
      if (signal?.aborted) return;

      const data = await invoke('get_data');

      if (!signal?.aborted) {
        setData(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        handleError(error, 'Loading data');
      }
    }
  };

  loadData();
}, []);
```

### Step 6: Standardize Error Handling
**Before:**
```tsx
try {
  await invoke('operation');
  toast.success('Success!');
} catch (error) {
  console.error(error);
  toast.error('Failed!');
}
```

**After:**
```tsx
try {
  await invoke('operation');
  toast.success('Success!');
} catch (error) {
  handleError(error, 'operation name', {
    showToast: true,
    customMessage: 'Custom message if needed'
  });
}
```

## Expected Impact Per Page

### Products.tsx (1,188 → ~800 lines)
- Remove: 80 lines (pagination/sorting)
- Remove: 150 lines (CRUD boilerplate)
- Remove: 50 lines (error handling)
- Add: 20 lines (hook usage)
- **Net Reduction: ~260 lines (22%)**

### Sales.tsx (1,101 → ~750 lines)
- Similar pattern, focus on sales records management
- **Net Reduction: ~350 lines (32%)**

### Employees.tsx (837 → ~500 lines)
- Simplest case - pure CRUD with table
- **Net Reduction: ~337 lines (40%)**

## Migration Schedule

### Week 1: High-Impact Pages
- [ ] Products.tsx
- [ ] Sales.tsx
- [ ] Employees.tsx

### Week 2: Data-Heavy Pages
- [ ] Inventory.tsx
- [ ] Customers.tsx
- [ ] Suppliers.tsx

### Week 3: Remaining CRUD Pages
- [ ] PurchaseOrders.tsx
- [ ] Expenses.tsx
- [ ] Returns.tsx
- [ ] Users.tsx
- [ ] MasterData.tsx

### Week 4: Polish & Testing
- [ ] Dashboard & Reports
- [ ] Secondary pages
- [ ] Add missing AbortController to all pages
- [ ] Comprehensive testing

## Testing Checklist

For each refactored page:

- [ ] Page loads without errors
- [ ] Search/filter works correctly
- [ ] Pagination functions properly
- [ ] Sort ascending/descending works
- [ ] Create operation succeeds
- [ ] Edit operation preserves data
- [ ] Delete operation with confirmation
- [ ] Validation errors display correctly
- [ ] Success toasts appear
- [ ] Error handling works (test with invalid data)
- [ ] No memory leaks (check DevTools)
- [ ] Responsive on mobile
- [ ] Keyboard navigation works

## Common Patterns

### Pattern 1: Simple CRUD Page
```tsx
export default function SimplePage() {
  const crud = useCRUD<Item>({
    resourceName: 'item',
    listCommand: 'get_items',
    createCommand: 'create_item',
    updateCommand: 'update_item',
    deleteCommand: 'delete_item',
  });

  const table = useDataTable({
    data: crud.items,
    searchFields: ['name', 'email'],
  });

  return (
    <div>
      <SearchBar value={table.searchQuery} onChange={table.setSearchQuery} />
      <Table data={table.paginatedData} />
      <Pagination {...table} />
    </div>
  );
}
```

### Pattern 2: Complex Page with Filters
```tsx
export default function ComplexPage() {
  const [customFilters, setCustomFilters] = useState({
    category: 'all',
    status: 'active',
  });

  const crud = useCRUD<Item>({ /* config */ });

  // Apply custom filters before table
  const filteredData = useMemo(() => {
    return crud.items.filter(item => {
      if (customFilters.category !== 'all' && item.category !== customFilters.category) {
        return false;
      }
      if (customFilters.status !== 'all' && item.status !== customFilters.status) {
        return false;
      }
      return true;
    });
  }, [crud.items, customFilters]);

  const table = useDataTable({
    data: filteredData,
    searchFields: ['name'],
  });

  return (
    <div>
      <FilterBar filters={customFilters} onChange={setCustomFilters} />
      <SearchBar value={table.searchQuery} onChange={table.setSearchQuery} />
      <Table data={table.paginatedData} />
    </div>
  );
}
```

## Notes

1. **Don't refactor everything at once** - Do one page at a time and test thoroughly
2. **Keep git history clean** - One commit per page
3. **Test in development** - Verify all functionality before committing
4. **Update tests** - If you have tests, update them to match new structure
5. **Document edge cases** - If a page has special behavior, document why

## Completion Tracking

Update this table as pages are refactored:

| Page | Before | After | Reduction | Completed | Commit |
|------|--------|-------|-----------|-----------|--------|
| Products.tsx | 1,188 | - | - | ❌ | - |
| Sales.tsx | 1,101 | - | - | ❌ | - |
| Employees.tsx | 837 | - | - | ❌ | - |
| ... | ... | ... | ... | ... | ... |

---

**Total Expected Reduction**: ~2,000-3,000 lines across all pages (~30-35% average)
