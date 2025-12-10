// src/pages/Products.tsx - Optimized Mobile-First Design
import PageHeader from "@/components/PageHeader";
import ProductVariantManager, { VariantCombination } from "@/components/ProductVariantManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  ChevronLeft,
  ChevronRight,
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

const ITEMS_PER_PAGE = 10;

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
  const [hasVariants, setHasVariants] = useState(false);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [units, setUnits] = useState<MasterItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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
      toast.error("Failed to load master data");
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
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
      }
      return false;
    }
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    if (hasVariants && variantCombinations.length === 0) {
      toast.error("Please generate at least one variant");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await invoke("update_product", { productId: editingProduct.id, request: formData });
        toast.success(`Product "${formData.name}" updated`);
      } else {
        const productResult = await invoke<Product>("create_product", { request: formData });

        if (hasVariants && variantCombinations.length > 0) {
          let successCount = 0;
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
            }
          }
          toast.success(`Product created with ${successCount} variants`);
        } else {
          toast.success(`Product "${formData.name}" created`);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(`Failed to save product: ${error}`);
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
    if (!confirm(`Deactivate "${productName}"?`)) return;
    try {
      await invoke("delete_product", { productId });
      toast.success(`Product "${productName}" deactivated`);
      loadProducts();
    } catch (error) {
      toast.error(`Failed to deactivate: ${error}`);
    }
  };

  const handleReactivateProduct = async (productId: number, productName: string) => {
    if (!confirm(`Reactivate "${productName}"?`)) return;
    try {
      await invoke("reactivate_product", { productId });
      toast.success(`Product "${productName}" reactivated`);
      loadProducts();
    } catch (error) {
      toast.error(`Failed to reactivate: ${error}`);
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

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
  }, [debouncedSearchQuery, selectedCategory, selectedBrand, statusFilter]);

  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="inline w-4 h-4 ml-1" />;
    return sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />;
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none px-3 py-2 sm:px-6 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Package}
          title="Products"
          subtitle="Manage your product catalog"
          actions={
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="h-11 touch-manipulation">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          }
        />
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Total</p>
                    <p className="text-2xl font-bold mt-1 truncate">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Active</p>
                    <p className="text-2xl font-bold mt-1 truncate">{stats.active}</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-white flex-1 min-w-0">
                    <p className="text-xs opacity-90 font-medium">Inactive</p>
                    <p className="text-2xl font-bold mt-1 truncate">{stats.inactive}</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filters */}
          <Card className="border-2">
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 touch-manipulation"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-11 touch-manipulation text-xs sm:text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-11 touch-manipulation text-xs sm:text-sm">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 touch-manipulation text-xs sm:text-sm col-span-2 sm:col-span-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredAndSortedProducts.length} of {products.length} products
              </p>
            </CardContent>
          </Card>

          {/* Products List */}
          {loading ? (
            <Card className="border-2">
              <CardContent className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : filteredAndSortedProducts.length === 0 ? (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-2">No products found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search" : "Get started by adding your first product"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="h-11 touch-manipulation">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="lg:hidden space-y-2">
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className={`border-2 ${!product.is_active ? "opacity-60" : ""}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                            <Badge variant={product.is_active ? "default" : "secondary"} className="text-[10px]">
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {product.category && (
                            <Badge variant="outline" className="text-[10px] mr-1">{product.category}</Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 touch-manipulation">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {product.is_active ? (
                              <DropdownMenuItem onClick={() => handleDeleteProduct(product.id, product.name)} className="text-destructive">
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivateProduct(product.id, product.name)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Selling Price</p>
                          <p className="text-lg font-bold text-primary">{format(product.selling_price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Cost Price</p>
                          <p className="text-sm font-semibold">{format(product.cost_price)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: Table */}
              <Card className="hidden lg:block border-2">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                          Product <SortIcon column="name" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("sku")}>
                          SKU <SortIcon column="sku" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                          Category <SortIcon column="category" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("selling_price")}>
                          Price <SortIcon column="selling_price" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("is_active")}>
                          Status <SortIcon column="is_active" />
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow key={product.id} className={!product.is_active ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="font-semibold text-sm truncate max-w-[200px]">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                          <TableCell>
                            {product.category ? (
                              <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-primary">{format(product.selling_price)}</div>
                            <div className="text-xs text-muted-foreground">Cost: {format(product.cost_price)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {product.is_active ? (
                                  <DropdownMenuItem onClick={() => handleDeleteProduct(product.id, product.name)} className="text-destructive">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleReactivateProduct(product.id, product.name)}>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl p-0 gap-0 flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="px-4 py-3 border-b flex-none">
            <DialogTitle className="text-base">{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingProduct ? "Update product information" : "Add a new product to your catalog"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    className={`h-11 touch-manipulation ${validationErrors.name ? "border-red-500" : ""}`}
                  />
                  {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">SKU *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                    className={`h-11 touch-manipulation ${validationErrors.sku ? "border-red-500" : ""}`}
                  />
                  {validationErrors.sku && <p className="text-xs text-red-500">{validationErrors.sku}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Barcode</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Optional"
                    className="h-11 touch-manipulation"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Selling Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className={`h-11 touch-manipulation ${validationErrors.selling_price ? "border-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cost Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className={`h-11 touch-manipulation ${validationErrors.cost_price ? "border-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Wholesale Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    className="h-11 touch-manipulation"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="h-11 touch-manipulation"
                  />
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    id="is_taxable"
                    checked={formData.is_taxable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked as boolean })}
                  />
                  <Label htmlFor="is_taxable" className="text-xs cursor-pointer">Product is taxable</Label>
                </div>
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select
                    value={formData.category || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="h-11 touch-manipulation">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Brand</Label>
                  <Select
                    value={formData.brand || "none"}
                    onValueChange={(value) => setFormData({ ...formData, brand: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="h-11 touch-manipulation">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Brand</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Unit *</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                  >
                    <SelectTrigger className="h-11 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reorder Point</Label>
                  <Input
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                    className="h-11 touch-manipulation"
                  />
                </div>
              </div>

              {/* Variants */}
              {!editingProduct && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasVariants"
                      checked={hasVariants}
                      onCheckedChange={(checked) => {
                        setHasVariants(checked as boolean);
                        if (!checked) setVariantCombinations([]);
                      }}
                    />
                    <Label htmlFor="hasVariants" className="cursor-pointer text-sm font-medium">
                      This product has variants
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
            </div>
          </ScrollArea>

          <DialogFooter className="flex-none border-t p-3 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="flex-1 h-11 touch-manipulation"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={isSubmitting} className="flex-1 h-11 touch-manipulation">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingProduct ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}