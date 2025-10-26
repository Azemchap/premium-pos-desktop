// src/pages/Products.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import ProductVariantManager, { VariantCombination } from "@/components/ProductVariantManager";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle, Edit, Loader2, MoreHorizontal, Package, Plus, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

// Zod validation schema
const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255, "Name is too long"),
  sku: z.string().min(1, "SKU is required").max(100, "SKU is too long"),
  barcode: z.string().max(100, "Barcode is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional(),
  category: z.string().max(100, "Category is too long").optional(),
  subcategory: z.string().max(100, "Subcategory is too long").optional(),
  brand: z.string().max(100, "Brand is too long").optional(),
  selling_price: z.number().min(0.01, "Selling price is required and must be greater than 0"),
  wholesale_price: z.number().min(0, "Wholesale price must be positive"),
  cost_price: z.number().min(0.01, "Cost price is required and must be greater than 0"),
  tax_rate: z.number().min(0, "Tax rate must be positive").max(100, "Tax rate cannot exceed 100%"),
  is_taxable: z.boolean(),
  unit_of_measure: z.string().min(1, "Unit of measure is required"),
  weight: z.number().min(0, "Weight must be positive"),
  dimensions: z.string().max(100, "Dimensions is too long").optional(),
  supplier_info: z.string().max(500, "Supplier info is too long").optional(),
  reorder_point: z.number().min(0, "Reorder point must be positive").int("Must be a whole number"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  selling_price: number;
  wholesale_price: number;
  cost_price: number;
  tax_rate: number;
  is_taxable: boolean;
  unit_of_measure: string;
  weight: number;
  dimensions?: string;
  supplier_info?: string;
  reorder_point: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MasterItem {
  id: number;
  name: string;
}

type SortColumn = 'name' | 'sku' | 'category' | 'selling_price' | 'is_active';
type SortDirection = 'asc' | 'desc';

export default function Products() {
  const { format } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    selling_price: 0,
    wholesale_price: 0,
    cost_price: 0,
    tax_rate: 0,
    is_taxable: false,
    unit_of_measure: "Each",
    weight: 0,
    dimensions: "",
    supplier_info: "",
    reorder_point: 0,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant management
  const [hasVariants, setHasVariants] = useState(false);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);

  // Master data from database
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [units, setUnits] = useState<MasterItem[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadMasterData = async () => {
    try {
      const [categoriesData, brandsData, unitsData] = await Promise.all([
        invoke<MasterItem[]>("get_categories"),
        invoke<MasterItem[]>("get_brands"),
        invoke<MasterItem[]>("get_units"),
      ]);
      setCategories(categoriesData);
      setBrands(brandsData);
      setUnits(unitsData);
    } catch (error) {
      console.error("Failed to load master data:", error);
      toast.error("Failed to load categories, brands, and units");
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Load ALL products (active and inactive)
      const result = await invoke<Product[]>("get_products");
      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      productSchema.parse(formData);
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

  const handleCreateProduct = async () => {
    if (!validateForm()) {
      return;
    }

    // Validate variants if enabled
    if (hasVariants && variantCombinations.length === 0) {
      toast.error("Please generate at least one variant or disable variants");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // Update existing product
        await invoke("update_product", {
          productId: editingProduct.id,
          request: formData
        });
        toast.success(`✅ Product "${formData.name}" updated successfully!`);
      } else {
        // Create new product
        const productResult = await invoke<Product>("create_product", {
          request: formData
        });

        // If variants are enabled, create all variant combinations
        if (hasVariants && variantCombinations.length > 0) {
          let successCount = 0;
          let failCount = 0;

          for (const variant of variantCombinations) {
            try {
              await invoke("create_product_variant", {
                request: {
                  product_id: productResult.id,
                  sku: variant.sku,
                  barcode: variant.barcode || null,
                  variant_name: variant.variant_name,
                  cost_price: variant.cost_price,
                  selling_price: variant.selling_price,
                  wholesale_price: variant.wholesale_price,
                  variant_value_ids: variant.variant_value_ids,
                }
              });
              successCount++;
            } catch (err) {
              console.error("Failed to create variant:", err);
              failCount++;
            }
          }

          if (failCount > 0) {
            toast.warning(`Product created with ${successCount}/${variantCombinations.length} variants`);
          } else {
            toast.success(`✅ Product "${formData.name}" created with ${successCount} variants!`);
          }
        } else {
          toast.success(`✅ Product "${formData.name}" created successfully!`);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(`❌ Failed to save product: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      description: product.description || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      brand: product.brand || "",
      selling_price: product.selling_price,
      wholesale_price: product.wholesale_price,
      cost_price: product.cost_price,
      tax_rate: product.tax_rate,
      is_taxable: product.is_taxable,
      unit_of_measure: product.unit_of_measure,
      weight: product.weight,
      dimensions: product.dimensions || "",
      supplier_info: product.supplier_info || "",
      reorder_point: product.reorder_point,
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${productName}"?`)) return;

    try {
      await invoke("delete_product", { productId });
      toast.success(`Product "${productName}" deactivated successfully!`);
      loadProducts();
      loadMasterData();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(`Failed to deactivate product: ${error}`);
    }
  };

  const handleReactivateProduct = async (productId: number, productName: string) => {
    if (!confirm(`Are you sure you want to reactivate "${productName}"?`)) return;

    try {
      await invoke("reactivate_product", { productId });
      toast.success(`✅ Product "${productName}" reactivated successfully!`);
      loadProducts();
      loadMasterData();
    } catch (error) {
      console.error("Failed to reactivate product:", error);
      toast.error(`❌ Failed to reactivate product: ${error}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      description: "",
      category: "",
      subcategory: "",
      brand: "",
      selling_price: 0,
      wholesale_price: 0,
      cost_price: 0,
      tax_rate: 0,
      is_taxable: false,
      unit_of_measure: "Each",
      weight: 0,
      dimensions: "",
      supplier_info: "",
      reorder_point: 0,
    });
    setEditingProduct(null);
    setValidationErrors({});
    setHasVariants(false);
    setVariantCombinations([]);
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

  // Auto-filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active);

      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sku':
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'selling_price':
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, debouncedSearchQuery, selectedCategory, selectedBrand, statusFilter, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    loadMasterData();
    loadProducts();
  }, []);

  useEffect(() => {
    // Reset to first page when filters or sort change
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, selectedBrand, statusFilter, sortColumn, sortDirection]);

  // Statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const inactiveProducts = products.filter(p => !p.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="Manage your product catalog and pricing"
        badge={{ text: `${totalProducts} items`, variant: "secondary" }}
        actions={
          <Button onClick={openCreateDialog} size="lg" className="shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Products</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{totalProducts}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Active</p>
                <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">{activeProducts}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-200 dark:border-red-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Inactive</p>
                <p className="text-2xl md:text-3xl font-bold text-red-900 dark:text-red-100">{inactiveProducts}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Auto-filtering */}
      <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:h-4" />
                <Input
                  id="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Showing {filteredAndSortedProducts.length} of {totalProducts} products
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
          <CardTitle className="text-xl font-bold">Product Catalog</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-2 md:space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-xl border-2 border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                    <TableRow>
                      <TableHead className="cursor-pointer px-6 py-4 text-sm font-semibold uppercase tracking-wider" onClick={() => handleSort('name')}>
                        Product {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer px-6 py-4 text-sm font-semibold uppercase tracking-wider hidden md:table-cell" onClick={() => handleSort('sku')}>
                        SKU {sortColumn === 'sku' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer px-6 py-4 text-sm font-semibold uppercase tracking-wider hidden lg:table-cell" onClick={() => handleSort('category')}>
                        Category {sortColumn === 'category' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer px-6 py-4 text-sm font-semibold uppercase tracking-wider" onClick={() => handleSort('selling_price')}>
                        Price {sortColumn === 'selling_price' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer px-6 py-4 text-sm font-semibold uppercase tracking-wider hidden md:table-cell" onClick={() => handleSort('is_active')}>
                        Status {sortColumn === 'is_active' ? (sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />) : <ArrowUpDown className="inline w-4 h-4" />}
                      </TableHead>
                      <TableHead className="px-6 py-4 text-sm font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/30">
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id} className={`hover:bg-primary/5 transition-all duration-200 ${!product.is_active ? "opacity-60" : ""}`}>
                        <TableCell className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-base">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.brand && `${product.brand} • `}
                              {product.description && product.description.length > 50
                                ? `${product.description.substring(0, 50)}...`
                                : product.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 hidden md:table-cell">
                          <div>
                            <div className="font-mono text-sm">{product.sku}</div>
                            {product.barcode && (
                              <div className="text-xs text-muted-foreground">
                                {product.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 hidden lg:table-cell">
                          {product.category ? (
                            <div>
                              <Badge variant="outline">{product.category}</Badge>
                              {product.subcategory && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {product.subcategory}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div>
                            <div className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {format(product.selling_price)}
                            </div>
                            {product.cost_price > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Cost: {format(product.cost_price)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 hidden md:table-cell">
                          <Badge variant={product.is_active ? "default" : "secondary"} className="px-3 py-1">
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {product.is_active ? (
                              <DropdownMenuItem
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="text-destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleReactivateProduct(product.id, product.name)}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Pagination>
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === page}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
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
                </div>
              )}
            </>
          )}

          {!loading && filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-6 md:py-12">
              <Package className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-2 md:mb-4">
                {searchQuery || selectedCategory !== "all" || selectedBrand !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first product"}
              </p>
              {!searchQuery && selectedCategory === "all" && selectedBrand === "all" && (
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Create New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the product information below."
                : "Fill in the product details to add it to your catalog."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:gap-6">
            {/* Basic Information */}
            <div className="space-y-2 md:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                  className={validationErrors.sku ? "border-red-500" : ""}
                />
                {validationErrors.sku && (
                  <p className="text-xs text-red-500">{validationErrors.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter barcode (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2 md:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={validationErrors.selling_price ? "border-red-500" : ""}
                />
                {validationErrors.selling_price && (
                  <p className="text-xs text-red-500">{validationErrors.selling_price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={validationErrors.cost_price ? "border-red-500" : ""}
                />
                {validationErrors.cost_price && (
                  <p className="text-xs text-red-500">{validationErrors.cost_price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wholesale_price">Wholesale Price</Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wholesale_price}
                  onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Categories & Brand */}
            <div className="space-y-2 md:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category || "none"} onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Enter subcategory (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select value={formData.brand || "none"} onValueChange={(value) => setFormData({ ...formData, brand: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
                <Select value={formData.unit_of_measure} onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}>
                  <SelectTrigger>
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

            {/* Additional Details */}
            <div className="space-y-2 md:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="L x W x H (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_taxable"
                  type="checkbox"
                  checked={formData.is_taxable}
                  onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_taxable">Product is taxable</Label>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="space-y-2 md:space-y-4 md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="supplier_info">Supplier Information</Label>
                <Textarea
                  id="supplier_info"
                  value={formData.supplier_info}
                  onChange={(e) => setFormData({ ...formData, supplier_info: e.target.value })}
                  placeholder="Enter supplier details (optional)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Product Variants Section */}
          {!editingProduct && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasVariants"
                  checked={hasVariants}
                  onCheckedChange={(checked) => {
                    setHasVariants(checked as boolean);
                    if (!checked) {
                      setVariantCombinations([]);
                    }
                  }}
                />
                <Label htmlFor="hasVariants" className="cursor-pointer font-semibold">
                  This product has variants (sizes, colors, etc.)
                </Label>
              </div>

              {hasVariants && (
                <ProductVariantManager
                  productName={formData.name}
                  baseSku={formData.sku}
                  baseCostPrice={formData.cost_price}
                  baseSellingPrice={formData.selling_price}
                  baseWholesalePrice={formData.wholesale_price}
                  onVariantsChange={setVariantCombinations}
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (editingProduct ? "Update Product" : "Create Product")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}