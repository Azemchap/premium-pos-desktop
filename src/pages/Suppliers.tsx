import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import TableActions from "@/components/TableActions";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Compute filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;

    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (supplier) =>
        supplier.company_name.toLowerCase().includes(query) ||
        supplier.contact_name?.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query) ||
        supplier.phone?.includes(query) ||
        supplier.supplier_number.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  // Compute stats
  const stats = useMemo(() => {
    const activeSuppliers = suppliers.filter((s) => s.is_active);
    const suppliersWithRatings = suppliers.filter((s) => s.rating);
    const avgRating =
      suppliersWithRatings.length > 0
        ? (suppliersWithRatings.reduce((sum, s) => sum + (s.rating || 0), 0) /
            suppliersWithRatings.length).toFixed(1)
        : "0.0";

    return {
      total: suppliers.length,
      active: activeSuppliers.length,
      avgRating,
    };
  }, [suppliers]);

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
    if (!rating) {
      return <span className="text-xs text-muted-foreground">No rating</span>;
    }
    return (
      <div className="flex items-center gap-0.5">
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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Building2}
          title="Suppliers"
          subtitle="Manage supplier relationships and procurement"
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Supplier</span>
              <span className="sm:hidden">Add</span>
            </Button>
          }
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Total Suppliers"
              value={stats.total}
              icon={Building2}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Active"
              value={stats.active}
              icon={CheckCircle}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <StatCard
              title="Avg Rating"
              value={stats.avgRating}
              icon={Star}
              gradient="bg-gradient-to-br from-yellow-500 to-orange-600"
            />
          </div>

          {/* Filter Bar */}
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search suppliers..."
            filters={[
              {
                placeholder: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ],
              },
            ]}
          />

          {/* Suppliers Table */}
          <Card className="shadow-md">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">No suppliers found</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Get started by adding your first supplier"}
                  </p>
                  {!searchQuery && statusFilter === "all" && (
                    <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Supplier
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Company</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                          Location
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden xl:table-cell">
                          Payment Terms
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Rating</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Status</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="hover:bg-muted/50">
                          <TableCell className="px-2 sm:px-4 py-2">
                            <div className="flex flex-col gap-1">
                              <p className="font-medium text-xs sm:text-sm line-clamp-1">
                                {supplier.company_name}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                                {supplier.supplier_number}
                              </p>
                              {/* Mobile: Show contact inline */}
                              <div className="flex flex-col gap-0.5 md:hidden text-[10px] text-muted-foreground">
                                {supplier.contact_name && (
                                  <span className="line-clamp-1">{supplier.contact_name}</span>
                                )}
                                {supplier.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="line-clamp-1">{supplier.email}</span>
                                  </div>
                                )}
                                {supplier.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{supplier.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              {supplier.contact_name && (
                                <p className="text-xs font-medium line-clamp-1">
                                  {supplier.contact_name}
                                </p>
                              )}
                              <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                                {supplier.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="line-clamp-1">{supplier.email}</span>
                                  </div>
                                )}
                                {supplier.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{supplier.phone}</span>
                                  </div>
                                )}
                                {supplier.website && (
                                  <div className="flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    <span className="line-clamp-1">{supplier.website}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                              {supplier.city && supplier.state ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>
                                    {supplier.city}, {supplier.state}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              {supplier.country && (
                                <span className="ml-4">{supplier.country}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden xl:table-cell">
                            {supplier.payment_terms ? (
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {supplier.payment_terms}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2">
                            {renderRating(supplier.rating)}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2">
                            <Badge
                              variant={supplier.is_active ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {supplier.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-right">
                            <TableActions
                              actions={[
                                {
                                  label: "Edit",
                                  icon: Edit,
                                  onClick: () => openEditDialog(supplier),
                                },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => openDeleteDialog(supplier),
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
              )}
            </CardContent>
          </Card>
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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-none">
            <DialogTitle className="text-base sm:text-lg">
              {isEditDialogOpen ? "Edit Supplier" : "New Supplier"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isEditDialogOpen ? "Update supplier information" : "Enter supplier details"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs sm:text-sm font-medium">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Supplies Inc"
                  className="h-9"
                />
              </div>

              {/* Contact Name */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Doe"
                  className="h-9"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.com"
                  className="h-9"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="h-9"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://supplier.com"
                  className="h-9"
                />
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs sm:text-sm font-medium">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                  className="h-9"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                  className="h-9"
                />
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                  className="h-9"
                />
              </div>

              {/* Zip Code */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Zip Code</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="10001"
                  className="h-9"
                />
              </div>

              {/* Tax ID */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Tax ID</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="XX-XXXXXXX"
                  className="h-9"
                />
              </div>

              {/* Payment Terms */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs sm:text-sm font-medium">Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Net 30"
                  className="h-9"
                />
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Rating (1-5)</Label>
                <Select
                  value={formData.rating?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rating: value ? parseInt(value) : undefined })
                  }
                >
                  <SelectTrigger className="h-9">
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

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs sm:text-sm font-medium">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-none border-t px-4 sm:px-6 py-3 sm:py-4 flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={submitting || !formData.company_name}
              className="flex-1 h-9"
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
            <AlertDialogDescription className="text-xs sm:text-sm">
              Delete {selectedSupplier?.company_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="flex-1 h-9">
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
