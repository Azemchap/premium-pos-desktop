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
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { Edit, MoreHorizontal, Package, Plus, Ruler, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

type EntityType = "category" | "brand" | "unit";

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
  
  const [loading] = useState(false);
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

  useEffect(() => {
    loadCategories();
    loadBrands();
    loadUnits();
  }, []);

  return (
    <div className="space-y-3 sm:space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-lg md:text-3xl font-bold">Master Data</h1>
          <p className="text-muted-foreground mt-1">
            Manage categories, brands, and units of measurement
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 sm:gap-4 md:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {categories.filter(c => c.is_active).length} active
                </p>
              </div>
              <Tag className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Brands</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{brands.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {brands.filter(b => b.is_active).length} active
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Units</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{units.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {units.filter(u => u.is_active).length} active
                </p>
              </div>
              <Ruler className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Master Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)}>
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
              <TabsTrigger value="category">Categories</TabsTrigger>
              <TabsTrigger value="brand">Brands</TabsTrigger>
              <TabsTrigger value="unit">Units</TabsTrigger>
            </TabsList>

            {/* CATEGORIES TAB */}
            <TabsContent value="category" className="space-y-2 md:space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openCategoryDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

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
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {brand.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={brand.is_active ? "default" : "secondary"}>
                          {brand.is_active ? "Active" : "Inactive"}
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
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.abbreviation || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {unit.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={unit.is_active ? "default" : "secondary"}>
                          {unit.is_active ? "Active" : "Inactive"}
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
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Add a new category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-desc">Description</Label>
              <Textarea
                id="category-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                rows={3}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "Create Brand"}</DialogTitle>
            <DialogDescription>
              {editingBrand ? "Update brand details" : "Add a new brand"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Name *</Label>
              <Input
                id="brand-name"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-desc">Description</Label>
              <Textarea
                id="brand-desc"
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                rows={3}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Create Unit"}</DialogTitle>
            <DialogDescription>
              {editingUnit ? "Update unit details" : "Add a new unit of measurement"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name">Name *</Label>
              <Input
                id="unit-name"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-abbr">Abbreviation</Label>
              <Input
                id="unit-abbr"
                value={unitForm.abbreviation}
                onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                placeholder="e.g. kg, lb, ea"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-desc">Description</Label>
              <Textarea
                id="unit-desc"
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                rows={3}
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
    </div>
  );
}
