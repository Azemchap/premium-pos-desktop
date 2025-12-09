# Refactoring Example: Employees Page

This document demonstrates how to refactor an existing page using the new reusable hooks.

---

## Before: Traditional Approach (837 lines)

```typescript
// src/pages/Employees.tsx (BEFORE)
import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export default function Employees() {
  // 📦 STATE (50+ lines)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({...});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔄 DATA LOADING (30 lines)
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const result = await invoke<Employee[]>("get_employees");
      setEmployees(result);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  // ✏️ CRUD OPERATIONS (150+ lines)
  const handleCreateEmployee = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        await invoke("update_employee", {
          employeeId: editingEmployee.id,
          request: formData,
        });
        toast.success(`✅ Employee "${formData.first_name} ${formData.last_name}" updated!`);
      } else {
        await invoke("create_employee", { request: formData });
        toast.success(`✅ Employee "${formData.first_name} ${formData.last_name}" created!`);
      }
      setIsDialogOpen(false);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error("Failed to save employee:", error);
      toast.error(`❌ Failed to save employee: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${employeeName}"?`)) return;
    try {
      await invoke("delete_employee", { employeeId });
      toast.success(`Employee "${employeeName}" deactivated!`);
      loadEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      toast.error(`Failed to deactivate employee: ${error}`);
    }
  };

  // 🔍 FILTERING & SEARCH (80+ lines)
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        employee.first_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
      const matchesType = selectedEmploymentType === "all" || employee.employment_type === selectedEmploymentType;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);

      return matchesSearch && matchesDepartment && matchesType && matchesStatus;
    });
  }, [employees, debouncedSearchQuery, selectedDepartment, selectedEmploymentType, statusFilter]);

  // ⚙️ EFFECTS (20+ lines)
  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ... more helpers, stats calculation, form management, etc. (200+ lines)

  return (
    // 🎨 UI (400+ lines)
    <div>
      {/* Stats, filters, table, dialogs */}
    </div>
  );
}
```

**Total**: 837 lines, tons of boilerplate, hard to maintain

---

## After: Using Reusable Hooks (350 lines - 58% reduction!)

```typescript
// src/pages/Employees.tsx (AFTER)
import { useCRUD } from "@/hooks/useCRUD";
import { useDataTable } from "@/hooks/useDataTable";
import { useState, useMemo } from "react";
import { Employee, EmployeeFormData } from "@/types";
import { EmployeesTable } from "./components/EmployeesTable";
import { EmployeesFilters } from "./components/EmployeesFilters";
import { EmployeesStats } from "./components/EmployeesStats";
import { EmployeeDialog } from "./components/EmployeeDialog";

