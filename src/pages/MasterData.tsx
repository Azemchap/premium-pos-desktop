// src/pages/MasterData.tsx - Optimized Mobile-First Design
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import { Edit, Layers, MoreHorizontal, Package, Palette, Plus, Ruler, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from "sonner";
import { z } from "zod";

// Interfaces
interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Unit {
  id: number;
  name: string;
  abbreviation?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VariantType {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VariantValue {
  id: number;
  variant_type_id: number;
  value: string;
  code?: string;
  display_order: number;
  hex_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Validation schemas
const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

const unitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  abbreviation: z.string().max(10, "Abbreviation is too long").optional(),
  description: z.string().max(500, "Description is too long").optional(),
});

const variantTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  display_order: z.number().optional(),
});

const variantValueSchema = z.object({
  variant_type_id: z.number().min(1, "Variant type is required"),
  value: z.string().min(1, "Value is required").max(100, "Value is too long"),
  code: z.string().max(10, "Code is too long").optional(),
  display_order: z.number().optional(),
  hex_color: z.string().optional(),
});

type EntityType = "category" | "brand" | "unit" | "variant_type" | "variant_value";

export default function MasterData() {
  const [activeTab, setActiveTab] = useState<EntityType>("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });

  const [brands, setBrands] = useState<Brand[]>([]);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });

  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "", description: "" });

  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [isVariantTypeDialogOpen, setIsVariantTypeDialogOpen] = useState(false);
  const [editingVariantType, setEditingVariantType] = useState<VariantType | null>(null);
  const [variantTypeForm, setVariantTypeForm] = useState({ name: "", description: "", display_order: 0 });

  const [variantValues, setVariantValues] = useState<VariantValue[]>([]);
  const [isVariantValueDialogOpen, setIsVariantValueDialogOpen] = useState(false);
  const [editingVariantValue, setEditingVariantValue] = useState<VariantValue | null>(null);
  const [variantValueForm, setVariantValueForm] = useState({
    variant_type_id: 0,
    value: "",
    code: "",
    display_order: 0,
    hex_color: ""
  });

  const [_loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Delete states
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number, name: string } | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<{ id: number, name: string } | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<{ id: number, name: string } | null>(null);
  const [variantTypeToDelete, setVariantTypeToDelete] = useState<{ id: number, name: string } | null>(null);
  const [variantValueToDelete, setVariantValueToDelete] = useState<{ id: number, name: string } | null>(null);

  // ========== CATEGORIES ==========
  const loadCategories = async () => {
    try {
      setLoading(true);
      const result = await invoke<Category[]>("get_all_categories");
      setCategories(result);
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || "" });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
    }
    setValidationErrors({});
    setIsCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    try {
      categorySchema.parse(categoryForm);
      setValidationErrors({});

      if (editingCategory) {
        await invoke("update_category", { id: editingCategory.id, request: categoryForm });
        toast.success(`Category "${categoryForm.name}" updated`);
      } else {
        await invoke("create_category", { request: categoryForm });
        toast.success(`Category "${categoryForm.name}" created`);
      }

      setIsCategoryDialogOpen(false);
      loadCategories();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`Failed to save category: ${error}`);
      }
    }
  };

  const deleteCategory = (id: number, name: string) => {
    setCategoryToDelete({ id, name });
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await invoke("delete_category", { id: categoryToDelete.id });
      toast.success(`Category "${categoryToDelete.name}" deleted`);
      loadCategories();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // ========== BRANDS ==========
  const loadBrands = async () => {
    try {
      setLoading(true);
      const result = await invoke<Brand[]>("get_all_brands");
      setBrands(result);
    } catch (error) {
      console.error("Failed to load brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const openBrandDialog = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ name: brand.name, description: brand.description || "" });
    } else {
      setEditingBrand(null);
      setBrandForm({ name: "", description: "" });
    }
    setValidationErrors({});
    setIsBrandDialogOpen(true);
  };

  const saveBrand = async () => {
    try {
      brandSchema.parse(brandForm);
      setValidationErrors({});

      if (editingBrand) {
        await invoke("update_brand", { id: editingBrand.id, request: brandForm });
        toast.success(`Brand "${brandForm.name}" updated`);
      } else {
        await invoke("create_brand", { request: brandForm });
        toast.success(`Brand "${brandForm.name}" created`);
      }

      setIsBrandDialogOpen(false);
      loadBrands();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`Failed to save brand: ${error}`);
      }
    }
  };

  const deleteBrand = (id: number, name: string) => {
    setBrandToDelete({ id, name });
  };

  const executeDeleteBrand = async () => {
    if (!brandToDelete) return;
    try {
      await invoke("delete_brand", { id: brandToDelete.id });
      toast.success(`Brand "${brandToDelete.name}" deleted`);
      loadBrands();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setBrandToDelete(null);
    }
  };

  // ========== UNITS ==========
  const loadUnits = async () => {
    try {
      setLoading(true);
      const result = await invoke<Unit[]>("get_all_units");
      setUnits(result);
    } catch (error) {
      console.error("Failed to load units:", error);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const openUnitDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({ name: unit.name, abbreviation: unit.abbreviation || "", description: unit.description || "" });
    } else {
      setEditingUnit(null);
      setUnitForm({ name: "", abbreviation: "", description: "" });
    }
    setValidationErrors({});
    setIsUnitDialogOpen(true);
  };

  const saveUnit = async () => {
    try {
      unitSchema.parse(unitForm);
      setValidationErrors({});

      if (editingUnit) {
        await invoke("update_unit", { id: editingUnit.id, request: unitForm });
        toast.success(`Unit "${unitForm.name}" updated`);
      } else {
        await invoke("create_unit", { request: unitForm });
        toast.success(`Unit "${unitForm.name}" created`);
      }

      setIsUnitDialogOpen(false);
      loadUnits();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`Failed to save unit: ${error}`);
      }
    }
  };

  const deleteUnit = (id: number, name: string) => {
    setUnitToDelete({ id, name });
  };

  const executeDeleteUnit = async () => {
    if (!unitToDelete) return;
    try {
      await invoke("delete_unit", { id: unitToDelete.id });
      toast.success(`Unit "${unitToDelete.name}" deleted`);
      loadUnits();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setUnitToDelete(null);
    }
  };

  // ========== VARIANT TYPES ==========
  const loadVariantTypes = async () => {
    try {
      setLoading(true);
      const result = await invoke<VariantType[]>("get_all_variant_types");
      setVariantTypes(result);
    } catch (error) {
      console.error("Failed to load variant types:", error);
      toast.error("Failed to load variant types");
    } finally {
      setLoading(false);
    }
  };

  const openVariantTypeDialog = (variantType?: VariantType) => {
    if (variantType) {
      setEditingVariantType(variantType);
      setVariantTypeForm({ name: variantType.name, description: variantType.description || "", display_order: variantType.display_order });
    } else {
      setEditingVariantType(null);
      setVariantTypeForm({ name: "", description: "", display_order: 0 });
    }
    setValidationErrors({});
    setIsVariantTypeDialogOpen(true);
  };

  const saveVariantType = async () => {
    try {
      variantTypeSchema.parse(variantTypeForm);
      setValidationErrors({});

      if (editingVariantType) {
        await invoke("update_variant_type", { id: editingVariantType.id, request: variantTypeForm });
        toast.success(`Variant Type "${variantTypeForm.name}" updated`);
      } else {
        await invoke("create_variant_type", { request: variantTypeForm });
        toast.success(`Variant Type "${variantTypeForm.name}" created`);
      }

      setIsVariantTypeDialogOpen(false);
      loadVariantTypes();
      loadVariantValues();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`Failed to save variant type: ${error}`);
      }
    }
  };

  const deleteVariantType = (id: number, name: string) => {
    setVariantTypeToDelete({ id, name });
  };

  const executeDeleteVariantType = async () => {
    if (!variantTypeToDelete) return;
    try {
      await invoke("delete_variant_type", { id: variantTypeToDelete.id });
      toast.success(`Variant Type "${variantTypeToDelete.name}" deleted`);
      loadVariantTypes();
      loadVariantValues();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setVariantTypeToDelete(null);
    }
  };

  // ========== VARIANT VALUES ==========
  const loadVariantValues = async () => {
    try {
      setLoading(true);
      const result = await invoke<VariantValue[]>("get_all_variant_values");
      setVariantValues(result);
    } catch (error) {
      console.error("Failed to load variant values:", error);
      toast.error("Failed to load variant values");
    } finally {
      setLoading(false);
    }
  };

  const openVariantValueDialog = (variantValue?: VariantValue) => {
    if (variantValue) {
      setEditingVariantValue(variantValue);
      setVariantValueForm({
        variant_type_id: variantValue.variant_type_id,
        value: variantValue.value,
        code: variantValue.code || "",
        display_order: variantValue.display_order,
        hex_color: variantValue.hex_color || "",
      });
    } else {
      setEditingVariantValue(null);
      setVariantValueForm({
        variant_type_id: variantTypes.length > 0 ? variantTypes[0].id : 0,
        value: "",
        code: "",
        display_order: 0,
        hex_color: ""
      });
    }
    setValidationErrors({});
    setIsVariantValueDialogOpen(true);
  };

  const saveVariantValue = async () => {
    try {
      variantValueSchema.parse(variantValueForm);
      setValidationErrors({});

      if (editingVariantValue) {
        await invoke("update_variant_value", { id: editingVariantValue.id, request: variantValueForm });
        toast.success(`Variant Value "${variantValueForm.value}" updated`);
      } else {
        await invoke("create_variant_value", { request: variantValueForm });
        toast.success(`Variant Value "${variantValueForm.value}" created`);
      }

      setIsVariantValueDialogOpen(false);
      loadVariantValues();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`Failed to save variant value: ${error}`);
      }
    }
  };

  const deleteVariantValue = (id: number, value: string) => {
    setVariantValueToDelete({ id, name: value });
  };

  const executeDeleteVariantValue = async () => {
    if (!variantValueToDelete) return;
    try {
      await invoke("delete_variant_value", { id: variantValueToDelete.id });
      toast.success(`Variant Value "${variantValueToDelete.name}" deleted`);
      loadVariantValues();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setVariantValueToDelete(null);
    }
  };

  const getVariantTypeName = (typeId: number) => {
    const type = variantTypes.find(t => t.id === typeId);
    return type ? type.name : "Unknown";
  };

  useEffect(() => {
    loadCategories();
    loadBrands();
    loadUnits();
    loadVariantTypes();
    loadVariantValues();
  }, []);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none px-3 py-2 sm:px-6 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Layers}
          title="Master Data"
          subtitle="Manage categories, brands, units, and product variants"
        />
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-6 space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Categories</p>
                    <p className="text-3xl font-bold mt-1 truncate">{categories.length}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 truncate">
                      {categories.filter(c => c.is_active).length} active
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Brands</p>
                    <p className="text-3xl font-bold mt-1 truncate">{brands.length}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 truncate">
                      {brands.filter(b => b.is_active).length} active
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Units</p>
                    <p className="text-3xl font-bold mt-1 truncate">{units.length}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 truncate">
                      {units.filter(u => u.is_active).length} active
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Ruler className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Types</p>
                    <p className="text-3xl font-bold mt-1 truncate">{variantTypes.length}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 truncate">
                      {variantTypes.filter(v => v.is_active).length} active
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Values</p>
                    <p className="text-3xl font-bold mt-1 truncate">{variantValues.length}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 truncate">
                      {variantValues.filter(v => v.is_active).length} active
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/20 rounded-lg flex-shrink-0">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabbed Interface */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b p-3">
              <CardTitle className="text-base">Manage Master Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)} className="w-full">
                <div className="border-b px-3">
                  <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-full bg-transparent p-0 gap-1">
                    <TabsTrigger value="category" className="text-xs p-2 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Categories
                    </TabsTrigger>
                    <TabsTrigger value="brand" className="text-xs p-2 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Brands
                    </TabsTrigger>
                    <TabsTrigger value="unit" className="text-xs p-2 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Units
                    </TabsTrigger>
                    <TabsTrigger value="variant_type" className="text-xs p-2 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Types
                    </TabsTrigger>
                    <TabsTrigger value="variant_value" className="text-xs p-2 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Values
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* CATEGORIES TAB */}
                <TabsContent value="category" className="mt-0 p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => openCategoryDialog()} className="h-11 touch-manipulation">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {/* Mobile: Cards */}
                  <div className="lg:hidden space-y-2">
                    {categories.map((category) => (
                      <Card key={category.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm line-clamp-1">{category.name}</h3>
                              {category.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{category.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openCategoryDialog(category)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteCategory(category.id, category.name)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Badge variant={category.is_active ? "default" : "secondary"} className="text-[10px]">
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop: Table */}
                  <div className="hidden lg:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-semibold">{category.name}</TableCell>
                            <TableCell className="text-muted-foreground">{category.description || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs">
                                {category.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openCategoryDialog(category)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteCategory(category.id, category.name)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* BRANDS TAB */}
                <TabsContent value="brand" className="mt-0 p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => openBrandDialog()} className="h-11 touch-manipulation">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="lg:hidden space-y-2">
                    {brands.map((brand) => (
                      <Card key={brand.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm line-clamp-1">{brand.name}</h3>
                              {brand.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{brand.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openBrandDialog(brand)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteBrand(brand.id, brand.name)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Badge variant={brand.is_active ? "default" : "secondary"} className="text-[10px]">
                            {brand.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brands.map((brand) => (
                          <TableRow key={brand.id}>
                            <TableCell className="font-semibold">{brand.name}</TableCell>
                            <TableCell className="text-muted-foreground">{brand.description || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={brand.is_active ? "default" : "secondary"} className="text-xs">
                                {brand.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openBrandDialog(brand)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteBrand(brand.id, brand.name)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* UNITS TAB */}
                <TabsContent value="unit" className="mt-0 p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => openUnitDialog()} className="h-11 touch-manipulation">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="lg:hidden space-y-2">
                    {units.map((unit) => (
                      <Card key={unit.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm">{unit.name}</h3>
                                {unit.abbreviation && (
                                  <Badge variant="outline" className="text-[10px] font-mono">{unit.abbreviation}</Badge>
                                )}
                              </div>
                              {unit.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{unit.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openUnitDialog(unit)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteUnit(unit.id, unit.name)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Badge variant={unit.is_active ? "default" : "secondary"} className="text-[10px]">
                            {unit.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Abbreviation</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {units.map((unit) => (
                          <TableRow key={unit.id}>
                            <TableCell className="font-semibold">{unit.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">{unit.abbreviation || "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{unit.description || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={unit.is_active ? "default" : "secondary"} className="text-xs">
                                {unit.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openUnitDialog(unit)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteUnit(unit.id, unit.name)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* VARIANT TYPES TAB */}
                <TabsContent value="variant_type" className="mt-0 p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => openVariantTypeDialog()} className="h-11 touch-manipulation">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="lg:hidden space-y-2">
                    {variantTypes.map((type) => (
                      <Card key={type.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm">{type.name}</h3>
                                <Badge variant="secondary" className="text-[10px]">#{type.display_order}</Badge>
                              </div>
                              {type.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{type.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openVariantTypeDialog(type)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteVariantType(type.id, type.name)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Badge variant={type.is_active ? "default" : "secondary"} className="text-[10px]">
                            {type.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variantTypes.map((type) => (
                          <TableRow key={type.id}>
                            <TableCell className="font-semibold">{type.name}</TableCell>
                            <TableCell className="text-muted-foreground">{type.description || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{type.display_order}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={type.is_active ? "default" : "secondary"} className="text-xs">
                                {type.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openVariantTypeDialog(type)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteVariantType(type.id, type.name)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* VARIANT VALUES TAB */}
                <TabsContent value="variant_value" className="mt-0 p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => openVariantValueDialog()} className="h-11 touch-manipulation">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="lg:hidden space-y-2">
                    {variantValues.map((value) => (
                      <Card key={value.id} className="border-2">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-[10px] mb-1.5">
                                {getVariantTypeName(value.variant_type_id)}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {value.hex_color && (
                                  <div className="w-6 h-6 rounded border-2 flex-shrink-0" style={{ backgroundColor: value.hex_color }} />
                                )}
                                <h3 className="font-semibold text-sm">{value.value}</h3>
                                {value.code && (
                                  <Badge variant="outline" className="text-[10px] font-mono">{value.code}</Badge>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openVariantValueDialog(value)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteVariantValue(value.id, value.value)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={value.is_active ? "default" : "secondary"} className="text-[10px]">
                              {value.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">#{value.display_order}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variantValues.map((value) => (
                          <TableRow key={value.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getVariantTypeName(value.variant_type_id)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{value.value}</TableCell>
                            <TableCell>
                              {value.code ? (
                                <Badge variant="outline" className="font-mono text-xs">{value.code}</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {value.hex_color ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: value.hex_color }} />
                                  <span className="text-xs text-muted-foreground font-mono">{value.hex_color}</span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{value.display_order}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={value.is_active ? "default" : "secondary"} className="text-xs">
                                {value.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openVariantValueDialog(value)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteVariantValue(value.id, value.value)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingCategory ? "Update category details" : "Add a new category"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={saveCategory} className="flex-1 h-11 touch-manipulation">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Dialog */}
      <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingBrand ? "Edit Brand" : "New Brand"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingBrand ? "Update brand details" : "Add a new brand"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsBrandDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={saveBrand} className="flex-1 h-11 touch-manipulation">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingUnit ? "Edit Unit" : "New Unit"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingUnit ? "Update unit details" : "Add a new unit"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Abbreviation</Label>
                <Input
                  value={unitForm.abbreviation}
                  onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                  placeholder="e.g. kg, lb"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={saveUnit} className="flex-1 h-11 touch-manipulation">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Type Dialog */}
      <Dialog open={isVariantTypeDialogOpen} onOpenChange={setIsVariantTypeDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingVariantType ? "Edit Type" : "New Variant Type"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingVariantType ? "Update variant type" : "Add variant type (e.g. Size, Color)"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  value={variantTypeForm.name}
                  onChange={(e) => setVariantTypeForm({ ...variantTypeForm, name: e.target.value })}
                  placeholder="e.g. Size, Color"
                  className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Display Order</Label>
                <Input
                  type="number"
                  value={variantTypeForm.display_order}
                  onChange={(e) => setVariantTypeForm({ ...variantTypeForm, display_order: parseInt(e.target.value) || 0 })}
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={variantTypeForm.description}
                  onChange={(e) => setVariantTypeForm({ ...variantTypeForm, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsVariantTypeDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={saveVariantType} className="flex-1 h-11 touch-manipulation">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Value Dialog */}
      <Dialog open={isVariantValueDialogOpen} onOpenChange={setIsVariantValueDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingVariantValue ? "Edit Value" : "New Variant Value"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingVariantValue ? "Update variant value" : "Add value (e.g. Small, Red)"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Variant Type *</Label>
                <select
                  value={variantValueForm.variant_type_id}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, variant_type_id: parseInt(e.target.value) })}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm touch-manipulation"
                >
                  {variantTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Value *</Label>
                <Input
                  value={variantValueForm.value}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, value: e.target.value })}
                  placeholder="e.g. Small, Red"
                  className={`h-11 touch-manipulation ${validationErrors.value ? "border-red-500" : ""}`}
                />
                {validationErrors.value && <p className="text-xs text-red-500">{validationErrors.value}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Code</Label>
                <Input
                  value={variantValueForm.code}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, code: e.target.value })}
                  placeholder="e.g. SM, RED"
                  className="h-11 touch-manipulation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Hex Color (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={variantValueForm.hex_color}
                    onChange={(e) => setVariantValueForm({ ...variantValueForm, hex_color: e.target.value })}
                    placeholder="#000000"
                    className="h-11 touch-manipulation flex-1"
                  />
                  <input
                    type="color"
                    value={variantValueForm.hex_color || "#000000"}
                    onChange={(e) => setVariantValueForm({ ...variantValueForm, hex_color: e.target.value })}
                    className="w-12 h-11 rounded border cursor-pointer flex-shrink-0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Display Order</Label>
                <Input
                  type="number"
                  value={variantValueForm.display_order}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, display_order: parseInt(e.target.value) || 0 })}
                  className="h-11 touch-manipulation"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setIsVariantValueDialogOpen(false)} className="flex-1 h-11 touch-manipulation">
              Cancel
            </Button>
            <Button onClick={saveVariantValue} className="flex-1 h-11 touch-manipulation">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"?`}
        onConfirm={executeDeleteCategory}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!brandToDelete}
        onOpenChange={(open) => !open && setBrandToDelete(null)}
        title="Delete Brand"
        description={`Are you sure you want to delete "${brandToDelete?.name}"?`}
        onConfirm={executeDeleteBrand}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!unitToDelete}
        onOpenChange={(open) => !open && setUnitToDelete(null)}
        title="Delete Unit"
        description={`Are you sure you want to delete "${unitToDelete?.name}"?`}
        onConfirm={executeDeleteUnit}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!variantTypeToDelete}
        onOpenChange={(open) => !open && setVariantTypeToDelete(null)}
        title="Delete Variant Type"
        description={`Are you sure you want to delete "${variantTypeToDelete?.name}"? This will delete all associated values.`}
        onConfirm={executeDeleteVariantType}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!variantValueToDelete}
        onOpenChange={(open) => !open && setVariantValueToDelete(null)}
        title="Delete Variant Value"
        description={`Are you sure you want to delete "${variantValueToDelete?.name}"?`}
        onConfirm={executeDeleteVariantValue}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}