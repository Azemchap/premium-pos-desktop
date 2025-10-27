// src/pages/MasterData.tsx - Master Data Management
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
// import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { Edit, MoreHorizontal, Package, Plus, Ruler, Tag, Trash2, Palette, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
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
  // const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<EntityType>("category");
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  
  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });
  
  // Units
  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "", description: "" });
  
  // Variant Types
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [isVariantTypeDialogOpen, setIsVariantTypeDialogOpen] = useState(false);
  const [editingVariantType, setEditingVariantType] = useState<VariantType | null>(null);
  const [variantTypeForm, setVariantTypeForm] = useState({ name: "", description: "", display_order: 0 });
  
  // Variant Values
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
      setCategoryForm({
        name: category.name,
        description: category.description || "",
      });
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
        toast.success(`✅ Category "${categoryForm.name}" updated!`);
      } else {
        await invoke("create_category", { request: categoryForm });
        toast.success(`✅ Category "${categoryForm.name}" created!`);
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
        toast.error(`❌ Failed to save category: ${error}`);
      }
    }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await invoke("delete_category", { id });
      toast.success(`🗑️ Category "${name}" deleted!`);
      loadCategories();
    } catch (error) {
      toast.error(`❌ Failed to delete category: ${error}`);
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
      setBrandForm({
        name: brand.name,
        description: brand.description || "",
      });
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
        toast.success(`✅ Brand "${brandForm.name}" updated!`);
      } else {
        await invoke("create_brand", { request: brandForm });
        toast.success(`✅ Brand "${brandForm.name}" created!`);
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
        toast.error(`❌ Failed to save brand: ${error}`);
      }
    }
  };

  const deleteBrand = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await invoke("delete_brand", { id });
      toast.success(`🗑️ Brand "${name}" deleted!`);
      loadBrands();
    } catch (error) {
      toast.error(`❌ Failed to delete brand: ${error}`);
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
      setUnitForm({
        name: unit.name,
        abbreviation: unit.abbreviation || "",
        description: unit.description || "",
      });
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
        toast.success(`✅ Unit "${unitForm.name}" updated!`);
      } else {
        await invoke("create_unit", { request: unitForm });
        toast.success(`✅ Unit "${unitForm.name}" created!`);
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
        toast.error(`❌ Failed to save unit: ${error}`);
      }
    }
  };

  const deleteUnit = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await invoke("delete_unit", { id });
      toast.success(`🗑️ Unit "${name}" deleted!`);
      loadUnits();
    } catch (error) {
      toast.error(`❌ Failed to delete unit: ${error}`);
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
      setVariantTypeForm({
        name: variantType.name,
        description: variantType.description || "",
        display_order: variantType.display_order,
      });
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
        toast.success(`✅ Variant Type "${variantTypeForm.name}" updated!`);
      } else {
        await invoke("create_variant_type", { request: variantTypeForm });
        toast.success(`✅ Variant Type "${variantTypeForm.name}" created!`);
      }

      setIsVariantTypeDialogOpen(false);
      loadVariantTypes();
      loadVariantValues(); // Reload values in case type was updated
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
      } else {
        toast.error(`❌ Failed to save variant type: ${error}`);
      }
    }
  };

  const deleteVariantType = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated values.`)) return;
    
    try {
      await invoke("delete_variant_type", { id });
      toast.success(`🗑️ Variant Type "${name}" deleted!`);
      loadVariantTypes();
      loadVariantValues();
    } catch (error) {
      toast.error(`❌ Failed to delete variant type: ${error}`);
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
        toast.success(`✅ Variant Value "${variantValueForm.value}" updated!`);
      } else {
        await invoke("create_variant_value", { request: variantValueForm });
        toast.success(`✅ Variant Value "${variantValueForm.value}" created!`);
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
        toast.error(`❌ Failed to save variant value: ${error}`);
      }
    }
  };

  const deleteVariantValue = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;
    
    try {
      await invoke("delete_variant_value", { id });
      toast.success(`🗑️ Variant Value "${value}" deleted!`);
      loadVariantValues();
    } catch (error) {
      toast.error(`❌ Failed to delete variant value: ${error}`);
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Layers}
        title="Master Data"
        subtitle="Manage categories, brands, units, and product variants"
      />

      {/* Statistics - Enhanced with Gradients */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs sm:text-sm opacity-90 font-medium">Categories</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{categories.length}</p>
                <p className="text-xs opacity-80 mt-1">
                  {categories.filter(c => c.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Tag className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs sm:text-sm opacity-90 font-medium">Brands</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{brands.length}</p>
                <p className="text-xs opacity-80 mt-1">
                  {brands.filter(b => b.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Package className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs sm:text-sm opacity-90 font-medium">Units</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{units.length}</p>
                <p className="text-xs opacity-80 mt-1">
                  {units.filter(u => u.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Ruler className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
          <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs sm:text-sm opacity-90 font-medium">Variant Types</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{variantTypes.length}</p>
                <p className="text-xs opacity-80 mt-1">
                  {variantTypes.filter(v => v.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Layers className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200">
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs sm:text-sm opacity-90 font-medium">Variant Values</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{variantValues.length}</p>
                <p className="text-xs opacity-80 mt-1">
                  {variantValues.filter(v => v.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Palette className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Card className="shadow-md w-full">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle>Manage Master Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0 py-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)}>
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 lg:grid-cols-5 h-full">
              <TabsTrigger value="category">Categories</TabsTrigger>
              <TabsTrigger value="brand">Brands</TabsTrigger>
              <TabsTrigger value="unit">Units</TabsTrigger>
              <TabsTrigger value="variant_type">Variant Types</TabsTrigger>
              <TabsTrigger value="variant_value">Variant Values</TabsTrigger>
            </TabsList>

            {/* CATEGORIES TAB */}
            <TabsContent value="category" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCategoryDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <TableCell className="font-semibold text-foreground text-sm">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={category.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                          {category.is_active ? "✓ Active" : "○ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openCategoryDialog(category)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteCategory(category.id, category.name)}
                              className="text-destructive"
                            >
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
            <TabsContent value="brand" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openBrandDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Brand
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <TableCell className="font-semibold text-foreground text-sm">{brand.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {brand.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={brand.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                          {brand.is_active ? "✓ Active" : "○ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openBrandDialog(brand)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteBrand(brand.id, brand.name)}
                              className="text-destructive"
                            >
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
            </TabsContent>

            {/* UNITS TAB */}
            <TabsContent value="unit" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openUnitDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unit
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Abbreviation</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <TableCell className="font-semibold text-foreground text-sm">{unit.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{unit.abbreviation || "—"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {unit.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={unit.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                          {unit.is_active ? "✓ Active" : "○ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openUnitDialog(unit)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteUnit(unit.id, unit.name)}
                              className="text-destructive"
                            >
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
            </TabsContent>

            {/* VARIANT TYPES TAB */}
            <TabsContent value="variant_type" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openVariantTypeDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant Type
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Display Order</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantTypes.map((variantType) => (
                    <TableRow key={variantType.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <TableCell className="font-semibold text-foreground text-sm">{variantType.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {variantType.description || "—"}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs px-2">{variantType.display_order}</Badge></TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={variantType.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                          {variantType.is_active ? "✓ Active" : "○ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openVariantTypeDialog(variantType)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteVariantType(variantType.id, variantType.name)}
                              className="text-destructive"
                            >
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
            </TabsContent>

            {/* VARIANT VALUES TAB */}
            <TabsContent value="variant_value" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openVariantValueDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant Value
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Color</TableHead>
                    <TableHead className="text-xs">Order</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantValues.map((variantValue) => (
                    <TableRow key={variantValue.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {getVariantTypeName(variantValue.variant_type_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-sm">{variantValue.value}</TableCell>
                      <TableCell>
                        {variantValue.code ? (
                          <Badge variant="outline" className="font-mono text-xs">{variantValue.code}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {variantValue.hex_color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded-lg border-2 shadow-sm"
                              style={{ backgroundColor: variantValue.hex_color }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">
                              {variantValue.hex_color}
                            </span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs px-2">{variantValue.display_order}</Badge></TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={variantValue.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                          {variantValue.is_active ? "✓ Active" : "○ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openVariantValueDialog(variantValue)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteVariantValue(variantValue.id, variantValue.value)}
                              className="text-destructive"
                            >
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingCategory ? "Update category details" : "Add a new category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="category-name" className="text-xs">Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-desc" className="text-xs">Description</Label>
              <Textarea
                id="category-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Dialog */}
      <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingBrand ? "Edit Brand" : "Create Brand"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingBrand ? "Update brand details" : "Add a new brand"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name" className="text-xs">Name *</Label>
              <Input
                id="brand-name"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-desc" className="text-xs">Description</Label>
              <Textarea
                id="brand-desc"
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBrandDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBrand}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingUnit ? "Edit Unit" : "Create Unit"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingUnit ? "Update unit details" : "Add a new unit of measurement"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit-name" className="text-xs">Name *</Label>
              <Input
                id="unit-name"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-abbr" className="text-xs">Abbreviation</Label>
              <Input
                id="unit-abbr"
                value={unitForm.abbreviation}
                onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                placeholder="e.g. kg, lb, ea"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-desc" className="text-xs">Description</Label>
              <Textarea
                id="unit-desc"
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveUnit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Type Dialog */}
      <Dialog open={isVariantTypeDialogOpen} onOpenChange={setIsVariantTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingVariantType ? "Edit Variant Type" : "Create Variant Type"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingVariantType ? "Update variant type details" : "Add a new variant type (e.g., Size, Color, Material)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="variant-type-name" className="text-xs">Name *</Label>
              <Input
                id="variant-type-name"
                value={variantTypeForm.name}
                onChange={(e) => setVariantTypeForm({ ...variantTypeForm, name: e.target.value })}
                placeholder="e.g., Size, Color, Material"
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-type-desc" className="text-xs">Description</Label>
              <Textarea
                id="variant-type-desc"
                value={variantTypeForm.description}
                onChange={(e) => setVariantTypeForm({ ...variantTypeForm, description: e.target.value })}
                rows={3}
                placeholder="Optional description"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-type-order" className="text-xs">Display Order</Label>
              <Input
                id="variant-type-order"
                type="number"
                value={variantTypeForm.display_order}
                onChange={(e) => setVariantTypeForm({ ...variantTypeForm, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVariantType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Value Dialog */}
      <Dialog open={isVariantValueDialogOpen} onOpenChange={setIsVariantValueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingVariantValue ? "Edit Variant Value" : "Create Variant Value"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingVariantValue ? "Update variant value details" : "Add a new variant value (e.g., Small, Red, Cotton)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="variant-value-type" className="text-xs">Variant Type *</Label>
              <select
                id="variant-value-type"
                value={variantValueForm.variant_type_id}
                onChange={(e) => setVariantValueForm({ ...variantValueForm, variant_type_id: parseInt(e.target.value) })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {variantTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {validationErrors.variant_type_id && (
                <p className="text-xs text-red-500">{validationErrors.variant_type_id}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-value-name" className="text-xs">Value *</Label>
              <Input
                id="variant-value-name"
                value={variantValueForm.value}
                onChange={(e) => setVariantValueForm({ ...variantValueForm, value: e.target.value })}
                placeholder="e.g., Small, Red, Cotton"
                className={`h-9 text-sm ${validationErrors.value ? "border-red-500" : ""}`}
              />
              {validationErrors.value && (
                <p className="text-xs text-red-500">{validationErrors.value}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-value-code" className="text-xs">Code</Label>
              <Input
                id="variant-value-code"
                value={variantValueForm.code}
                onChange={(e) => setVariantValueForm({ ...variantValueForm, code: e.target.value })}
                placeholder="e.g., SM, RED, COT"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-value-color" className="text-xs">Hex Color (for colors only)</Label>
              <div className="flex gap-2">
                <Input
                  id="variant-value-color"
                  value={variantValueForm.hex_color}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, hex_color: e.target.value })}
                  placeholder="#000000"
                  className="h-9 text-sm"
                />
                <input
                  type="color"
                  value={variantValueForm.hex_color || "#000000"}
                  onChange={(e) => setVariantValueForm({ ...variantValueForm, hex_color: e.target.value })}
                  className="w-10 h-9 rounded border cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-value-order" className="text-xs">Display Order</Label>
              <Input
                id="variant-value-order"
                type="number"
                value={variantValueForm.display_order}
                onChange={(e) => setVariantValueForm({ ...variantValueForm, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVariantValue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
