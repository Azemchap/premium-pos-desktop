// src/pages/Employees.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  UserCog,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Briefcase,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Zod validation schema
const employeeSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100, "Name is too long"),
  last_name: z.string().min(1, "Last name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
  phone: z.string().min(1, "Phone is required").max(20, "Phone is too long"),
  position: z.string().min(1, "Position is required").max(100, "Position is too long"),
  department: z.string().max(100, "Department is too long").optional(),
  hire_date: z.string().min(1, "Hire date is required"),
  salary: z.number().min(0, "Salary must be positive"),
  employment_type: z.enum(["Full-Time", "Part-Time", "Contract", "Intern"]),
  address: z.string().max(500, "Address is too long").optional(),
  emergency_contact: z.string().max(255, "Emergency contact is too long").optional(),
  emergency_phone: z.string().max(20, "Emergency phone is too long").optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department?: string;
  hire_date: string;
  salary: number;
  employment_type: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Employees() {
  const { format } = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    hire_date: new Date().toISOString().split('T')[0],
    salary: 0,
    employment_type: "Full-Time",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<{ id: number, name: string } | null>(null);
  const [employeeToReactivate, setEmployeeToReactivate] = useState<{ id: number, name: string } | null>(null);

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

  const validateForm = (): boolean => {
    try {
      employeeSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
      }
      return false;
    }
  };

  const handleCreateEmployee = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        await invoke("update_employee", {
          employeeId: editingEmployee.id,
          request: formData,
        });
        toast.success(`✅ Employee "${formData.first_name} ${formData.last_name}" updated successfully!`);
      } else {
        await invoke("create_employee", {
          request: formData,
        });
        toast.success(`✅ Employee "${formData.first_name} ${formData.last_name}" created successfully!`);
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

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      department: employee.department || "",
      hire_date: employee.hire_date,
      salary: employee.salary,
      employment_type: employee.employment_type as any,
      address: employee.address || "",
      emergency_contact: employee.emergency_contact || "",
      emergency_phone: employee.emergency_phone || "",
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteEmployee = (employeeId: number, employeeName: string) => {
    setEmployeeToDeactivate({ id: employeeId, name: employeeName });
  };

  const executeDeactivateEmployee = async () => {
    if (!employeeToDeactivate) return;

    try {
      await invoke("delete_employee", { employeeId: employeeToDeactivate.id });
      toast.success(`Employee "${employeeToDeactivate.name}" deactivated successfully!`);
      loadEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      toast.error(`Failed to deactivate employee: ${error}`);
    } finally {
      setEmployeeToDeactivate(null);
    }
  };

  const handleReactivateEmployee = (employeeId: number, employeeName: string) => {
    setEmployeeToReactivate({ id: employeeId, name: employeeName });
  };

  const executeReactivateEmployee = async () => {
    if (!employeeToReactivate) return;

    try {
      await invoke("reactivate_employee", { employeeId: employeeToReactivate.id });
      toast.success(`✅ Employee "${employeeToReactivate.name}" reactivated successfully!`);
      loadEmployees();
    } catch (error) {
      console.error("Failed to reactivate employee:", error);
      toast.error(`❌ Failed to reactivate employee: ${error}`);
    } finally {
      setEmployeeToReactivate(null);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      hire_date: new Date().toISOString().split('T')[0],
      salary: 0,
      employment_type: "Full-Time",
      address: "",
      emergency_contact: "",
      emergency_phone: "",
    });
    setEditingEmployee(null);
    setValidationErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Auto-filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        employee.first_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
      const matchesEmploymentType = selectedEmploymentType === "all" || employee.employment_type === selectedEmploymentType;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);

      return matchesSearch && matchesDepartment && matchesEmploymentType && matchesStatus;
    });
  }, [employees, debouncedSearchQuery, selectedDepartment, selectedEmploymentType, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, []);

  // Statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.is_active).length;
  const inactiveEmployees = employees.filter((e) => !e.is_active).length;

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts);
  }, [employees]);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={UserCog}
        title="Employees"
        subtitle="Manage your employees"
        actions={
          <Button onClick={openCreateDialog} size="sm" className="shadow-md">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Total</p>
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalEmployees}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <UserCog className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Active</p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{activeEmployees}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-200 dark:border-red-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Inactive</p>
                <p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-100">{inactiveEmployees}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:col-span-4">
              <Label htmlFor="search" className="text-xs">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs">
                  Department
                </Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept!}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employment-type" className="text-xs">
                  Employment Type
                </Label>
                <Select value={selectedEmploymentType} onValueChange={setSelectedEmploymentType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            Showing {filteredEmployees.length} of {totalEmployees} employees
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
          <CardTitle className="text-lg font-bold">Employee Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2 md:space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                      <TableRow>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                          Employee
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                          Position
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden xl:table-cell">
                          Employment
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredEmployees.map((employee) => (
                        <TableRow
                          key={employee.id}
                          className={`hover:bg-primary/5 transition-all duration-200 ${!employee.is_active ? "opacity-60" : ""
                            }`}
                        >
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src="" alt={`${employee.first_name} ${employee.last_name}`} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-sm">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground lg:hidden">
                                  {employee.position}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span className="truncate max-w-[180px]">{employee.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {employee.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden lg:table-cell">
                            <div>
                              <div className="font-medium text-sm">{employee.position}</div>
                              {employee.department && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Briefcase className="w-3 h-3" />
                                  {employee.department}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden xl:table-cell">
                            <div>
                              <Badge variant="outline" className="text-xs mb-1">
                                {employee.employment_type}
                              </Badge>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Since {new Date(employee.hire_date).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden md:table-cell">
                            <Badge variant={employee.is_active ? "default" : "secondary"} className="px-2 py-0.5 text-xs">
                              {employee.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Actions">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {employee.is_active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteEmployee(employee.id, `${employee.first_name} ${employee.last_name}`)}
                                    className="text-destructive"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleReactivateEmployee(employee.id, `${employee.first_name} ${employee.last_name}`)}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {!loading && filteredEmployees.length === 0 && (
            <div className="text-center py-6 md:py-12">
              <UserCog className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No employees found</h3>
              <p className="text-muted-foreground mb-2 md:mb-4 text-sm">
                {searchQuery || selectedDepartment !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first employee"}
              </p>
              {!searchQuery && selectedDepartment === "all" && (
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingEmployee
                ? "Update the employee information below."
                : "Fill in the employee details to add them to your directory."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
            {/* Personal Information */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-medium">
                  First Name *
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  className={`h-9 text-sm ${validationErrors.first_name ? "border-red-500" : ""}`}
                />
                {validationErrors.first_name && <p className="text-xs text-red-500">{validationErrors.first_name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-medium">
                  Last Name *
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  className={`h-9 text-sm ${validationErrors.last_name ? "border-red-500" : ""}`}
                />
                {validationErrors.last_name && <p className="text-xs text-red-500">{validationErrors.last_name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="employee@example.com"
                  className={`h-9 text-sm ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Phone *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className={`h-9 text-sm ${validationErrors.phone ? "border-red-500" : ""}`}
                />
                {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-medium">
                  Position *
                </Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Sales Associate"
                  className={`h-9 text-sm ${validationErrors.position ? "border-red-500" : ""}`}
                />
                {validationErrors.position && <p className="text-xs text-red-500">{validationErrors.position}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-medium">
                  Department
                </Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, IT"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employment_type" className="text-xs font-medium">
                  Employment Type *
                </Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hire_date" className="text-xs font-medium">
                  Hire Date *
                </Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className={`h-9 text-sm ${validationErrors.hire_date ? "border-red-500" : ""}`}
                />
                {validationErrors.hire_date && <p className="text-xs text-red-500">{validationErrors.hire_date}</p>}
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-3 md:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="salary" className="text-xs font-medium">
                  Salary
                </Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address (optional)"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_contact" className="text-xs font-medium">
                    Emergency Contact Name
                  </Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="Emergency contact name"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergency_phone" className="text-xs font-medium">
                    Emergency Contact Phone
                  </Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                    placeholder="Emergency contact phone"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingEmployee ? (
                "Update Employee"
              ) : (
                "Add Employee"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!employeeToDeactivate}
        onOpenChange={(open) => !open && setEmployeeToDeactivate(null)}
        title="Deactivate Employee"
        description={`Are you sure you want to deactivate "${employeeToDeactivate?.name}"?`}
        onConfirm={executeDeactivateEmployee}
        confirmText="Deactivate"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!employeeToReactivate}
        onOpenChange={(open) => !open && setEmployeeToReactivate(null)}
        title="Reactivate Employee"
        description={`Are you sure you want to reactivate "${employeeToReactivate?.name}"?`}
        onConfirm={executeReactivateEmployee}
        confirmText="Reactivate"
      />
    </div >
  );
}
