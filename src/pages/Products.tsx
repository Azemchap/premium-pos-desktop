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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Product } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Edit,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
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

interface MasterItem {
  id: number;
  name: string;
}

type SortColumn = "name" | "sku" | "category" | "selling_price" | "is_active";
type SortDirection = "asc" | "desc";

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
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

    if (hasVariants && variantCombinations.length === 0) {
      toast.error("Please generate at least one variant or disable variants");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await invoke("update_product", {
          productId: editingProduct.id,
          request: formData,
        });
        toast.success(`✅ Product "${formData.name}" updated successfully!`);
      } else {
        const productResult = await invoke<Product>("create_product", {
          request: formData,
        });

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
                },
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
          aValue = (a.category || "").toLowerCase();
          bValue = (b.category || "").toLowerCase();
          break;
        case "selling_price":
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        case "is_active":
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    loadMasterData();
    loadProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, selectedBrand, statusFilter, sortColumn, sortDirection]);

  // Statistics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const inactiveProducts = products.filter((p) => !p.is_active).length;

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="inline w-4 h-4 ml-1" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="inline w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="inline w-4 h-4 ml-1" />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 ">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="Manage your products"
        actions={
          <Button onClick={openCreateDialog} size="sm" className="shadow-md">
            <Plus className="w-4 h-4" /> Create Product
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Total </p>
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalProducts}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Active</p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{activeProducts}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-200 dark:border-red-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Inactive</p>
                <p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-100">{inactiveProducts}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-5 h-5 text-white" />
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
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="space-y-1.5 ">
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm">
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

              <div className="space-y-1.5 hidden md:block ">
                <Label htmlFor="brand" className="text-xs">
                  Brand
                </Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-9 text-sm">
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

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
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
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            Showing {filteredAndSortedProducts.length} of {totalProducts} products
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200 p-0">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
          <CardTitle className="text-lg font-bold">Product Catalog</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2 md:space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                        <TableRow>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            onClick={() => handleSort("name")}
                          >
                            Product <SortIcon column="name" />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                            onClick={() => handleSort("sku")}
                          >
                            SKU <SortIcon column="sku" />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell"
                            onClick={() => handleSort("category")}
                          >
                            Category <SortIcon column="category" />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            onClick={() => handleSort("selling_price")}
                          >
                            Price <SortIcon column="selling_price" />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                            onClick={() => handleSort("is_active")}
                          >
                            Status <SortIcon column="is_active" />
                          </TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/30">
                        {paginatedProducts.map((product) => (
                          <TableRow
                            key={product.id}
                            className={`hover:bg-primary/5 transition-all duration-200 ${!product.is_active ? "opacity-60" : ""
                              }`}
                          >
                            <TableCell className="px-4 py-3">
                              <div>
                                <div className="font-semibold text-sm truncate max-w-[140px] md:max-w-[320px]" title={product.name}>
                                  {product.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {product.brand && `${product.brand} • `}
                                  {product.description && product.description.length > 50
                                    ? `${product.description.substring(0, 50)}...`
                                    : product.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden md:table-cell">
                              <div>
                                <div className="font-mono text-xs" title={product.sku}>
                                  {product.sku}
                                </div>
                                {product.barcode && (
                                  <div className="text-[11px] text-muted-foreground" title={product.barcode}>
                                    {product.barcode}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden lg:table-cell">
                              {product.category ? (
                                <div>
                                  <Badge variant="outline" title={product.category}>
                                    {product.category}
                                  </Badge>
                                  {product.subcategory && (
                                    <div className="text-xs text-muted-foreground mt-1">{product.subcategory}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div>
                                <div className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                  {format(product.selling_price)}
                                </div>
                                {product.cost_price > 0 && (
                                  <div className="text-xs text-muted-foreground">Cost: {format(product.cost_price)}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 hidden md:table-cell">
                              <Badge variant={product.is_active ? "default" : "secondary"} className="px-2 py-0.5 text-xs">
                                {product.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Actions for product">
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
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
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
                </div>
              )}
            </>
          )}

          {!loading && filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-6 md:py-12">
              <Package className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-2 md:mb-4 text-sm">
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

      {/* Create/Edit Product Dialog - Mobile Responsive */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingProduct ? "Edit Product" : "Create New Product"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingProduct
                ? "Update the product information below."
                : "Fill in the product details to add it to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">
                  Product Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs font-medium">
                  SKU *
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                  className={`h-9 text-sm ${validationErrors.sku ? "border-red-500" : ""}`}
                />
                {validationErrors.sku && <p className="text-xs text-red-500">{validationErrors.sku}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="barcode" className="text-xs font-medium">
                  Barcode
                </Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter barcode (optional)"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="selling_price" className="text-xs font-medium">
                  Selling Price *
                </Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={`h-9 text-sm ${validationErrors.selling_price ? "border-red-500" : ""}`}
                />
                {validationErrors.selling_price && (
                  <p className="text-xs text-red-500">{validationErrors.selling_price}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost_price" className="text-xs font-medium">
                  Cost Price *
                </Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={`h-9 text-sm ${validationErrors.cost_price ? "border-red-500" : ""}`}
                />
                {validationErrors.cost_price && <p className="text-xs text-red-500">{validationErrors.cost_price}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wholesale_price" className="text-xs font-medium">
                  Wholesale Price
                </Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wholesale_price}
                  onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tax_rate" className="text-xs font-medium">
                  Tax Rate (%)
                </Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked as boolean })}
                />
                <Label htmlFor="is_taxable" className="text-xs font-medium cursor-pointer">
                  Product is taxable
                </Label>
              </div>
            </div>

            {/* Categories & Brand */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-medium">
                  Category
                </Label>
                <Select
                  value={formData.category || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="h-9 text-sm">
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

              <div className="space-y-1.5">
                <Label htmlFor="subcategory" className="text-xs font-medium">
                  Subcategory
                </Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Enter subcategory (optional)"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand" className="text-xs font-medium">
                  Brand
                </Label>
                <Select
                  value={formData.brand || "none"}
                  onValueChange={(value) => setFormData({ ...formData, brand: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="h-9 text-sm">
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

              <div className="space-y-1.5">
                <Label htmlFor="unit_of_measure" className="text-xs font-medium">
                  Unit of Measure *
                </Label>
                <Select
                  value={formData.unit_of_measure}
                  onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
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
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs font-medium">
                  Weight (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dimensions" className="text-xs font-medium">
                  Dimensions
                </Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="L x W x H (optional)"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reorder_point" className="text-xs font-medium">
                  Reorder Point
                </Label>
                <Input
                  id="reorder_point"
                  type="number"
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Supplier Info */}
            <div className="space-y-3 md:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="supplier_info" className="text-xs font-medium">
                  Supplier Information
                </Label>
                <Textarea
                  id="supplier_info"
                  value={formData.supplier_info}
                  onChange={(e) => setFormData({ ...formData, supplier_info: e.target.value })}
                  placeholder="Enter supplier details (optional)"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Product Variants Section */}
          {!editingProduct && (
            <div className="space-y-3 border-t pt-4 mt-4">
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
                <Label htmlFor="hasVariants" className="cursor-pointer font-semibold text-sm">
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

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingProduct ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}