# 🏗️ INVENTORY SYSTEM ARCHITECTURE - COMPLETE GUIDE

## 🎯 THE CORRECT FLOW (NOW IMPLEMENTED)

### 1. Product Creation Flow
```
User creates Product
    ↓
Backend creates Product record
    ↓
🆕 Backend AUTO-CREATES Inventory record
    ↓
Inventory initialized with:
    - current_stock: 0
    - available_stock: 0
    - reserved_stock: 0
    - minimum_stock: reorder_point
    - maximum_stock: 1000
```

### 2. Stock Receipt Flow (Adding Stock)
```
User receives new stock (purchase/delivery)
    ↓
receive_stock() command
    ↓
Updates Inventory:
    - current_stock += quantity
    - available_stock += quantity
    ↓
Updates Product cost_price (if provided)
    ↓
Creates inventory_movement record (type: 'receipt')
```

### 3. Sales Flow (Selling Stock)
```
User adds products to cart
    ↓
🆕 Frontend checks available_stock
    ↓
User completes sale
    ↓
create_sale() command
    ↓
For each item:
    - Updates Inventory:
        • current_stock -= quantity
        • available_stock -= quantity
    - Creates sale_item record
    - Creates inventory_movement (type: 'sale')
```

### 4. Stock Adjustment Flow
```
User finds discrepancy
    ↓
adjust_stock() command
    ↓
Updates Inventory (add or subtract)
    ↓
Creates inventory_movement (type: 'adjustment')
```

### 5. Stock Reservation Flow
```
Customer places order
    ↓
reserve_stock() command
    ↓
Updates Inventory:
    - reserved_stock += quantity
    - available_stock -= quantity
    ↓
Creates inventory_movement (type: 'reservation')
```

### 6. Stock Take Flow
```
Physical count performed
    ↓
stock_take() command
    ↓
Compares actual_count vs system_count
    ↓
Updates Inventory with actual count
    ↓
Creates inventory_movement (type: 'stock_take')
```

---

## 📊 INVENTORY TABLE STRUCTURE

```sql
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    current_stock INTEGER,        -- Total physical stock
    minimum_stock INTEGER,         -- Reorder level
    maximum_stock INTEGER,         -- Max capacity
    reserved_stock INTEGER,        -- Stock reserved for orders
    available_stock INTEGER,       -- current - reserved (for sale)
    last_updated TIMESTAMP,
    last_stock_take TIMESTAMP,
    stock_take_count INTEGER,
    UNIQUE(product_id)
);
```

**Key Fields:**
- `current_stock`: Total physical inventory
- `reserved_stock`: Stock reserved (not available for sale)
- `available_stock`: Stock available for immediate sale
- **Formula:** `available_stock = current_stock - reserved_stock`

---

## 🔧 BACKEND COMMANDS

### Product Commands (src-tauri/src/commands/products.rs)
- ✅ `create_product()` - **NOW auto-creates inventory record**
- ✅ `update_product()`
- ✅ `delete_product()`
- ✅ `get_products()`
- ✅ `get_products_with_stock()` - Joins products + inventory

### Stock Management Commands (src-tauri/src/commands/stock.rs) 🆕
1. **`receive_stock(request, user_id)`**
   - Add new stock from purchases/deliveries
   - Updates cost_price if provided
   - Creates 'receipt' movement

2. **`adjust_stock(request, user_id)`**
   - Add or subtract stock manually
   - Requires reason
   - Creates 'adjustment' movement

3. **`reserve_stock(product_id, quantity, user_id, notes)`**
   - Reserve stock for orders
   - Decreases available_stock
   - Creates 'reservation' movement

4. **`release_reserved_stock(product_id, quantity, user_id)`**
   - Release reservation
   - Increases available_stock

5. **`stock_take(product_id, actual_count, user_id, notes)`**
   - Physical count reconciliation
   - Calculates difference
   - Updates to actual count
   - Creates 'stock_take' movement

### Sales Commands (src-tauri/src/commands/sales.rs)
- ✅ `create_sale()` - **Already reduces inventory properly**
  - Decreases current_stock and available_stock
  - Creates 'sale' movement

### Inventory Commands (src-tauri/src/commands/inventory.rs)
- ✅ `get_inventory()` - View all inventory
- ✅ `get_inventory_movements()` - View stock history
- ✅ `create_stock_adjustment()` - Adjust stock (old method)
- ✅ `get_low_stock_items()` - Products below minimum

---

## 🎨 FRONTEND UPDATES NEEDED

### 1. Sales Page (src/pages/Sales.tsx)
**CRITICAL CHANGE:**
```typescript
// ❌ OLD: Check product.current_stock
if (product.current_stock <= 0) {
  toast.error("Out of stock!");
  return;
}

// ✅ NEW: Check product.available_stock from inventory
if (product.available_stock <= 0) {
  toast.error("Out of stock!");
  return;
}

// When adding to cart
const existingItem = cart.find(item => item.product.id === product.id);
const cartQuantity = existingItem ? existingItem.quantity : 0;
const totalQuantity = cartQuantity + 1;

if (totalQuantity > product.available_stock) {
  toast.error(`Only ${product.available_stock} available in stock`);
  return;
}
```

