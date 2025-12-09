// src/pages/Customers.tsx - Customer Management with full CRUD
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Award,
  Filter,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";

export default function Customers() {
  const { user } = useAuthStore();
  const { format } = useCurrency();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<CreateCustomerRequest>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    customer_type: "Retail",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await invoke<Customer[]>("get_customers", {
        status: statusFilter === "all" ? undefined : statusFilter,
        customerType: typeFilter === "all" ? undefined : typeFilter,
      });
      setCustomers(data);
      filterCustomers(data, searchQuery);
    } catch (error) {
      console.error("Failed to load customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [statusFilter, typeFilter]);

  // Filter customers based on search query
  const filterCustomers = (data: Customer[], query: string) => {
    if (!query.trim()) {
      setFilteredCustomers(data);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = data.filter(
      (customer) =>
        customer.first_name.toLowerCase().includes(lowercaseQuery) ||
        customer.last_name.toLowerCase().includes(lowercaseQuery) ||
        customer.email?.toLowerCase().includes(lowercaseQuery) ||
        customer.phone?.includes(query) ||
        customer.customer_number.toLowerCase().includes(lowercaseQuery) ||
        customer.company?.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredCustomers(filtered);
  };

  useEffect(() => {
    filterCustomers(customers, searchQuery);
  }, [searchQuery, customers]);

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "Active").length,
    totalSpent: customers.reduce((sum, c) => sum + c.total_spent, 0),
    totalOrders: customers.reduce((sum, c) => sum + c.total_orders, 0),
  };

  // Create customer
  const handleCreate = async () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error("First name and last name are required");
      return;
    }

    try {
      setSubmitting(true);
      await invoke("create_customer", {
        request: formData,
        userId: user?.id,
      });
      toast.success("Customer created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error: unknown) {
      console.error("Failed to create customer:", error);
      toast.error(typeof error === "string" ? error : "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Update customer
  const handleUpdate = async () => {
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      const updateData: UpdateCustomerRequest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        customer_type: formData.customer_type,
        notes: formData.notes,
      };

      await invoke("update_customer", {
        customerId: selectedCustomer.id,
        request: updateData,
      });
      toast.success("Customer updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error: unknown) {
      console.error("Failed to update customer:", error);
      toast.error(typeof error === "string" ? error : "Failed to update customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete customer
  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      await invoke("delete_customer", {
        customerId: selectedCustomer.id,
      });
      toast.success("Customer deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error: unknown) {
      console.error("Failed to delete customer:", error);
      toast.error(typeof error === "string" ? error : "Failed to delete customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: customer.zip_code || "",
      country: customer.country || "US",
      customer_type: customer.customer_type,
      notes: customer.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      customer_type: "Retail",
      notes: "",
    });
    setSelectedCustomer(null);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "Blocked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get customer type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case "VIP":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "Corporate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Wholesale":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer information and relationships
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Customers</p>
                <p className="text-lg font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Active</p>
                <p className="text-lg font-bold mt-1">{stats.active}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Revenue</p>
                <p className="text-lg font-bold mt-1">{format(stats.totalSpent)}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Orders</p>
                <p className="text-lg font-bold mt-1">{stats.totalOrders}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or customer number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {loading ? (
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first customer"}
            </p>
            {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">
              {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-sm">
                          {customer.first_name} {customer.last_name}
                        </h4>
                        <Badge className={`text-xs ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </Badge>
                        <Badge className={`text-xs ${getTypeColor(customer.customer_type)}`}>
                          {customer.customer_type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{customer.customer_number}</span>
                        {customer.email && <span>{customer.email}</span>}
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.company && <span>{customer.company}</span>}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">
                          Orders: <span className="font-medium text-foreground">{customer.total_orders}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Spent: <span className="font-medium text-foreground">{format(customer.total_spent)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Points: <span className="font-medium text-foreground">{customer.loyalty_points}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(customer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(customer)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isEditDialogOpen ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditDialogOpen
                ? "Update customer information"
                : "Enter customer details to create a new record"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="company" className="text-sm">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address" className="text-sm">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code" className="text-sm">Zip Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="10001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_type" className="text-sm">Customer Type</Label>
              <Select
                value={formData.customer_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, customer_type: value as typeof formData.customer_type })
                }
              >
                <SelectTrigger>
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
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this customer..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={submitting || !formData.first_name || !formData.last_name}
            >
              {submitting ? "Saving..." : isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete {selectedCustomer?.first_name}{" "}
              {selectedCustomer?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
