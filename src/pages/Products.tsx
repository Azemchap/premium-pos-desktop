// src/pages/Products.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { invoke } from "@tauri-apps/api/core";
import { Edit, Filter, MoreHorizontal, Package, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

interface CreateProductRequest {
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
}

export default function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [activeOnly, setActiveOnly] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<CreateProductRequest>({
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
        tax_rate: 19.25, // Cameroon standard VAT rate
        is_taxable: true,
        unit_of_measure: "Each",
        weight: 0,
        dimensions: "",
        supplier_info: "",
        reorder_point: 0,
    });

    // Common categories for Cameroon market
    const categories = [
        "Electronics", "Clothing & Fashion", "Home & Kitchen", "Sports & Fitness",
        "Books & Stationery", "Automotive", "Health & Beauty", "Toys & Games",
        "Food & Beverages", "Mobile & Accessories", "Furniture", "Hardware & Tools", "Other"
    ];

    const brands = [
        "Samsung", "Apple", "Tecno", "Infinix", "Nokia", "Huawei", "LG",
        "Sony", "Canon", "HP", "Dell", "Adidas", "Nike", "Generic", "Local Brand", "Other"
    ];

    const units = ["Each", "Piece", "Box", "Pack", "Kg", "Gram", "Liter", "Meter", "Pair", "Set", "Dozen"];

    const loadProducts = async () => {
        try {
            setLoading(true);
            let result: Product[];

            if (searchQuery.trim()) {
                result = await invoke<Product[]>("search_products", {
                    query: searchQuery.trim()
                });
            } else {
                result = await invoke<Product[]>("get_products");
            }

            // Apply client-side filtering for category, brand, and status
            let filteredProducts = result;

            if (selectedCategory && selectedCategory !== "all_categories") {
                filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
            }

            if (selectedBrand && selectedBrand !== "all_brands") {
                filteredProducts = filteredProducts.filter(p => p.brand === selectedBrand);
            }

            if (activeOnly) {
                filteredProducts = filteredProducts.filter(p => p.is_active);
            }

            setProducts(filteredProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
            toast.error("Failed to load products: " + error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadProducts();
    };

    const handleCreateProduct = async () => {
        try {
            // Basic validation
            if (!formData.name.trim()) {
                toast.error("Product name is required");
                return;
            }
            if (!formData.sku.trim()) {
                toast.error("SKU is required");
                return;
            }
            if (!formData.category || formData.category === "select_category") {
                toast.error("Category is required");
                return;
            }
            if (formData.selling_price <= 0) {
                toast.error("Selling price must be greater than 0");
                return;
            }
            if (formData.cost_price < 0) {
                toast.error("Cost price cannot be negative");
                return;
            }

            // Clean up form data before sending
            const cleanedFormData = {
                ...formData,
                brand: formData.brand === "no_brand" ? "" : formData.brand
            };

            if (editingProduct) {
                await invoke("update_product", {
                    productId: editingProduct.id,
                    request: cleanedFormData
                });
                toast.success("Product updated successfully");
            } else {
                await invoke("create_product", {
                    request: cleanedFormData
                });
                toast.success("Product created successfully");
            }

            setIsDialogOpen(false);
            resetForm();
            loadProducts();
        } catch (error) {
            console.error("Failed to save product:", error);
            toast.error("Failed to save product: " + error);
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
            brand: product.brand || "no_brand",
            selling_price: product.selling_price,
            wholesale_price: product.wholesale_price || 0,
            cost_price: product.cost_price,
            tax_rate: product.tax_rate || 19.25,
            is_taxable: product.is_taxable,
            unit_of_measure: product.unit_of_measure,
            weight: product.weight || 0,
            dimensions: product.dimensions || "",
            supplier_info: product.supplier_info || "",
            reorder_point: product.reorder_point || 0,
        });
        setIsDialogOpen(true);
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            return;
        }

        try {
            await invoke("delete_product", { productId });
            toast.success("Product deleted successfully");
            loadProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast.error("Failed to delete product: " + error);
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
            tax_rate: 19.25,
            is_taxable: true,
            unit_of_measure: "Each",
            weight: 0,
            dimensions: "",
            supplier_info: "",
            reorder_point: 0,
        });
        setEditingProduct(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-CM', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount) + ' FCFA';
    };

    useEffect(() => {
        loadProducts();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Products</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your product catalog and inventory
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    id="search"
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={selectedCategory || "all_categories"} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_categories">All Categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Select value={selectedBrand || "all_brands"} onValueChange={setSelectedBrand}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_brands">All Brands</SelectItem>
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
                            <Select value={activeOnly ? "active" : "all"} onValueChange={(value) => setActiveOnly(value === "active")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active Only</SelectItem>
                                    <SelectItem value="all">All Products</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button onClick={handleSearch} className="flex items-center">
                            <Filter className="w-4 h-4 mr-2" />
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Catalog ({products.length} products)</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-10 w-[100px]" />
                                </div>
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
                                {products.map((product) => (
                                    <TableRow key={product.id}>
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
                                            <div>
                                                <Badge variant="outline">{product.category || 'Uncategorized'}</Badge>
                                                {product.subcategory && (
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {product.subcategory}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {formatCurrency(product.selling_price)}
                                                </div>
                                                {product.cost_price > 0 && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Cost: {formatCurrency(product.cost_price)}
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
                                                        onClick={() => handleDeleteProduct(product.id)}
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
                    )}

                    {!loading && products.length === 0 && (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No products found</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchQuery || (selectedCategory && selectedCategory !== "all_categories") || (selectedBrand && selectedBrand !== "all_brands")
                                    ? "Try adjusting your search criteria"
                                    : "Get started by creating your first product"}
                            </p>
                            {!searchQuery && (!selectedCategory || selectedCategory === "all_categories") && (!selectedBrand || selectedBrand === "all_brands") && (
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
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU *</Label>
                                <Input
                                    id="sku"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Enter SKU"
                                />
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

                        {/* Pricing & Inventory */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="selling_price">Selling Price (FCFA) *</Label>
                                <Input
                                    id="selling_price"
                                    type="number"
                                    min="0"
                                    value={formData.selling_price}
                                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cost_price">Cost Price (FCFA) *</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    min="0"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="wholesale_price">Wholesale Price (FCFA)</Label>
                                <Input
                                    id="wholesale_price"
                                    type="number"
                                    min="0"
                                    value={formData.wholesale_price}
                                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
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
                        </div>

                        {/* Categories & Brand */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={formData.category || "select_category"} onValueChange={(value) => setFormData({ ...formData, category: value === "select_category" ? "" : value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="select_category" disabled>Select category</SelectItem>
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
                                <Select value={formData.brand || "no_brand"} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no_brand">No Brand</SelectItem>
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
                                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.tax_rate}
                                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                                    placeholder="19.25"
                                />
                            </div>

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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_taxable"
                                    checked={formData.is_taxable}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked === true })}
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