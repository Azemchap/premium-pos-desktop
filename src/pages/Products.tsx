// src/pages/Products.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Package, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { invoke } from "@tauri-apps/api/core";
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

export default function Products() {
  const { format } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const categories = [
    "Electronics", "Clothing", "Home & Garden", "Sports", "Books",
    "Automotive", "Health & Beauty", "Toys", "Food & Beverage", "Other"
  ];

  const brands = [
    "Apple", "Samsung", "Nike", "Adidas", "Sony", "LG", "Canon",
    "Dell", "HP", "Microsoft", "Generic", "Other"
  ];

  const units = ["Each", "Box", "Pack", "Kg", "Lb", "Meter", "Liter", "Pair"];

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

    try {
      if (editingProduct) {
        await invoke("update_product", {
          productId: editingProduct.id,
          request: formData
        });
        toast.success(`✅ Product "${formData.name}" updated successfully!`);
      } else {
        await invoke("create_product", {
          request: formData
        });
        toast.success(`✅ Product "${formData.name}" created successfully!`);
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(`❌ Failed to save product: ${error}`);
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
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(`Failed to deactivate product: ${error}`);
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
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Auto-filter products (no button needed)
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && product.is_active) || 
      (statusFilter === "inactive" && !product.is_active);

    return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
  });

  useEffect(() => {
    loadProducts();
  }, []);

  // Statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const inactiveProducts = products.filter(p => !p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog and pricing
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeProducts}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{inactiveProducts}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Auto-filtering */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
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
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {totalProducts} products
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={!product.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.brand && `${product.brand} • `}
                          {product.description && product.description.length > 50
                            ? `${product.description.substring(0, 50)}...`
                            : product.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{product.sku}</div>
                        {product.barcode && (
                          <div className="text-xs text-muted-foreground">
                            {product.barcode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(product.selling_price)}
                        </div>
                        {product.cost_price > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Cost: {format(product.cost_price)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
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
            <div className="space-y-4">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category || "none"} onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
                      <SelectItem key={brand} value={brand}>
                        {brand}
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
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
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
            <div className="space-y-4 md:col-span-2">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct}>
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
