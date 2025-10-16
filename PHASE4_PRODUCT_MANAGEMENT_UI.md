# Phase 4: Frontend - Product Management UI

**Timeline:** Week 7-8 after Phase 3  
**Dependencies:** Phase 1-3 complete  
**Complexity:** High  

---

## Overview

Build comprehensive UI for:
- Multi-variant product management
- Batch viewing and management
- Expiry tracking dashboards
- Master data management (categories, brands, units, suppliers)
- Product search and filtering

---

## Components to Build

### 1. Multi-Variant Product Form

```typescript
// src/pages/Products/ProductFormMultiVariant.tsx

interface ProductFormData {
  product: {
    name: string;
    description: string;
    categoryId: number;
    brandId: number;
    isActive: boolean;
    isTaxable: boolean;
    taxRate: number;
    trackInventory: boolean;
    trackBatches: boolean;
    imageUrl: string;
    notes: string;
  };
  variants: ProductVariant[];
}

export const ProductFormMultiVariant: React.FC = () => {
  const [formData, setFormData] = useState<ProductFormData>({
    product: initialProductData,
    variants: [{ isDefault: true, ...initialVariantData }],
  });

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { ...initialVariantData }],
    });
  };

  const removeVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleSubmit = async () => {
    try {
      await invoke('create_product_with_variants', {
        product: formData.product,
        variants: formData.variants,
      });
      toast.success('Product created with variants!');
      navigate('/products');
    } catch (error) {
      toast.error(`Failed: ${error}`);
    }
  };

  return (
    <form className="space-y-6">
      {/* Product Base Info */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Input
            label="Product Name"
            value={formData.product.name}
            onChange={(e) => updateProduct('name', e.target.value)}
            required
          />

          <Textarea
            label="Description"
            value={formData.product.description}
            onChange={(e) => updateProduct('description', e.target.value)}
            rows={3}
          />

          <Select
            label="Category"
            value={formData.product.categoryId}
            onChange={(value) => updateProduct('categoryId', value)}
          >
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Brand"
            value={formData.product.brandId}
            onChange={(value) => updateProduct('brandId', value)}
          >
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </Select>

          <div className="col-span-2 grid grid-cols-3 gap-4">
            <Checkbox
              label="Track Inventory"
              checked={formData.product.trackInventory}
              onChange={(checked) => updateProduct('trackInventory', checked)}
            />
            <Checkbox
              label="Track Batches"
              checked={formData.product.trackBatches}
              onChange={(checked) => updateProduct('trackBatches', checked)}
            />
            <Checkbox
              label="Taxable"
              checked={formData.product.isTaxable}
              onChange={(checked) => updateProduct('isTaxable', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Product Variants</span>
            <Button onClick={addVariant} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.variants.map((variant, index) => (
            <Card key={index} className="border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <h4>Variant {index + 1}</h4>
                {formData.variants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <Input
                  label="Variant Name"
                  placeholder="e.g., 330ml Bottle, 24-pack Case"
                  value={variant.variantName}
                  onChange={(e) => updateVariant(index, 'variantName', e.target.value)}
                  required
                />

                <Input
                  label="SKU"
                  placeholder="AUTO-GENERATED"
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                />

                <Input
                  label="Barcode"
                  value={variant.barcode}
                  onChange={(e) => updateVariant(index, 'barcode', e.target.value)}
                />

                <Select
                  label="Unit of Measure"
                  value={variant.unitId}
                  onChange={(value) => updateVariant(index, 'unitId', value)}
                >
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </Select>

                <Input
                  type="number"
                  label="Unit Quantity"
                  value={variant.unitQuantity}
                  onChange={(e) => updateVariant(index, 'unitQuantity', parseFloat(e.target.value))}
                  step="0.01"
                />

                <Input
                  type="number"
                  label="Selling Price"
                  value={variant.defaultSellingPrice}
                  onChange={(e) => updateVariant(index, 'defaultSellingPrice', parseFloat(e.target.value))}
                  step="0.01"
                  required
                />

                <Input
                  type="number"
                  label="Wholesale Price"
                  value={variant.defaultWholesalePrice}
                  onChange={(e) => updateVariant(index, 'defaultWholesalePrice', parseFloat(e.target.value))}
                  step="0.01"
                />

                <Input
                  type="number"
                  label="Weight (kg)"
                  value={variant.weight}
                  onChange={(e) => updateVariant(index, 'weight', parseFloat(e.target.value))}
                  step="0.01"
                />

                <Input
                  type="number"
                  label="Reorder Point"
                  value={variant.reorderPoint}
                  onChange={(e) => updateVariant(index, 'reorderPoint', parseInt(e.target.value))}
                />

                <div className="col-span-3">
                  <Checkbox
                    label="Set as default variant"
                    checked={variant.isDefault}
                    onChange={(checked) => {
                      // Only one can be default
                      const newVariants = formData.variants.map((v, i) => ({
                        ...v,
                        isDefault: i === index ? checked : false,
                      }));
                      setFormData({ ...formData, variants: newVariants });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => navigate('/products')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Create Product with {formData.variants.length} Variant(s)
        </Button>
      </div>
    </form>
  );
};
```

---

### 2. Product List with Variants

