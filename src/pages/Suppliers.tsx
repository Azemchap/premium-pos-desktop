// src/pages/Suppliers.tsx - Supplier Management with full CRUD
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from "@/types";
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
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  Filter,
  X,
  CheckCircle,
} from "lucide-react";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<CreateSupplierRequest>>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    payment_terms: "",
    tax_id: "",
    notes: "",
    rating: undefined,
  });

  const [submitting, setSubmitting] = useState(false);

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await invoke<Supplier[]>("get_suppliers", {
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      });
      setSuppliers(data);
      filterSuppliers(data, searchQuery);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [statusFilter]);

  // Filter suppliers based on search query
  const filterSuppliers = (data: Supplier[], query: string) => {
    if (!query.trim()) {
      setFilteredSuppliers(data);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = data.filter(
      (supplier) =>
        supplier.company_name.toLowerCase().includes(lowercaseQuery) ||
        supplier.contact_name?.toLowerCase().includes(lowercaseQuery) ||
        supplier.email?.toLowerCase().includes(lowercaseQuery) ||
        supplier.phone?.includes(query) ||
        supplier.supplier_number.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredSuppliers(filtered);
  };

  useEffect(() => {
    filterSuppliers(suppliers, searchQuery);
  }, [searchQuery, suppliers]);

  // Calculate stats
  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => s.is_active).length,
    avgRating: suppliers.length > 0
      ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.filter(s => s.rating).length).toFixed(1)
      : "0.0",
  };

  // Create supplier
  const handleCreate = async () => {
    if (!formData.company_name) {
      toast.error("Company name is required");
      return;
    }

    try {
      setSubmitting(true);
      await invoke("create_supplier", {
        request: formData,
      });
      toast.success("Supplier created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadSuppliers();
    } catch (error: unknown) {
      console.error("Failed to create supplier:", error);
      toast.error(typeof error === "string" ? error : "Failed to create supplier");
    } finally {
      setSubmitting(false);
    }
  };

  // Update supplier
  const handleUpdate = async () => {
    if (!selectedSupplier) return;

    try {
      setSubmitting(true);
      const updateData: UpdateSupplierRequest = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        payment_terms: formData.payment_terms,
        tax_id: formData.tax_id,
        notes: formData.notes,
        rating: formData.rating,
      };

      await invoke("update_supplier", {
        supplierId: selectedSupplier.id,
        request: updateData,
      });
      toast.success("Supplier updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      loadSuppliers();
    } catch (error: unknown) {
      console.error("Failed to update supplier:", error);
      toast.error(typeof error === "string" ? error : "Failed to update supplier");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete supplier
  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      setSubmitting(true);
      await invoke("delete_supplier", {
        supplierId: selectedSupplier.id,
      });
      toast.success("Supplier deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
      loadSuppliers();
    } catch (error: unknown) {
      console.error("Failed to delete supplier:", error);
      toast.error(typeof error === "string" ? error : "Failed to delete supplier");
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      company_name: supplier.company_name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      website: supplier.website || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      zip_code: supplier.zip_code || "",
      country: supplier.country || "US",
      payment_terms: supplier.payment_terms || "",
      tax_id: supplier.tax_id || "",
      notes: supplier.notes || "",
      rating: supplier.rating,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      payment_terms: "",
      tax_id: "",
      notes: "",
      rating: undefined,
    });
    setSelectedSupplier(null);
  };

  // Render rating stars
  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage supplier relationships and procurement
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Suppliers</p>
                <p className="text-lg font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
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
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Avg Rating</p>
                <p className="text-lg font-bold mt-1">{stats.avgRating}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Star className="w-5 h-5 text-white" />
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
                placeholder="Search by company, contact, email, phone, or number..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
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
      ) : filteredSuppliers.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first supplier"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">
              {filteredSuppliers.length} Supplier{filteredSuppliers.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-sm">{supplier.company_name}</h4>
                        <Badge
                          className={`text-xs ${
                            supplier.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {supplier.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {renderRating(supplier.rating)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{supplier.supplier_number}</span>
                        {supplier.contact_name && <span>{supplier.contact_name}</span>}
                        {supplier.email && <span>{supplier.email}</span>}
                        {supplier.phone && <span>{supplier.phone}</span>}
                      </div>
                      {supplier.payment_terms && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Payment Terms: </span>
                          <span className="font-medium">{supplier.payment_terms}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(supplier)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(supplier)}
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
              {isEditDialogOpen ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditDialogOpen
                ? "Update supplier information"
                : "Enter supplier details to create a new record"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="company_name" className="text-sm">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Acme Supplies Inc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@supplier.com"
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
            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://supplier.com"
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
              <Label htmlFor="tax_id" className="text-sm">Tax ID</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="payment_terms" className="text-sm">Payment Terms</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Net 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating" className="text-sm">Rating (1-5)</Label>
              <Select
                value={formData.rating?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, rating: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No rating</SelectItem>
                  <SelectItem value="1">⭐ 1 Star</SelectItem>
                  <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this supplier..."
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
              disabled={submitting || !formData.company_name}
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
            <AlertDialogTitle className="text-lg">Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete {selectedSupplier?.company_name}? This action
              cannot be undone.
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
