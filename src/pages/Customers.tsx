// src/pages/Customers.tsx - Refactored with Inventory-style design
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import {
  Users,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShoppingCart,
  DollarSign,
  Award,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";

const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  customer_type: z.enum(["Retail", "Wholesale", "VIP", "Corporate"]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  id: number;
  customer_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  customer_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  status: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function Customers() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    customer_type: "Retail",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const result = await invoke<Customer[]>("get_customers");
      setCustomers(result);
      toast.success(`✅ Loaded ${result.length} customers`);
    } catch (error) {
      console.error("Failed to load customers:", error);
      toast.error("❌ Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      customerSchema.parse(formData);

      if (editingCustomer) {
        await invoke("update_customer", {
          customerId: editingCustomer.id,
          request: formData,
        });
        toast.success("✅ Customer updated successfully!");
      } else {
        await invoke("create_customer", {
          request: formData,
          userId: user?.id,
        });
        toast.success("✅ Customer created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix validation errors");
      } else {
        console.error("Failed to save customer:", error);
        toast.error(`❌ Failed to save customer: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      await invoke("delete_customer", { customerId });
      toast.success("✅ Customer deleted successfully!");
      loadCustomers();
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error(`❌ Failed to delete customer: ${error}`);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      customer_type: customer.customer_type as any,
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: customer.zip_code || "",
      country: customer.country || "US",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      customer_type: "Retail",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      notes: "",
    });
    setEditingCustomer(null);
    setValidationErrors({});
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        customer.first_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        customer.phone?.includes(debouncedSearchQuery) ||
        customer.customer_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesType = filterType === "all" || customer.customer_type === filterType;
      const matchesStatus = filterStatus === "all" || customer.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, debouncedSearchQuery, filterType, filterStatus]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "Active").length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);

  const getCustomerTypeBadgeColor = (type: string) => {
    switch (type) {
      case "VIP":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Wholesale":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Corporate":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Users}
        title="Customers"
        subtitle="Manage your customer relationships and data"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={loadCustomers} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active"
          value={activeCustomers}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Total Revenue"
          value={format(totalRevenue)}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customers..."
        filters={[
          {
            placeholder: "Customer Type",
            value: filterType,
            onChange: setFilterType,
            options: [
              { label: "All Types", value: "all" },
              { label: "Retail", value: "Retail" },
              { label: "Wholesale", value: "Wholesale" },
              { label: "VIP", value: "VIP" },
              { label: "Corporate", value: "Corporate" },
            ],
          },
          {
            placeholder: "Status",
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { label: "All Status", value: "all" },
              { label: "✓ Active", value: "Active" },
              { label: "✗ Inactive", value: "Inactive" },
              { label: "⊘ Blocked", value: "Blocked" },
            ],
          },
        ]}
      />

      {/* Customers Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
          <CardTitle className="flex items-center text-sm sm:text-base">
            <Users className="w-4 h-4 mr-2 text-primary" />
            Customer Directory
            <Badge className="ml-2 text-xs" variant="secondary">
              {filteredCustomers.length}
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
              {filteredCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Customer</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                          Type
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right hidden xl:table-cell">
                          Orders
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Spent</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Status</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="hover:bg-muted/50 transition-colors border-b h-12"
                        >
                          <TableCell className="py-2 px-2 sm:px-4">
                            <div>
                              <div className="text-xs sm:text-sm font-medium">
                                {customer.first_name} {customer.last_name}
                              </div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground">
                                #{customer.customer_number}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 hidden md:table-cell">
                            <div className="space-y-0.5 text-[10px] sm:text-xs">
                              {customer.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 hidden lg:table-cell">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 h-5 ${getCustomerTypeBadgeColor(
                                customer.customer_type
                              )}`}
                            >
                              {customer.customer_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-xs hidden xl:table-cell">
                            {customer.total_orders}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right text-sm font-bold text-primary">
                            {format(customer.total_spent)}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4">
                            <Badge
                              variant={customer.status === "Active" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 h-5"
                            >
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-right">
                            <TableActions
                              actions={[
                                {
                                  label: "Edit Customer",
                                  icon: Edit,
                                  onClick: () => openEditDialog(customer),
                                },
                                {
                                  label: "Delete Customer",
                                  icon: Trash2,
                                  onClick: () => handleDelete(customer.id),
                                  variant: "destructive",
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
                  <h3 className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">No Customers Found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {debouncedSearchQuery || filterType !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first customer to get started"}
                  </p>
                  {!debouncedSearchQuery && filterType === "all" && filterStatus === "all" && (
                    <Button onClick={openCreateDialog} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter customer details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs sm:text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs sm:text-sm">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs sm:text-sm">
                Company
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_type" className="text-xs sm:text-sm">
                Customer Type
              </Label>
              <Select
                value={formData.customer_type}
                onValueChange={(value: any) => setFormData({ ...formData, customer_type: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address" className="text-xs sm:text-sm">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs sm:text-sm">
                City
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-xs sm:text-sm">
                State
              </Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