export default function Employees() {
  // 📦 CRUD OPERATIONS (5 lines instead of 150+!)
  const {
    items: employees,
    loading,
    createItem,
    updateItem,
    deleteItem,
    reactivateItem,
    isDialogOpen,
    setIsDialogOpen,
    editingEmployee,
    setEditingEmployee,
    isSubmitting,
    openCreateDialog,
    openEditDialog,
  } = useCRUD<Employee>({
    resourceName: "employee",
    listCommand: "get_employees",
    createCommand: "create_employee",
    updateCommand: "update_employee",
    deleteCommand: "delete_employee",
    reactivateCommand: "reactivate_employee",
  });

  // 🔍 ADDITIONAL FILTERS (not handled by CRUD)
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Apply custom filters
  const customFilteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDepartment = selectedDepartment === "all" || emp.department === selectedDepartment;
      const matchesType = selectedEmploymentType === "all" || emp.employment_type === selectedEmploymentType;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && emp.is_active) ||
        (statusFilter === "inactive" && !emp.is_active);
      return matchesDepartment && matchesType && matchesStatus;
    });
  }, [employees, selectedDepartment, selectedEmploymentType, statusFilter]);

  // 📊 TABLE MANAGEMENT (5 lines instead of 80+!)
  const table = useDataTable({
    data: customFilteredEmployees,
    searchFields: ["first_name", "last_name", "email", "position"],
    pageSize: 20,
    initialSortColumn: "first_name",
  });

  // 📈 STATS (computed from table data)
  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.is_active).length,
      inactive: employees.filter((e) => !e.is_active).length,
      departments: new Set(employees.map((e) => e.department).filter(Boolean)),
    }),
    [employees]
  );

  // 🎯 FORM HANDLERS (simplified)
  const handleSave = async (data: EmployeeFormData) => {
    if (editingEmployee) {
      await updateItem(editingEmployee.id, data);
    } else {
      await createItem(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    await deleteItem(id, name);
  };

  const handleReactivate = async (id: number, name: string) => {
    await reactivateItem?.(id, name);
  };

  // 🎨 RENDER (using extracted components)
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={UserCog}
        title="Employees"
        subtitle="Manage your employees"
        actions={
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />

      <EmployeesStats stats={stats} />

      <EmployeesFilters
        searchQuery={table.searchQuery}
        setSearchQuery={table.setSearchQuery}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        selectedEmploymentType={selectedEmploymentType}
        setSelectedEmploymentType={setSelectedEmploymentType}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        departments={Array.from(stats.departments)}
        totalResults={table.filteredRecords}
        totalEmployees={stats.total}
      />

      <EmployeesTable
        employees={table.paginatedData}
        loading={loading}
        sortColumn={table.sortColumn}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        currentPage={table.currentPage}
        totalPages={table.totalPages}
        goToPage={table.goToPage}
      />

      <EmployeeDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        employee={editingEmployee}
        onSave={handleSave}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

**Total**: ~350 lines (main component: 150 lines, sub-components: 200 lines)

---

## Sub-Components (Clean Separation)

### EmployeesStats.tsx (40 lines)
```typescript
interface EmployeesStatsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export function EmployeesStats({ stats }: EmployeesStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <StatCard title="Total" value={stats.total} icon={UserCog} color="blue" />
      <StatCard title="Active" value={stats.active} icon={CheckCircle} color="green" />
      <StatCard title="Inactive" value={stats.inactive} icon={XCircle} color="red" />
    </div>
  );
}
```

### EmployeesFilters.tsx (60 lines)
```typescript
interface EmployeesFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  // ... more filters
  totalResults: number;
  totalEmployees: number;
}

export function EmployeesFilters({ searchQuery, setSearchQuery, ... }: EmployeesFiltersProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
          <DepartmentFilter value={selectedDepartment} onChange={setSelectedDepartment} />
          {/* ... more filters */}
        </div>
        <ResultsCount current={totalResults} total={totalEmployees} />
      </CardContent>
    </Card>
  );
}
```

### EmployeesTable.tsx (100 lines)
```typescript
interface EmployeesTableProps {
  employees: Employee[];
  loading: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (column: keyof Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: number, name: string) => void;
  onReactivate: (id: number, name: string) => void;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
}

export function EmployeesTable({
  employees,
  loading,
  sortColumn,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onReactivate,
  currentPage,
  totalPages,
  goToPage,
}: EmployeesTableProps) {
  if (loading) return <LoadingSkeletons count={5} />;

  if (employees.length === 0) {
    return <EmptyState message="No employees found" icon={UserCog} />;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="first_name" label="Employee" {...{ sortColumn, sortDirection, onSort }} />
              <SortableHeader column="email" label="Contact" {...{ sortColumn, sortDirection, onSort }} />
              <SortableHeader column="position" label="Position" {...{ sortColumn, sortDirection, onSort }} />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onEdit={onEdit}
                onDelete={onDelete}
                onReactivate={onReactivate}
              />
            ))}
          </TableBody>
        </Table>

        <PaginationControls currentPage={currentPage} totalPages={totalPages} goToPage={goToPage} />
      </CardContent>
    </Card>
  );
}
```

### EmployeeDialog.tsx (80 lines)
```typescript
interface EmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (data: EmployeeFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function EmployeeDialog({ open, onClose, employee, onSave, isSubmitting }: EmployeeDialogProps) {
  const [formData, setFormData] = useState<EmployeeFormData>(getInitialFormData(employee));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const validation = employeeSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(formatZodErrors(validation.error));
      return;
    }

    await onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <EmployeeForm data={formData} onChange={setFormData} errors={errors} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Benefits Summary

### 📉 Code Reduction
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Lines** | 837 | 350 | **58% reduction** |
| **Main Component** | 837 | 150 | **82% reduction** |
| **State Variables** | 15+ | 3 | **80% reduction** |
| **CRUD Logic** | 150 lines | 15 lines | **90% reduction** |
| **Table Logic** | 80 lines | 5 lines | **94% reduction** |
| **Boilerplate** | 400 lines | 50 lines | **88% reduction** |

### ✅ Quality Improvements

**Before:**
- ❌ Hard to understand (837 lines)
- ❌ Difficult to test (everything coupled)
- ❌ Hard to modify (change affects everything)
- ❌ Code duplication across pages
- ❌ No separation of concerns

**After:**
- ✅ Easy to understand (150 lines main, 200 lines components)
- ✅ Easy to test (components & hooks isolated)
- ✅ Easy to modify (change one component)
- ✅ Reusable hooks (DRY principle)
- ✅ Clear separation of concerns

### 🚀 Developer Experience

**Before:**
```typescript
// Need to write all this for every page:
- Data loading logic
- Error handling
- Loading states
- CRUD operations
- Dialog management
- Pagination logic
- Sorting logic
- Filtering logic
```

**After:**
```typescript
// Just use hooks:
const crud = useCRUD({ ... });
const table = useDataTable({ ... });
// Done! 🎉
```

### 🔄 Reusability

Same hooks can be used for:
- ✅ Products page
- ✅ Employees page
- ✅ Customers page
- ✅ Suppliers page
- ✅ Sales page
- ✅ Any entity management page!

---

## Migration Checklist

### Step 1: Identify Patterns
- [ ] List all state variables
- [ ] Identify CRUD operations
- [ ] Find pagination/sorting/filtering logic
- [ ] Note custom business logic

### Step 2: Apply Hooks
- [ ] Replace data loading with `useCRUD`
- [ ] Replace table logic with `useDataTable`
- [ ] Keep custom filters as local state
- [ ] Keep business logic in main component

### Step 3: Extract Components
- [ ] Create Stats component
- [ ] Create Filters component
- [ ] Create Table component
- [ ] Create Dialog component
- [ ] Keep components in same folder initially

### Step 4: Test & Iterate
- [ ] Verify all functionality works
- [ ] Check error handling
- [ ] Test edge cases
- [ ] Optimize performance if needed

### Step 5: Refine
- [ ] Move components to shared if reusable
- [ ] Add tests for components
- [ ] Update documentation
- [ ] Code review

---

## Common Pitfalls

### ❌ Don't Over-Abstract
```typescript
// Bad: Too generic, hard to understand
const { everything } = useMagicHook(allTheThings);
```

```typescript
// Good: Clear purpose, easy to understand
const crud = useCRUD({ resourceName: "employee", ... });
const table = useDataTable({ data: employees, ... });
```

### ❌ Don't Break Components Too Small
```typescript
// Bad: Component for a single button
<SaveButton onClick={save} />
```

```typescript
// Good: Button inline with context
<Button onClick={save}>Save</Button>
```

### ❌ Don't Forget Custom Logic
```typescript
// Bad: Trying to force custom logic into hook
const { items } = useCRUD({
  customFilterLogic: complexBusinessRules // Hook shouldn't know this
});
```

```typescript
// Good: Custom logic in component
const { items } = useCRUD({ ... });
const filtered = useMemo(() =>
  items.filter(item => complexBusinessRules(item)),
[items]);
```

---

## Next Steps

1. **Start Small**: Refactor 1 page as proof of concept
2. **Get Feedback**: Review with team
3. **Document Patterns**: Update this guide
4. **Scale Up**: Apply to remaining pages
5. **Iterate**: Improve hooks based on usage

---

## Conclusion

This refactoring approach:
- ✅ **Reduces code by 60%**
- ✅ **Improves maintainability**
- ✅ **Enhances testability**
- ✅ **Speeds up development**
- ✅ **Makes code more consistent**

**Time Investment**: 2-3 hours per page
**Payoff**: Faster feature development, fewer bugs, easier onboarding

Happy refactoring! 🚀
