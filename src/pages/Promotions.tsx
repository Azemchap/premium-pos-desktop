// src/pages/Promotions.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle,
  Edit,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Percent,
  Plus,
  Search,
  Tag,
  TrendingUp,
  XCircle,
  Calendar,
  Gift,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

// Zod validation schema
const promotionSchema = z.object({
  name: z.string().min(1, "Promotion name is required").max(255, "Name is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  promotion_type: z.enum(["percentage", "fixed_amount", "buy_x_get_y", "bundle"]),
  discount_value: z.number().min(0, "Discount value must be positive"),
  min_purchase_amount: z.number().min(0, "Minimum purchase amount must be positive"),
  max_discount_amount: z.number().min(0, "Maximum discount amount must be positive").optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  usage_limit: z.number().min(0, "Usage limit must be positive").optional(),
  code: z.string().max(50, "Code is too long").optional(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface Promotion {
  id: number;
  name: string;
  description?: string;
  promotion_type: string;
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  usage_count: number;
  code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Promotions() {
  const { format } = useCurrency();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>({
    name: "",
    description: "",
    promotion_type: "percentage",
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usage_limit: 0,
    code: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const result = await invoke<Promotion[]>("get_promotions");
      setPromotions(result);
    } catch (error) {
      console.error("Failed to load promotions:", error);
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      promotionSchema.parse(formData);
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

  const handleCreatePromotion = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPromotion) {
        await invoke("update_promotion", {
          promotionId: editingPromotion.id,
          request: formData,
        });
        toast.success(`✅ Promotion "${formData.name}" updated successfully!`);
      } else {
        await invoke("create_promotion", {
          request: formData,
        });
        toast.success(`✅ Promotion "${formData.name}" created successfully!`);
      }

      setIsDialogOpen(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error("Failed to save promotion:", error);
      toast.error(`❌ Failed to save promotion: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || "",
      promotion_type: promotion.promotion_type as any,
      discount_value: promotion.discount_value,
      min_purchase_amount: promotion.min_purchase_amount,
      max_discount_amount: promotion.max_discount_amount || 0,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      usage_limit: promotion.usage_limit || 0,
      code: promotion.code || "",
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleDeletePromotion = async (promotionId: number, promotionName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${promotionName}"?`)) return;

    try {
      await invoke("delete_promotion", { promotionId });
      toast.success(`Promotion "${promotionName}" deactivated successfully!`);
      loadPromotions();
    } catch (error) {
      console.error("Failed to delete promotion:", error);
      toast.error(`Failed to deactivate promotion: ${error}`);
    }
  };

  const handleReactivatePromotion = async (promotionId: number, promotionName: string) => {
    if (!confirm(`Are you sure you want to reactivate "${promotionName}"?`)) return;

    try {
      await invoke("reactivate_promotion", { promotionId });
      toast.success(`✅ Promotion "${promotionName}" reactivated successfully!`);
      loadPromotions();
    } catch (error) {
      console.error("Failed to reactivate promotion:", error);
      toast.error(`❌ Failed to reactivate promotion: ${error}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      promotion_type: "percentage",
      discount_value: 0,
      min_purchase_amount: 0,
      max_discount_amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usage_limit: 0,
      code: "",
    });
    setEditingPromotion(null);
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

  // Auto-filter promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((promotion) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        promotion.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (promotion.code && promotion.code.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      const matchesType = selectedType === "all" || promotion.promotion_type === selectedType;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && promotion.is_active) ||
        (statusFilter === "inactive" && !promotion.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [promotions, debouncedSearchQuery, selectedType, statusFilter]);

  useEffect(() => {
    loadPromotions();
  }, []);

  // Statistics
  const totalPromotions = promotions.length;
  const activePromotions = promotions.filter((p) => p.is_active).length;
  const expiredPromotions = promotions.filter((p) => new Date(p.end_date) < new Date()).length;

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case "percentage": return "% Off";
      case "fixed_amount": return "$ Off";
      case "buy_x_get_y": return "BOGO";
      case "bundle": return "Bundle";
      default: return type;
    }
  };

  const getPromotionTypeColor = (type: string) => {
    switch (type) {
      case "percentage": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "fixed_amount": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "buy_x_get_y": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "bundle": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default: return "";
    }
  };

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return promotion.is_active && now >= start && now <= end;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Promotions"
        subtitle="Manage your promotional campaigns"
        actions={
          <Button onClick={openCreateDialog} size="sm" className="shadow-md">
            <Plus className="w-4 h-4" /> Create Promotion
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
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalPromotions}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Active</p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{activePromotions}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-2 border-orange-200 dark:border-orange-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Expired</p>
                <p className="text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100">{expiredPromotions}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Calendar className="w-5 h-5 text-white" />
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
                  placeholder="Search promotions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs">
                  Type
                </Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                    <SelectItem value="bundle">Bundle Deal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Promotions</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            Showing {filteredPromotions.length} of {totalPromotions} promotions
          </div>
        </CardContent>
      </Card>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredPromotions.length > 0 ? (
          filteredPromotions.map((promotion) => (
            <Card key={promotion.id} className={`shadow-md border-2 hover:shadow-lg transition-all duration-200 ${!promotion.is_active ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold truncate">{promotion.name}</CardTitle>
                    {promotion.code && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{promotion.code}</code>
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPromotion(promotion)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {promotion.is_active ? (
                        <DropdownMenuItem
                          onClick={() => handleDeletePromotion(promotion.id, promotion.name)}
                          className="text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleReactivatePromotion(promotion.id, promotion.name)}
                          className="text-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getPromotionTypeColor(promotion.promotion_type)} border-0 text-xs`}>
                    {getPromotionTypeLabel(promotion.promotion_type)}
                  </Badge>
                  <Badge variant={isPromotionActive(promotion) ? "default" : "secondary"} className="text-xs">
                    {isPromotionActive(promotion) ? "Live" : "Inactive"}
                  </Badge>
                </div>

                {promotion.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {promotion.description}
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-semibold">
                      {promotion.promotion_type === "percentage"
                        ? `${promotion.discount_value}%`
                        : format(promotion.discount_value)}
                    </span>
                  </div>

                  {promotion.min_purchase_amount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Min. Purchase:</span>
                      <span className="font-semibold">{format(promotion.min_purchase_amount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-semibold">
                      {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  {promotion.usage_limit && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Usage:</span>
                      <span className="font-semibold">
                        {promotion.usage_count} / {promotion.usage_limit}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full shadow-md">
            <CardContent className="py-12">
              <div className="text-center">
                <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No promotions found</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {searchQuery || selectedType !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first promotion"}
                </p>
                {!searchQuery && selectedType === "all" && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Promotion
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Promotion Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingPromotion ? "Edit Promotion" : "Create New Promotion"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingPromotion
                ? "Update the promotion details below."
                : "Fill in the promotion details to create a new campaign."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
            {/* Basic Information */}
            <div className="space-y-3 md:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">
                  Promotion Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale 2024"
                  className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter promotion description"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-medium">
                  Promotion Code
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SUMMER20"
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            {/* Discount Settings */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="promotion_type" className="text-xs font-medium">
                  Promotion Type *
                </Label>
                <Select
                  value={formData.promotion_type}
                  onValueChange={(value: any) => setFormData({ ...formData, promotion_type: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                    <SelectItem value="bundle">Bundle Deal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discount_value" className="text-xs font-medium">
                  Discount Value *
                </Label>
                <div className="relative">
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={`h-9 text-sm ${validationErrors.discount_value ? "border-red-500" : ""}`}
                  />
                  {formData.promotion_type === "percentage" && (
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {validationErrors.discount_value && <p className="text-xs text-red-500">{validationErrors.discount_value}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min_purchase_amount" className="text-xs font-medium">
                  Minimum Purchase Amount
                </Label>
                <Input
                  id="min_purchase_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_discount_amount" className="text-xs font-medium">
                  Maximum Discount Amount
                </Label>
                <Input
                  id="max_discount_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Date and Usage Settings */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-medium">
                  Start Date *
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`h-9 text-sm ${validationErrors.start_date ? "border-red-500" : ""}`}
                />
                {validationErrors.start_date && <p className="text-xs text-red-500">{validationErrors.start_date}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-medium">
                  End Date *
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={`h-9 text-sm ${validationErrors.end_date ? "border-red-500" : ""}`}
                />
                {validationErrors.end_date && <p className="text-xs text-red-500">{validationErrors.end_date}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usage_limit" className="text-xs font-medium">
                  Usage Limit (0 = unlimited)
                </Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="0"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-9 text-sm"
                />
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
            <Button onClick={handleCreatePromotion} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPromotion ? (
                "Update Promotion"
              ) : (
                "Create Promotion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
