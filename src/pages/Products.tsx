// src/pages/Products.tsx - Refactored with Inventory-style design
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import TableActions from "@/components/TableActions";
import SortableTableHead from "@/components/SortableTableHead";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
import {
  Package,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Tag,
  Boxes,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import ProductVariantManager from "@/components/ProductVariantManager";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  wholesale_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100),
  minimum_stock: z.number().min(0),
  maximum_stock: z.number().min(0),
  reorder_point: z.number().min(0),
  supplier_id: z.number().optional(),
  has_variants: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit?: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  tax_rate: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  supplier_id?: number;
  has_variants: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  name: string;
}

type SortColumn = "name" | "sku" | "category" | "selling_price";
type SortDirection = "asc" | "desc";

export default function Products() {
  const { format } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    brand: "",
    unit: "",
    description: "",
    cost_price: 0,
    selling_price: 0,
    wholesale_price: 0,
    tax_rate: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    reorder_point: 0,
    supplier_id: undefined,
    has_variants: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [variantCombinations, setVariantCombinations] = useState<any[]>([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoke<Product[]>("get_products");
      setProducts(result);
      toast.success(`✅ Loaded ${result.length} products`);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("❌ Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [cats, brnds, unts] = await Promise.all([
        invoke<Category[]>("get_all_categories"),
        invoke<Brand[]>("get_all_brands"),
        invoke<Unit[]>("get_all_units"),
      ]);
      setCategories(cats);
      setBrands(brnds);
      setUnits(unts);
    } catch (error) {
      console.error("Failed to load master data:", error);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      productSchema.parse(formData);

      if (editingProduct) {
        await invoke("update_product", {
          productId: editingProduct.id,
          request: formData,
        });
        toast.success("✅ Product updated successfully!");
      } else {
        const productId = await invoke<number>("create_product", { request: formData });

        if (formData.has_variants && variantCombinations.length > 0) {
          await invoke("create_product_variant", {
            productId,
            variants: variantCombinations,
          });
        }

        toast.success("✅ Product created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix validation errors");
      } else {
        console.error("Failed to save product:", error);
        toast.error(`❌ Failed to save product: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;

    try {
      await invoke("delete_product", { productId });
      toast.success("✅ Product deactivated successfully!");
      loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(`❌ Failed to delete product: ${error}`);
    }
  };

  const handleReactivate = async (productId: number) => {
    try {
      await invoke("reactivate_product", { productId });
      toast.success("✅ Product reactivated successfully!");
      loadProducts();
    } catch (error) {
      console.error("Failed to reactivate product:", error);
      toast.error(`❌ Failed to reactivate product: ${error}`);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      category: product.category || "",
      brand: product.brand || "",
      unit: product.unit || "",
      description: product.description || "",
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      wholesale_price: product.wholesale_price || 0,
      tax_rate: product.tax_rate,
      minimum_stock: product.minimum_stock,
      maximum_stock: product.maximum_stock,
      reorder_point: product.reorder_point,
      supplier_id: product.supplier_id,
      has_variants: product.has_variants,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      brand: "",
      unit: "",
      description: "",
      cost_price: 0,
      selling_price: 0,
      wholesale_price: 0,
      tax_rate: 0,
      minimum_stock: 0,
      maximum_stock: 0,
      reorder_point: 0,
      supplier_id: undefined,
      has_variants: false,
    });
    setEditingProduct(null);
    setValidationErrors({});
    setVariantCombinations([]);
  };

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesCategory = filterCategory === "all" || product.category === filterCategory;
      const matchesBrand = filterBrand === "all" || product.brand === filterBrand;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && product.is_active) ||
        (filterStatus === "inactive" && !product.is_active);

      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "sku":
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case "category":
          aValue = a.category?.toLowerCase() || "";
          bValue = b.category?.toLowerCase() || "";
          break;
        case "selling_price":
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, debouncedSearchQuery, filterCategory, filterBrand, filterStatus, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    loadProducts();
    loadMasterData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterCategory, filterBrand, filterStatus, sortColumn, sortDirection]);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const inactiveProducts = totalProducts - activeProducts;
  const lowStockProducts = products.filter((p) => p.is_active && p.has_variants === false).length; // Simplified

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="Manage your product catalog and inventory"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={loadProducts} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active"
          value={activeProducts}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Inactive"
          value={inactiveProducts}
          icon={XCircle}
          gradient="bg-gradient-to-br from-red-500 to-pink-600"
        />
        <StatCard
          title="Categories"
          value={categories.length}
          icon={Tag}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search products..."
        filters={[
          {
            placeholder: "All Categories",
            value: filterCategory,
            onChange: setFilterCategory,
            options: [
              { label: "All Categories", value: "all" },
              ...categories.map((cat) => ({ label: cat.name, value: cat.name })),
            ],
          },
          {
            placeholder: "All Brands",
            value: filterBrand,
            onChange: setFilterBrand,
            options: [
              { label: "All Brands", value: "all" },
              ...brands.map((brand) => ({ label: brand.name, value: brand.name })),
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

      {/* Products Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
          <CardTitle className="flex items-center text-sm sm:text-base">
            <Package className="w-4 h-4 mr-2 text-primary" />
            Product Catalog
            <Badge className="ml-2 text-xs" variant="secondary">
              {filteredAndSortedProducts.length}
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
              {paginatedProducts.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <SortableTableHead
                            label="Product"
                            column="name"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            label="SKU"
                            column="sku"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                            className="hidden md:table-cell"
                          />
                          <SortableTableHead
                            label="Category"
                            column="category"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                            className="hidden lg:table-cell"
                          />
                          <SortableTableHead
                            label="Price"
                            column="selling_price"
                            currentColumn={sortColumn}
                            direction={sortDirection}
                            onSort={handleSort}
                            align="right"
                          />
                          <TableHead className="h-9 px-2 sm:px-4 text-xs">Status</TableHead>
                          <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => (
                          <TableRow
                            key={product.id}
                            className="hover:bg-muted/50 transition-colors border-b h-12"
                          >
                            <TableCell className="py-2 px-2 sm:px-4">
                              <div>
                                <div className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]">
                                  {product.name}
                                </div>
                                {product.brand && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-0.5">
                                    {product.brand}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4 font-mono text-[10px] sm:text-xs hidden md:table-cell">
                              {product.sku}
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4 text-xs hidden lg:table-cell">
                              {product.category || "—"}
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4 text-right text-sm font-bold text-primary">
                              {format(product.selling_price)}
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4">
                              <Badge
                                variant={product.is_active ? "default" : "secondary"}
                                className="text-[10px] px-1.5 h-5"
                              >
                                {product.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4 text-right">
                              <TableActions
                                actions={[
                                  {
                                    label: "Edit Product",
                                    icon: Edit,
                                    onClick: () => openEditDialog(product),
                                  },
                                  product.is_active
                                    ? {
                                        label: "Deactivate",
                                        icon: Trash2,
                                        onClick: () => handleDelete(product.id),
                                        variant: "destructive" as const,
                                      }
                                    : {
                                        label: "Reactivate",
                                        icon: RotateCcw,
                                        onClick: () => handleReactivate(product.id),
                                      },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                isActive={currentPage === pageNum}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              ) : (
                <div className="text-center py-6 md:py-12">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">No Products Found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {debouncedSearchQuery || filterCategory !== "all" || filterBrand !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first product to get started"}
                  </p>
                  {!debouncedSearchQuery &&
                    filterCategory === "all" &&
                    filterBrand === "all" &&
                    filterStatus === "all" && (
                      <Button onClick={openCreateDialog} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter product details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs sm:text-sm">
                  Product Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`h-9 ${validationErrors.name ? "border-red-500" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs sm:text-sm">
                  SKU *
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`h-9 ${validationErrors.sku ? "border-red-500" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode" className="text-xs sm:text-sm">
                  Barcode
                </Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs sm:text-sm">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand" className="text-xs sm:text-sm">
                  Brand
                </Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value) => setFormData({ ...formData, brand: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs sm:text-sm">
                  Unit
                </Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cost_price" className="text-xs sm:text-sm">
                  Cost Price
                </Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="selling_price" className="text-xs sm:text-sm">
                  Selling Price
                </Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax_rate" className="text-xs sm:text-sm">
                  Tax Rate (%)
                </Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Stock Levels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minimum_stock" className="text-xs sm:text-sm">
                  Min Stock
                </Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maximum_stock" className="text-xs sm:text-sm">
                  Max Stock
                </Label>
                <Input
                  id="maximum_stock"
                  type="number"
                  value={formData.maximum_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, maximum_stock: parseInt(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorder_point" className="text-xs sm:text-sm">
                  Reorder Point
                </Label>
                <Input
                  id="reorder_point"
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) =>
                    setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs sm:text-sm">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Has Variants - Only on Create */}
            {!editingProduct && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="has_variants"
                  checked={formData.has_variants}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, has_variants: checked })
                  }
                />
                <Label htmlFor="has_variants" className="text-xs sm:text-sm">
                  This product has variants (Size, Color, etc.)
                </Label>
              </div>
            )}

            {/* Product Variant Manager - Only on Create */}
            {!editingProduct && formData.has_variants && (
              <ProductVariantManager
                onVariantsChange={setVariantCombinations}
                productData={{
                  cost_price: formData.cost_price,
                  selling_price: formData.selling_price,
                }}
              />
            )}
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
