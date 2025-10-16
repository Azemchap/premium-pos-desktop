# Phase 5: POS Integration & Advanced Reporting

**Timeline:** Week 9-10 after Phase 4  
**Dependencies:** All previous phases complete  
**Complexity:** High  

---

## Overview

Final phase integrates everything into POS and adds advanced reporting:
- Variant selection in POS
- Batch allocation display in cart
- Receipt with batch info
- Inventory valuation reports
- Profit margin analysis
- Batch traceability reports
- Supplier performance dashboards

---

## POS Updates

### 1. Product Selector with Variants

```typescript
// src/pages/POS/ProductSelectorWithVariants.tsx

export const ProductSelectorWithVariants: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { addToCart } = useCart();

  const handleProductClick = (product: Product) => {
    if (product.variants.length === 1) {
      // Single variant: add directly
      const variant = product.variants[0];
      handleAddToCart(variant);
    } else {
      // Multiple variants: show selector
      setSelectedProduct(product);
    }
  };

  const handleAddToCart = async (variant: ProductVariant, quantity: number = 1) => {
    try {
      // Allocate batches based on store setting (FIFO/LIFO/FEFO)
      const allocations = await invoke<BatchAllocation[]>('allocate_batches', {
        variantId: variant.id,
        quantity,
        method: storeSettings.inventoryMethod,
        locationId: currentLocation.id,
      });

      // Add to cart with allocations
      addToCart({
        variant,
        quantity,
        allocations,
        unitPrice: variant.defaultSellingPrice,
      });

      toast.success(`Added ${quantity} × ${variant.variantName}`);
      setSelectedProduct(null);
    } catch (error) {
      toast.error(`Cannot add to cart: ${error}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Product Grid */}
      {products.map((product) => (
        <Card
          key={product.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleProductClick(product)}
        >
          <CardContent className="p-4">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover rounded mb-2" />
            )}
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.category}</p>
            
            {/* Show variant count */}
            {product.variants.length > 1 ? (
              <Badge variant="outline" className="mt-2">
                {product.variants.length} variants
              </Badge>
            ) : (
              <div className="mt-2">
                <span className="text-lg font-bold">
                  {formatCurrency(product.variants[0].defaultSellingPrice)}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  {product.variants[0].inventory?.availableStock || 0} in stock
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Variant Selector Modal */}
      <Dialog open={selectedProduct !== null} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Variant for {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedProduct?.variants.map((variant) => (
              <Card
                key={variant.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleAddToCart(variant)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{variant.variantName}</h4>
                    <p className="text-sm text-gray-500">
                      {variant.unit.name} • {variant.inventory?.availableStock || 0} in stock
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatCurrency(variant.defaultSellingPrice)}
                    </div>
                    {variant.inventory?.batches && variant.inventory.batches.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Info className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="space-y-2">
                            <h5 className="font-semibold">Available Batches</h5>
                            {variant.inventory.batches.map((batch) => (
                              <div key={batch.id} className="text-sm">
                                <div className="font-mono">{batch.batchNumber}</div>
                                <div className="text-gray-500">
                                  {batch.availableQuantity} units
                                  {batch.expiryDate && (
                                    <span> • Exp: {formatDate(batch.expiryDate)}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

---

### 2. Enhanced Cart with Batch Info

```typescript
// src/pages/POS/CartWithBatchInfo.tsx

interface CartItem {
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  allocations: BatchAllocation[];
  discountAmount: number;
  taxAmount: number;
}

export const CartWithBatchInfo: React.FC = () => {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItemDetails = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleQuantityChange = async (index: number, newQuantity: number) => {
    const item = cart[index];
    
    try {
      // Re-allocate batches for new quantity
      const newAllocations = await invoke<BatchAllocation[]>('allocate_batches', {
        variantId: item.variant.id,
        quantity: newQuantity,
        method: storeSettings.inventoryMethod,
      });

      updateQuantity(index, newQuantity, newAllocations);
    } catch (error) {
      toast.error(`Cannot update quantity: ${error}`);
    }
  };

  const calculateCOGS = (allocations: BatchAllocation[]): number => {
    return allocations.reduce((sum, alloc) => sum + (alloc.quantity * alloc.costPrice), 0);
  };

  const calculateProfit = (item: CartItem): number => {
    const revenue = item.quantity * item.unitPrice;
    const cogs = calculateCOGS(item.allocations);
    return revenue - cogs;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cart ({cart.length} items)</span>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cart.map((item, index) => (
          <div key={index} className="border rounded-lg">
            <div
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleItemDetails(index)}
            >
              <div className="flex-1">
                <h4 className="font-semibold">{item.variant.product.name}</h4>
                <p className="text-sm text-gray-500">{item.variant.variantName}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(item.unitPrice)} × {item.quantity} = {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(index, item.quantity - 1);
                  }}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(index, item.quantity + 1);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
                <ChevronRight
                  className={`w-5 h-5 transition-transform ${
                    expandedItems.has(index) ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>

            {expandedItems.has(index) && (
              <div className="p-3 bg-gray-50 border-t space-y-2">
                <h5 className="font-semibold text-sm">Batch Allocation</h5>
                {item.allocations.map((alloc, allocIdx) => (
                  <div key={allocIdx} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{alloc.batchNumber}</span>
                    <span>Qty: {alloc.quantity}</span>
                    <span>Cost: {formatCurrency(alloc.costPrice)}</span>
                    <span>Total: {formatCurrency(alloc.quantity * alloc.costPrice)}</span>
                  </div>
                ))}
                
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Total COGS:</span>
                    <span className="font-semibold">{formatCurrency(calculateCOGS(item.allocations))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Profit:</span>
                    <span className="font-semibold">{formatCurrency(calculateProfit(item))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {cart.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Cart is empty</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

### 3. Enhanced Receipt Template

```typescript
// src/components/ReceiptWithBatchInfo.tsx

export const generateReceiptHTML = (sale: Sale, items: CartItem[], storeInfo: StoreInfo): string => {
  const batchDetails = items.map((item) => {
    const batchInfo = item.allocations.map((alloc) => 
      `Batch ${alloc.batchNumber} (${alloc.quantity})`
    ).join(', ');
    
    return `
      <div class="item">
        <div class="item-name">${item.variant.product.name} - ${item.variant.variantName}</div>
        <div class="item-details">
          <span>${item.quantity} × ${formatCurrency(item.unitPrice)}</span>
          <span>${formatCurrency(item.quantity * item.unitPrice)}</span>
        </div>
        <div class="batch-info">${batchInfo}</div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 80mm; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
        .item { margin: 10px 0; }
        .item-details { display: flex; justify-content: space-between; }
        .batch-info { font-size: 10px; color: #666; margin-left: 10px; }
        .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${storeInfo.name}</h2>
        <p>${storeInfo.address}</p>
        <p>Tel: ${storeInfo.phone}</p>
      </div>

      <div class="info">
        <p><strong>Receipt #:</strong> ${sale.saleNumber}</p>
        <p><strong>Date:</strong> ${formatDateTime(sale.createdAt)}</p>
        <p><strong>Cashier:</strong> ${sale.cashierName}</p>
      </div>

      <div class="items">
        ${batchDetails}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Tax:</span>
          <span>${formatCurrency(sale.taxAmount)}</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p style="font-size: 9px;">Items traceable via batch numbers</p>
      </div>
    </body>
    </html>
  `;
};
```

---

## Advanced Reports

### 1. Inventory Valuation Report

```typescript
// src/pages/Reports/InventoryValuation.tsx

export const InventoryValuationReport: React.FC = () => {
  const [data, setData] = useState<ValuationData | null>(null);
  const [groupBy, setGroupBy] = useState<'product' | 'category' | 'supplier'>('product');

  useEffect(() => {
    loadValuationData();
  }, [groupBy]);

  const loadValuationData = async () => {
    const result = await invoke<ValuationData>('get_inventory_valuation', {
      groupBy,
    });
    setData(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory Valuation</h2>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectItem value="product">By Product</SelectItem>
          <SelectItem value="category">By Category</SelectItem>
          <SelectItem value="supplier">By Supplier</SelectItem>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Total Value</div>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalValue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Total Units</div>
            <div className="text-2xl font-bold">{data?.totalUnits || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Avg Cost/Unit</div>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.avgCostPerUnit || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Active Batches</div>
            <div className="text-2xl font-bold">{data?.activeBatches || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupBy === 'product' ? 'Product' : groupBy === 'category' ? 'Category' : 'Supplier'}</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.avgCost)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.totalValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {((item.totalValue / data.totalValue) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 2. Profit Margin Analysis

```typescript
// src/pages/Reports/ProfitMarginAnalysis.tsx

export const ProfitMarginAnalysis: React.FC = () => {
  const [data, setData] = useState<ProfitData[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [groupBy, setGroupBy] = useState<'product' | 'category' | 'variant'>('product');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Profit Margin Analysis</h2>

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-4 p-4">
          <Input type="date" label="Start Date" value={dateRange.start} onChange={...} />
          <Input type="date" label="End Date" value={dateRange.end} onChange={...} />
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectItem value="product">By Product</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
            <SelectItem value="variant">By Variant</SelectItem>
          </Select>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculateTotalRevenue(data))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Total COGS</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(calculateTotalCOGS(data))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Gross Profit</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculateGrossProfit(data))}
            </div>
            <div className="text-sm text-gray-500">
              Margin: {calculateMarginPercentage(data).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                const margin = ((item.profit / item.revenue) * 100);
                return (
                  <TableRow key={idx}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.unitsSold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.cogs)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      {formatCurrency(item.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'destructive'}>
                        {margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 3. Batch Traceability Report

```typescript
// src/pages/Reports/BatchTraceability.tsx

export const BatchTraceabilityReport: React.FC<{ batchId: number }> = ({ batchId }) => {
  const [batch, setBatch] = useState<InventoryBatch | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Batch Traceability</h2>
        <Button onClick={() => exportToPDF()}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Batch Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Batch: {batch?.batchNumber}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Product</div>
            <div className="font-semibold">{batch?.product.name}</div>
            <div className="text-sm">{batch?.variant.variantName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Supplier</div>
            <div className="font-semibold">{batch?.supplier.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Dates</div>
            <div className="text-sm">Received: {formatDate(batch?.receivedDate)}</div>
            <div className="text-sm">Expiry: {formatDate(batch?.expiryDate)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Quantity Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold">{batch?.initialQuantity}</div>
              <div className="text-sm text-gray-500">Initial</div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="text-2xl font-bold">{batch?.currentQuantity}</div>
              <div className="text-sm text-gray-500">Current</div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{batch?.reservedQuantity}</div>
              <div className="text-sm text-gray-500">Reserved</div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{batch?.availableQuantity}</div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline>
            {movements.map((movement) => (
              <TimelineItem key={movement.id}>
                <TimelineIcon type={movement.type} />
                <TimelineContent>
                  <div className="font-semibold">{movement.type}</div>
                  <div className="text-sm">
                    Qty: {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(movement.createdAt)}
                  </div>
                  {movement.notes && (
                    <div className="text-sm text-gray-600">{movement.notes}</div>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>

      {/* Sales Using This Batch */}
      <Card>
        <CardHeader>
          <CardTitle>Sales from This Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">{sale.saleNumber}</TableCell>
                  <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>{sale.customerName || 'Walk-in'}</TableCell>
                  <TableCell className="text-right">{sale.quantityFromBatch}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## Testing Checklist

- [ ] POS shows variants correctly
- [ ] Single-variant products add directly to cart
- [ ] Multi-variant products show selector
- [ ] Cart displays batch allocations
- [ ] Quantity changes re-allocate batches
- [ ] Checkout deducts from correct batches
- [ ] Receipt includes batch numbers
- [ ] Inventory valuation report accurate
- [ ] Profit margin calculations correct
- [ ] Batch traceability shows complete history
- [ ] Can export reports to PDF/CSV

---

## Final Success Criteria

✅ Complete product-to-sale flow with batch tracking  
✅ All reports show accurate, real-time data  
✅ System handles complex scenarios (multi-batch sales, partial allocations)  
✅ Performance is acceptable (< 500ms for common operations)  
✅ UI is intuitive and user-friendly  
✅ Complete audit trail for all inventory movements  

---

**Implementation Complete! All 5 phases documented.**
