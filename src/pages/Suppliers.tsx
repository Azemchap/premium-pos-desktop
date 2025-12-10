// src/pages/Suppliers.tsx - Optimized Mobile-First with Pagination
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

const ITEMS_PER_PAGE = 10;

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

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
    setCurrentPage(1);
  }, [searchQuery, suppliers]);

  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => s.is_active).length,
    avgRating: suppliers.length > 0
      ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.filter(s => s.rating).length).toFixed(1)
      : "0.0",
  };

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCreate = async () => {
    if (!formData.company_name) {
      toast.error("Company name is required");
      return;
    }

    try {
      setSubmitting(true);
      await invoke("create_supplier", { request: formData });
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

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      setSubmitting(true);
      await invoke("delete_supplier", { supplierId: selectedSupplier.id });
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

  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

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

  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none px-3 py-2 sm:px-6 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Building2}
          title="Suppliers"
          subtitle="Manage supplier relationships and procurement"
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11 touch-manipulation">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          }
        />
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-6 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Total Suppliers</p>
                    <p className="text-3xl font-bold mt-1 truncate">{stats.total}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Active</p>
                    <p className="text-3xl font-bold mt-1 truncate">{stats.active}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Avg Rating</p>
                    <p className="text-3xl font-bold mt-1 truncate">{stats.avgRating}</p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="border-2">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 touch-manipulation"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-manipulation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-11 touch-manipulation">
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
            <Card className="border-2">
              <CardContent className="p-3">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredSuppliers.length === 0 ? (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold mb-2">No suppliers found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first supplier"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11 touch-manipulation">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-2">
                <CardHeader className="border-b p-3">
                  <CardTitle className="text-base">
                    {filteredSuppliers.length} Supplier{filteredSuppliers.length !== 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {paginatedSuppliers.map((supplier) => (
                      <div key={supplier.id} className="p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm line-clamp-1">{supplier.company_name}</h4>
                              <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-[10px]">
                                {supplier.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {renderRating(supplier.rating)}
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span className="font-mono">{supplier.supplier_number}</span>
                              {supplier.contact_name && <span>{supplier.contact_name}</span>}
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {supplier.email && <span className="truncate">{supplier.email}</span>}
                                {supplier.phone && <span>{supplier.phone}</span>}
                              </div>
                            </div>
                            {supplier.payment_terms && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Terms: </span>
                                <Badge variant="outline" className="text-[10px] font-medium">
                                  {supplier.payment_terms}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(supplier)}
                              className="h-9 w-9 touch-manipulation"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(supplier)}
                              className="h-9 w-9 hover:text-destructive touch-manipulation"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-11 w-11 touch-manipulation"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-11 w-11 touch-manipulation"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl p-0 gap-0 flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">
              {isEditDialogOpen ? "Edit Supplier" : "New Supplier"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEditDialogOpen ? "Update supplier information" : "Enter supplier details"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Supplies Inc"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.com"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://supplier.com"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Zip Code</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="10001"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tax ID</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="XX-XXXXXXX"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Net 30"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Rating (1-5)</Label>
                <Select
                  value={formData.rating?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rating: value ? parseInt(value) : undefined })
                  }
                >
                  <SelectTrigger className="h-11 touch-manipulation">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
              className="flex-1 h-11 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={submitting || !formData.company_name}
              className="flex-1 h-11 touch-manipulation"
            >
              {submitting ? "Saving..." : isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Delete {selectedSupplier?.company_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 h-11 touch-manipulation">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="flex-1 h-11 touch-manipulation">
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}