### 2. Inventory Page (src/pages/Inventory.tsx)
**ADD THESE FEATURES:**

#### A. Stock Receipt Dialog
```typescript
const handleReceiveStock = async () => {
  await invoke("receive_stock", {
    request: {
      product_id: selectedProduct.id,
      quantity: receiveQuantity,
      cost_price: receiveCostPrice,
      supplier: receiveSupplier,
      notes: receiveNotes
    },
    userId: user.id
  });
  toast.success("✅ Stock received!");
  loadInventory();
};
```

#### B. Stock Adjustment Dialog
```typescript
const handleAdjustStock = async () => {
  await invoke("adjust_stock", {
    request: {
      product_id: selectedProduct.id,
      adjustment_type: adjustmentType, // 'add' or 'subtract'
      quantity: adjustQuantity,
      reason: adjustReason,
      notes: adjustNotes
    },
    userId: user.id
  });
  toast.success("✅ Stock adjusted!");
  loadInventory();
};
```

#### C. Stock Take Dialog
```typescript
const handleStockTake = async () => {
  await invoke("stock_take", {
    productId: selectedProduct.id,
    actualCount: countedQuantity,
    userId: user.id,
    notes: countNotes
  });
  toast.success("✅ Stock count completed!");
  loadInventory();
};
```

### 3. Products Page (src/pages/Products.tsx)
**NO CHANGES NEEDED** - Products now auto-create inventory! ✅

---

## 📈 BUSINESS LOGIC RULES

1. **Product Creation**
   - ✅ Must auto-create inventory record
   - ✅ Initial stock = 0
   - ✅ minimum_stock = reorder_point

2. **Stock Receipts**
   - ✅ Only way to ADD new stock
   - ✅ Must update cost_price
   - ✅ Track supplier and reference

3. **Sales**
   - ✅ Can only sell available_stock
   - ✅ Must check stock before adding to cart
   - ✅ Must reduce inventory in transaction
   - ✅ Create movement record

4. **Reservations**
   - ✅ Reduce available_stock
   - ✅ Don't reduce current_stock
   - ✅ Can release later

5. **Stock Takes**
   - ✅ Physical count overrides system
   - ✅ Calculate and log difference
   - ✅ Update both current and available

---

## 🔄 INVENTORY MOVEMENTS

All stock changes are tracked in `inventory_movements` table:

**Movement Types:**
- `receipt` - Stock received
- `sale` - Sold to customer
- `return` - Customer return
- `adjustment` - Manual adjustment
- `stock_take` - Physical count
- `damage` - Damaged goods
- `transfer` - Location transfer
- `reservation` - Reserved stock
- `void` - Voided sale

**Each movement records:**
- product_id
- movement_type
- quantity_change (+/-)
- previous_stock
- new_stock
- reference_id (sale_id, etc.)
- reference_type
- notes
- user_id
- created_at

---

## ✅ IMPLEMENTATION STATUS

### Backend
- ✅ Auto-create inventory on product creation
- ✅ Stock receipt command
- ✅ Stock adjustment command
- ✅ Stock reservation command
- ✅ Stock take command
- ✅ Sales reduce inventory properly
- ✅ All movements tracked

### Frontend (TODO)
- ⏳ Update Sales page to check available_stock
- ⏳ Add stock management UI to Inventory page
- ⏳ Add dialogs for receive/adjust/stock take
- ⏳ Display reserved stock in UI
- ⏳ Show movement history

---

## 🎯 NEXT STEPS

1. **Test Product Creation**
   - Create a product
   - Verify inventory record created
   - Check initial stock = 0

2. **Test Stock Receipt**
   - Receive stock for a product
   - Verify current_stock increased
   - Verify available_stock increased
   - Check movement record created

3. **Test Sales**
   - Add product to cart
   - Complete sale
   - Verify stock decreased
   - Check movement record

4. **Update Frontend**
   - Implement stock management dialogs
   - Update Sales page validation
   - Test complete flow

---

## 📚 USAGE EXAMPLES

### Example 1: New Product to Sale
```
1. Create product "iPhone 15" → Inventory created (stock: 0)
2. Receive 10 units @ $800 each → Inventory: 10 available
3. Customer buys 2 → Inventory: 8 available
4. Adjust -1 (damaged) → Inventory: 7 available
5. Stock take (count: 7) → Inventory: 7 available ✅
```

### Example 2: Reservation Flow
```
1. Product has 5 available
2. Customer orders 3 → Reserve 3
   - current_stock: 5
   - reserved_stock: 3
   - available_stock: 2
3. Walk-in can only buy 2 (not 5!)
4. Customer picks up order → Sale completes
   - current_stock: 2
   - reserved_stock: 0
   - available_stock: 2
```

---

## 🏆 BENEFITS

✅ **Accurate Stock Tracking**
- Real-time inventory levels
- Prevents overselling
- Tracks all movements

✅ **Business Intelligence**
- Stock movement history
- Identify shrinkage
- Audit trail

✅ **Operational Efficiency**
- Auto-reorder alerts
- Reservation system
- Bulk operations

✅ **Data Integrity**
- Transactional operations
- Referential integrity
- Movement logging

---

**Status: BACKEND COMPLETE ✅ | FRONTEND IN PROGRESS ⏳**

