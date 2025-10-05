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
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import debounce from "lodash.debounce";
import { Edit, Filter, MoreHorizontal, Package, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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

const productSchema = z.object({
    name: z.string().trim().min(1, "Product name is required"),
    sku: z.string().trim().min(1, "SKU is required"),
    barcode: z.string().trim().optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().min(1, "Category is required"),
    subcategory: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    unit_of_measure: z.string().min(1, "Unit of measure is required"),
    cost_price: z.number().min(0, "Cost price cannot be negative"),
    selling_price: z.number().positive("Selling price must be greater than 0"),
    wholesale_price: z.number().min(0, "Wholesale price cannot be negative"),
    tax_rate: z.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%"),
    is_taxable: z.boolean(),
    weight: z.number().min(0, "Weight cannot be negative"),
    dimensions: z.string().trim().optional(),
    supplier_info: z.string().trim().optional(),
    reorder_point: z.number().int().min(0, "Reorder point cannot be negative"),
});

export default function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all_categories");
    const [selectedBrand, setSelectedBrand] = useState<string>("all_brands");
    const [activeOnly, setActiveOnly] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [skuError, setSkuError] = useState<string | null>(null);
    const [barcodeError, setBarcodeError] = useState<string | null>(null);

    // Units are kept as a select for standardization, but can be extended or made custom if needed
    const units = ["Each", "Piece", "Box", "Pack", "Kg", "Gram", "Liter", "Meter", "Pair", "Set", "Dozen", "Hour", "Session", "Service", "Other"];

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
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
            tax_rate: 19.25, // Default tax rate (e.g., Cameroon VAT), can be overridden from store config in future
            is_taxable: true,
            unit_of_measure: "Each",
            weight: 0,
            dimensions: "",
            supplier_info: "",
            reorder_point: 0,
        },
    });

    const { handleSubmit, formState: { errors }, reset, control, watch } = form;

    useEffect(() => {
        const loadCategoriesAndBrands = async () => {
            try {
                const fetchedCategories: string[] = await invoke("get_categories");
                const fetchedBrands: string[] = await invoke("get_brands");
                setCategories(fetchedCategories);
                setBrands(fetchedBrands);
            } catch (error) {
                console.error("Failed to load categories or brands:", error);
                toast.error(`Failed to load categories or brands: ${error}`);
            }
        };
        loadCategoriesAndBrands();
        loadProducts();
    }, []);

    useEffect(() => {
        if (isDialogOpen && editingProduct) {
            reset({
                name: editingProduct.name,
                sku: editingProduct.sku,
                barcode: editingProduct.barcode || "",
                description: editingProduct.description || "",
                category: editingProduct.category || "",
                subcategory: editingProduct.subcategory || "",
                brand: editingProduct.brand || "",
                selling_price: editingProduct.selling_price,
                wholesale_price: editingProduct.wholesale_price || 0,
                cost_price: editingProduct.cost_price,
                tax_rate: editingProduct.tax_rate || 19.25,
                is_taxable: editingProduct.is_taxable,
                unit_of_measure: editingProduct.unit_of_measure,
                weight: editingProduct.weight || 0,
                dimensions: editingProduct.dimensions || "",
                supplier_info: editingProduct.supplier_info || "",
                reorder_point: editingProduct.reorder_point || 0,
            });
        } else if (isDialogOpen) {
            reset(); // Reset to default values for new product
        }
    }, [isDialogOpen, editingProduct, reset]);

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
            toast.error(`Failed to load products. Please try again or check your connection. Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadProducts();
    };

    const onSubmit = async (data: z.infer<typeof productSchema>) => {
        try {
            // Clean up form data before sending (e.g., empty strings to undefined if needed)
            const cleanedData: CreateProductRequest = {
                ...data,
                barcode: data.barcode || undefined,
                description: data.description || undefined,
                category: data.category || undefined,
                subcategory: data.subcategory || undefined,
                brand: data.brand || undefined,
                dimensions: data.dimensions || undefined,
                supplier_info: data.supplier_info || undefined,
            };

            if (editingProduct) {
                await invoke("update_product", {
                    productId: editingProduct.id,
                    request: cleanedData
                });
                toast.success("Product updated successfully");
            } else {
                await invoke("create_product", {
                    request: cleanedData
                });
                toast.success("Product created successfully");
            }

            setIsDialogOpen(false);
            setEditingProduct(null);
            loadProducts();
        } catch (error: any) {
            console.error("Failed to save product:", error);
            let errorMessage = "Failed to save product. Please try again.";
            let suggestion = "";

            const errorString = error.toString().toLowerCase();

            if (errorString.includes("unique constraint failed: products.sku")) {
                errorMessage = "SKU is already in use.";
                suggestion = "Please choose a unique SKU and try again.";
            } else if (errorString.includes("unique constraint failed: products.barcode")) {
                errorMessage = "Barcode is already in use.";
                suggestion = "Please choose a unique barcode or leave it blank if not needed.";
            } else if (errorString.includes("database")) {
                suggestion = "Please check your input and try again. If the problem persists, contact support.";
            }

            toast.error(`${errorMessage} ${suggestion}`);
        }
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
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

    const checkUniqueFields = debounce(async (sku: string, barcode: string | undefined, productId?: number) => {
        try {
            const isUnique: boolean = await invoke("check_product_unique", {
                sku,
                barcode,
                excludeProductId: productId
            });
            if (!isUnique) {
                if (sku) {
                    const skuExists = await invoke("check_product_unique", { sku, barcode: undefined, excludeProductId: productId });
                    if (!skuExists) setSkuError("SKU is already in use");
                    else setSkuError(null);
                }
                if (barcode) {
                    const barcodeExists = await invoke("check_product_unique", { sku: "", barcode, excludeProductId: productId });
                    if (!barcodeExists) setBarcodeError("Barcode is already in use");
                    else setBarcodeError(null);
                }
            } else {
                setSkuError(null);
                setBarcodeError(null);
            }
        } catch (error) {
            console.error("Failed to check unique fields:", error);
            toast.error("Failed to validate SKU or barcode. Please try again.");
        }
    }, 500);

    useEffect(() => {
        if (watch("sku") || watch("barcode")) {
            checkUniqueFields(watch("sku"), watch("barcode"), editingProduct?.id);
        }
        return () => {
            checkUniqueFields.cancel();
        };
    }, [watch("sku"), watch("barcode"), editingProduct?.id]);

    return (
        <div className="space-y-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Products</h1>
                <Button onClick={() => {
                    setEditingProduct(null);
                    setIsDialogOpen(true);
                }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Search by name, SKU, or barcode..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_categories">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by brand" />
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
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="activeOnly"
                                checked={activeOnly}
                                onCheckedChange={(checked) => setActiveOnly(checked === true)}
                            />
                            <Label htmlFor="activeOnly">Active only</Label>
                        </div>
                        <Button onClick={handleSearch}>
                            <Filter className="mr-2 h-4 w-4" /> Filter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Product List</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-muted-foreground">No products found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.sku}</TableCell>
                                            <TableCell>${product.selling_price.toFixed(2)}</TableCell>
                                            <TableCell>{product.category || "N/A"}</TableCell>
                                            <TableCell>{product.brand || "N/A"}</TableCell>
                                            <TableCell>
                                                <Badge variant={product.is_active ? "default" : "secondary"}>
                                                    {product.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Product Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setEditingProduct(null);
                    reset();
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? "Update the product details below." : "Enter the details for the new product or service."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    {...form.register("name")}
                                    placeholder="Enter product name"
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU *</Label>
                                <Input
                                    id="sku"
                                    {...form.register("sku")}
                                    placeholder="Enter unique SKU"
                                />
                                {errors.sku && <p className="text-sm text-red-500">{errors.sku.message}</p>}
                                {skuError && <p className="text-sm text-red-500">{skuError}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="barcode">Barcode</Label>
                                <Input
                                    id="barcode"
                                    {...form.register("barcode")}
                                    placeholder="Enter barcode (optional)"
                                />
                                {errors.barcode && <p className="text-sm text-red-500">{errors.barcode.message}</p>}
                                {barcodeError && <p className="text-sm text-red-500">{barcodeError}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    {...form.register("description")}
                                    placeholder="Enter product description (optional)"
                                    rows={3}
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cost_price">Cost Price *</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    step="0.01"
                                    {...form.register("cost_price", { valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                                {errors.cost_price && <p className="text-sm text-red-500">{errors.cost_price.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="selling_price">Selling Price *</Label>
                                <Input
                                    id="selling_price"
                                    type="number"
                                    step="0.01"
                                    {...form.register("selling_price", { valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                                {errors.selling_price && <p className="text-sm text-red-500">{errors.selling_price.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="wholesale_price">Wholesale Price</Label>
                                <Input
                                    id="wholesale_price"
                                    type="number"
                                    step="0.01"
                                    {...form.register("wholesale_price", { valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                                {errors.wholesale_price && <p className="text-sm text-red-500">{errors.wholesale_price.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reorder_point">Reorder Point</Label>
                                <Input
                                    id="reorder_point"
                                    type="number"
                                    min="0"
                                    {...form.register("reorder_point", { valueAsNumber: true })}
                                    placeholder="0"
                                />
                                {errors.reorder_point && <p className="text-sm text-red-500">{errors.reorder_point.message}</p>}
                            </div>
                        </div>

                        {/* Categories & Brand */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Input
                                    id="category"
                                    {...form.register("category")}
                                    placeholder="Enter category (e.g., Electronics, Services, Medical Supplies)"
                                />
                                {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subcategory">Subcategory</Label>
                                <Input
                                    id="subcategory"
                                    {...form.register("subcategory")}
                                    placeholder="Enter subcategory (optional)"
                                />
                                {errors.subcategory && <p className="text-sm text-red-500">{errors.subcategory.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Input
                                    id="brand"
                                    {...form.register("brand")}
                                    placeholder="Enter brand (optional)"
                                />
                                {errors.brand && <p className="text-sm text-red-500">{errors.brand.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
                                <Controller
                                    name="unit_of_measure"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                    )}
                                />
                                {errors.unit_of_measure && <p className="text-sm text-red-500">{errors.unit_of_measure.message}</p>}
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
                                    {...form.register("tax_rate", { valueAsNumber: true })}
                                    placeholder="19.25"
                                />
                                {errors.tax_rate && <p className="text-sm text-red-500">{errors.tax_rate.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (kg)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...form.register("weight", { valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                                {errors.weight && <p className="text-sm text-red-500">{errors.weight.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dimensions">Dimensions</Label>
                                <Input
                                    id="dimensions"
                                    {...form.register("dimensions")}
                                    placeholder="L x W x H (optional)"
                                />
                                {errors.dimensions && <p className="text-sm text-red-500">{errors.dimensions.message}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Controller
                                    name="is_taxable"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="is_taxable"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
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
                                    {...form.register("supplier_info")}
                                    placeholder="Enter supplier details (optional)"
                                    rows={2}
                                />
                                {errors.supplier_info && <p className="text-sm text-red-500">{errors.supplier_info.message}</p>}
                            </div>
                        </div>
                    </form>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            onClick={handleSubmit(onSubmit)}
                            disabled={!!skuError || !!barcodeError || Object.keys(errors).length > 0}
                        >
                            {editingProduct ? "Update Product" : "Create Product"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}