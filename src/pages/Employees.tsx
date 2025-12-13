// src/pages/Employees.tsx - Refactored with Inventory-style design
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import TableActions from "@/components/TableActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle,
  Edit,
  Loader2,
  Plus,
  UserCog,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const employeeSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  position: z.string().min(1, "Position is required"),
  department: z.string().optional(),
  hire_date: z.string().min(1, "Hire date is required"),
  salary: z.number().min(0, "Salary must be positive"),
  employment_type: z.enum(["Full-time", "Part-time", "Contract", "Intern"]),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Employee {
  id: number;
  user_id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  employment_type: string;
  salary_type: string;
  hourly_rate: number;
  salary: number;
  commission_rate: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
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
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterEmploymentType, setFilterEmploymentType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<EmployeeFormData>({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    position: "",
    department: "",
    hire_date: "",
    salary: 0,
    employment_type: "Full-time",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const result = await invoke<Employee[]>("get_employees");
      setEmployees(result);
      toast.success(`✅ Loaded ${result.length} employees`);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("❌ Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      employeeSchema.parse(formData);

      if (editingEmployee) {
        // Update existing employee
        await invoke("update_employee", {
          employeeId: editingEmployee.id,
          request: {
            department: formData.department,
            position: formData.position,
            hire_date: formData.hire_date,
            employment_type: formData.employment_type,
            salary_type: "Salary",
            hourly_rate: 0,
            salary: formData.salary,
            commission_rate: 0,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone,
            notes: formData.notes,
          },
        });
        toast.success("✅ Employee updated successfully!");
      } else {
        // Create new user first
        if (!formData.password) {
          toast.error("❌ Password is required for new employees");
          return;
        }

        const user = await invoke<{ id: number }>("create_user", {
          request: {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: "Cashier", // Default role, can be changed later
          },
        });

        // Then create employee record
        await invoke("create_employee", {
          request: {
            user_id: user.id,
            department: formData.department,
            position: formData.position,
            hire_date: formData.hire_date,
            employment_type: formData.employment_type,
            salary_type: "Salary",
            hourly_rate: 0,
            salary: formData.salary,
            commission_rate: 0,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone,
            notes: formData.notes,
          },
        });
        toast.success("✅ Employee created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadEmployees();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix validation errors");
      } else {
        console.error("Failed to save employee:", error);
        toast.error(`❌ Failed to save employee: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (employeeId: number) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;

    try {
      await invoke("delete_employee", { employeeId });
      toast.success("✅ Employee deactivated successfully!");
      loadEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      toast.error(`❌ Failed to delete employee: ${error}`);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      username: employee.username,
      password: "", // Don't show existing password
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      position: employee.position || "",
      department: employee.department || "",
      hire_date: employee.hire_date || "",
      salary: employee.salary,
      employment_type: employee.employment_type as any,
      emergency_contact_name: employee.emergency_contact_name || "",
      emergency_contact_phone: employee.emergency_contact_phone || "",
      notes: employee.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      position: "",
      department: "",
      hire_date: "",
      salary: 0,
      employment_type: "Full-time",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: "",
    });
    setEditingEmployee(null);
    setValidationErrors({});
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        employee.first_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.position?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        employee.employee_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesDepartment =
        filterDepartment === "all" || employee.department === filterDepartment;

      const matchesEmploymentType =
        filterEmploymentType === "all" || employee.employment_type === filterEmploymentType;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && employee.is_active) ||
        (filterStatus === "inactive" && !employee.is_active);

      return matchesSearch && matchesDepartment && matchesEmploymentType && matchesStatus;
    });
  }, [employees, debouncedSearchQuery, filterDepartment, filterEmploymentType, filterStatus]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.is_active).length;
  const inactiveEmployees = totalEmployees - activeEmployees;

  const getEmploymentTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Full-time":
        return "bg-green-100 text-green-700 border-green-200";
      case "Part-time":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Contract":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Intern":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Users}
        title="Employees"
        subtitle="Manage your team members and their information"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={loadEmployees} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Statistics - Compact & Responsive */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <StatCard
          title="Total"
          value={totalEmployees}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active"
          value={activeEmployees}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Inactive"
          value={inactiveEmployees}
          icon={XCircle}
          gradient="bg-gradient-to-br from-red-500 to-pink-600"
        />
        <StatCard
          title="Full-Time"
          value={employees.filter((e) => e.employment_type === "Full-time").length}
          icon={Briefcase}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          colSpan="col-span-2 sm:col-span-1"
        />
        <StatCard
          title="Departments"
          value={departments.length}
          icon={UserCog}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search employees..."
        filters={[
          {
            placeholder: "All Departments",
            value: filterDepartment,
            onChange: setFilterDepartment,
            options: [
              { label: "All Departments", value: "all" },
              ...departments.map((dept) => ({ label: dept!, value: dept! })),
            ],
          },
          {
            placeholder: "Employment Type",
            value: filterEmploymentType,
            onChange: setFilterEmploymentType,
            options: [
              { label: "All Types", value: "all" },
              { label: "Full-time", value: "Full-time" },
              { label: "Part-time", value: "Part-time" },
              { label: "Contract", value: "Contract" },
              { label: "Intern", value: "Intern" },
            ],
          },
          {
            placeholder: "Status",
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { label: "All Status", value: "all" },
              { label: "✓ Active", value: "active" },
              { label: "✗ Inactive", value: "inactive" },
            ],
          },
        ]}
      />

      {/* Employees Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
          <CardTitle className="flex items-center text-sm sm:text-base">
            <Users className="w-4 h-4 mr-2 text-primary" />
            Team Members
            <Badge className="ml-2 text-xs" variant="secondary">
              {filteredEmployees.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-3">
          {loading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {filteredEmployees.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Employee</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Position</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                          Type
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Status</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow
                          key={employee.id}
                          className="hover:bg-muted/50 transition-colors border-b h-12"
                        >
                          <TableCell className="py-2 px-2 sm:px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {employee.first_name[0]}
                                  {employee.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-xs sm:text-sm font-medium">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">
                                  #{employee.employee_number}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 hidden md:table-cell">
                            <div className="space-y-0.5 text-[10px] sm:text-xs">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {employee.email}
                              </div>
                              {employee.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  {employee.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4">
                            <div>
                              <div className="text-xs sm:text-sm font-medium">
                                {employee.position || "—"}
                              </div>
                              {employee.department && (
                                <div className="text-[10px] sm:text-xs text-muted-foreground">
                                  {employee.department}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 hidden lg:table-cell">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 h-5 ${getEmploymentTypeBadgeColor(
                                employee.employment_type
                              )}`}
                            >
                              {employee.employment_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4">
                            <Badge
                              variant={employee.is_active ? "default" : "secondary"}
                              className="text-[10px] px-1.5 h-5"
                            >
                              {employee.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right">
                            <TableActions
                              actions={[
                                {
                                  label: "Edit Employee",
                                  icon: Edit,
                                  onClick: () => openEditDialog(employee),
                                },
                                {
                                  label: employee.is_active ? "Deactivate" : "Reactivate",
                                  icon: employee.is_active ? UserMinus : RotateCcw,
                                  onClick: () => handleDelete(employee.id),
                                  variant: employee.is_active ? "destructive" : "default",
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 md:py-12">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">
                    No Employees Found
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {debouncedSearchQuery ||
                      filterDepartment !== "all" ||
                      filterEmploymentType !== "all" ||
                      filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first employee to get started"}
                  </p>
                  {!debouncedSearchQuery &&
                    filterDepartment === "all" &&
                    filterEmploymentType === "all" &&
                    filterStatus === "all" && (
                      <Button onClick={openCreateDialog} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Employee
                      </Button>
                    )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter employee details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {!editingEmployee && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs sm:text-sm">
                    Username *
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`h-9 ${validationErrors.username ? "border-red-500" : ""}`}
                  />
                  {validationErrors.username && (
                    <p className="text-xs text-red-500">{validationErrors.username}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs sm:text-sm">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`h-9 ${validationErrors.password ? "border-red-500" : ""}`}
                  />
                  {validationErrors.password && (
                    <p className="text-xs text-red-500">{validationErrors.password}</p>
                  )}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs sm:text-sm">
                First Name *
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className={`h-9 ${validationErrors.first_name ? "border-red-500" : ""}`}
              />
              {validationErrors.first_name && (
                <p className="text-xs text-red-500">{validationErrors.first_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs sm:text-sm">
                Last Name *
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className={`h-9 ${validationErrors.last_name ? "border-red-500" : ""}`}
              />
              {validationErrors.last_name && (
                <p className="text-xs text-red-500">{validationErrors.last_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs sm:text-sm">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`h-9 ${validationErrors.email ? "border-red-500" : ""}`}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-xs sm:text-sm">
                Position *
              </Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className={`h-9 ${validationErrors.position ? "border-red-500" : ""}`}
              />
              {validationErrors.position && (
                <p className="text-xs text-red-500">{validationErrors.position}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs sm:text-sm">
                Department
              </Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employment_type" className="text-xs sm:text-sm">
                Employment Type *
              </Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, employment_type: value })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hire_date" className="text-xs sm:text-sm">
                Hire Date *
              </Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className={`h-9 ${validationErrors.hire_date ? "border-red-500" : ""}`}
              />
              {validationErrors.hire_date && (
                <p className="text-xs text-red-500">{validationErrors.hire_date}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary" className="text-xs sm:text-sm">
                Salary
              </Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact" className="text-xs sm:text-sm">
                Emergency Contact
              </Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_name: e.target.value })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency_phone" className="text-xs sm:text-sm">
                Emergency Phone
              </Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_contact_phone}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_phone: e.target.value })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