```typescript
// src/pages/Products/ProductListWithVariants.tsx

export const ProductListWithVariants: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    search: '',
    categoryId: null,
    brandId: null,
    showInactive: false,
  });

  const toggleProduct = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-4 gap-4 p-4">
          <Input
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Select
            value={filters.categoryId}
            onChange={(value) => setFilters({ ...filters, categoryId: value })}
          >
            <SelectItem value={null}>All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </Select>
          <Select
            value={filters.brandId}
            onChange={(value) => setFilters({ ...filters, brandId: value })}
          >
            <SelectItem value={null}>All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </Select>
          <Checkbox
            label="Show Inactive"
            checked={filters.showInactive}
            onChange={(checked) => setFilters({ ...filters, showInactive: checked })}
          />
        </CardContent>
      </Card>

      {/* Product List */}
      <div className="space-y-2">
        {products.map((product) => (
          <Card key={product.product.id}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleProduct(product.product.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ChevronRight
                    className={`w-5 h-5 transition-transform ${
                      expandedProducts.has(product.product.id) ? 'rotate-90' : ''
                    }`}
                  />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {product.product.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {product.product.category} • {product.variants.length} variant(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={product.product.isActive ? 'success' : 'secondary'}>
                    {product.product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => editProduct(product.product.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => viewBatches(product.product.id)}>
                        View Batches
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addToPO(product.product.id)}>
                        Add to PO
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            {expandedProducts.has(product.product.id) && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variantData) => (
                      <TableRow key={variantData.variant.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {variantData.variant.variantName}
                            </div>
                            {variantData.variant.isDefault && (
                              <Badge variant="outline" size="sm">
                                Default
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {variantData.variant.sku}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {variantData.variant.barcode || '—'}
                        </TableCell>
                        <TableCell>
                          {variantData.unit.abbreviation}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(variantData.variant.defaultSellingPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {variantData.inventory?.availableStock || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {variantData.batches.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              variantData.variant.isActive ? 'success' : 'secondary'
                            }
                          >
                            {variantData.variant.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewVariantBatches(variantData.variant.id)}
                          >
                            View Batches
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
```

---

### 3. Batch Management Dashboard

```typescript
// src/pages/Inventory/BatchDashboard.tsx

export const BatchDashboard: React.FC = () => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [view, setView] = useState<'all' | 'expiring' | 'low' | 'by-supplier'>('all');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={batches.length}
          icon={<Package />}
        />
        <StatCard
          title="Expiring Soon"
          value={batches.filter(isExpiringSoon).length}
          icon={<AlertCircle />}
          variant="warning"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(calculateTotalValue(batches))}
          icon={<DollarSign />}
        />
        <StatCard
          title="Suppliers"
          value={new Set(batches.map((b) => b.supplierId)).size}
          icon={<Users />}
        />
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="all">All Batches</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="low">Low Stock</TabsTrigger>
          <TabsTrigger value="by-supplier">By Supplier</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <BatchTable batches={batches} />
        </TabsContent>

        <TabsContent value="expiring">
          <ExpiringBatchesView batches={batches.filter(isExpiringSoon)} />
        </TabsContent>

        <TabsContent value="low">
          <LowStockBatchesView batches={batches.filter(isLowStock)} />
        </TabsContent>

        <TabsContent value="by-supplier">
          <BatchesBySupplierView batches={batches} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BatchTable: React.FC<{ batches: InventoryBatch[] }> = ({ batches }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Batch #</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Available</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell className="font-mono">{batch.batchNumber}</TableCell>
            <TableCell>{batch.productVariant.name}</TableCell>
            <TableCell>{batch.supplier?.name || '—'}</TableCell>
            <TableCell>{formatDate(batch.receivedDate)}</TableCell>
            <TableCell>
              {batch.expiryDate ? (
                <div className="flex items-center space-x-2">
                  <span>{formatDate(batch.expiryDate)}</span>
                  {getExpiryBadge(batch.expiryDate)}
                </div>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(batch.costPrice)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {batch.availableQuantity} / {batch.currentQuantity}
            </TableCell>
            <TableCell>
              <Badge variant={getStockStatusVariant(batch)}>
                {getStockStatus(batch)}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => viewBatchDetails(batch.id)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => adjustBatch(batch.id)}>
                    Adjust Quantity
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => viewMovements(batch.id)}>
                    View Movements
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

## Master Data Management Pages

### Categories Management

```typescript
// src/pages/Settings/CategoryManagement.tsx

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      await invoke('update_category', { categoryId: editingCategory.id, data });
    } else {
      await invoke('create_category', { data });
    }
    loadCategories();
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => { setEditingCategory(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Tree view for hierarchical categories */}
      <CategoryTree categories={categories} onEdit={...} onDelete={...} />

      {/* Dialog for add/edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <CategoryForm
            category={editingCategory}
            categories={categories}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

---

## Testing Checklist

- [ ] Can create product with multiple variants
- [ ] Variant SKUs auto-generate if empty
- [ ] Can edit product and variants together
- [ ] Product list shows all variants (expandable)
- [ ] Batch dashboard shows all batches
- [ ] Expiry warnings color-coded correctly
- [ ] Can filter batches by supplier
- [ ] Can view batch movement history
- [ ] Master data pages (categories, brands, units) work
- [ ] Category hierarchy displays correctly
- [ ] Search and filters responsive

---

**Next:** Phase 5 - POS Integration & Reporting
