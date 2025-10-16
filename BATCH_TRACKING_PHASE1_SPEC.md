# 🎯 Phase 1: Batch Tracking Foundation - Complete Specification

## Executive Summary

This transforms your POS from product-level inventory to **batch/lot-level tracking**. Phase 1 focuses on **foundational infrastructure** without breaking existing functionality.

### Timeline: 2-3 weeks for Phase 1
### Risk Level: Medium (backward compatible approach)
### Value: Enables real-world inventory scenarios (different costs per batch, expiry tracking, FIFO)

---

## Current System Architecture

```
products (36)
    ↓
inventory (36 aggregate records)
    ↓
sales → sale_items (deduct from inventory)
```

**Problem:** All units of a product treated identically. Can't handle:
- Different purchase prices per batch
- Expiry dates
- FIFO/LIFO costing
- Supplier tracking per batch

---

## Target Phase 1 Architecture

```
products (36) - unchanged
    ↓
product_variants (36 default variants, 1:1 initially)
    ↓
inventory_batches (many batches per variant)
    ↓
inventory (aggregate view, auto-calculated)
    ↓
sales → sale_items → batch_allocations
```

**Benefits:**
- ✅ Track each purchase batch separately
- ✅ Different costs per batch
- ✅ Expiry date tracking
- ✅ FIFO allocation (sell oldest first)
- ✅ Complete traceability
- ✅ Existing products still work

---

## Database Changes - Migration v4

### 1. New Table: `suppliers`

```sql
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms TEXT,  -- e.g., "Net 30", "COD"
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_name ON suppliers(name);
```

**Why:** Track where batches came from, different suppliers = different costs.

**Example Data:**
```
| id | name              | payment_terms | phone          |
|----|-------------------|---------------|----------------|
| 1  | ABC Beverages Inc | Net 30        | +1-555-0100   |
| 2  | XYZ Distributors  | Net 15        | +1-555-0200   |
| 3  | Generic Supplier  | COD           | NULL          |
```

---

### 2. New Table: `product_variants`

```sql
CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Identity
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    variant_name TEXT NOT NULL,  -- e.g., "330ml Bottle", "24-pack Case"
    
    -- Unit info
    unit_of_measure TEXT DEFAULT 'each',
    unit_quantity REAL DEFAULT 1.0,
    
    -- Pricing (can override per variant)
    default_selling_price REAL NOT NULL,
    default_wholesale_price REAL DEFAULT 0.0,
    
    -- Inventory
    reorder_point INTEGER DEFAULT 0,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    weight REAL DEFAULT 0.0,
    dimensions TEXT,
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_product_variants_active ON product_variants(is_active);
```

**Why:** Allows one product to have multiple sizes/units. Phase 1: 1:1 mapping. Future: multiple variants per product.

**Example Data After Migration:**
```
| id | product_id | sku          | variant_name    | unit_of_measure | selling_price |
|----|------------|--------------|-----------------|-----------------|---------------|
| 1  | 1          | PROD-001-STD | Standard Unit   | each            | 10.00         |
| 2  | 2          | PROD-002-STD | Standard Unit   | each            | 15.00         |
...
```

**Future Multi-Variant Example (Phase 4):**
```
Product: Corona Beer
Variants:
  - 330ml Bottle (each) - $3.50
  - 24-pack Case (case) - $72.00
  - 50L Keg (keg) - $180.00
```

---

### 3. New Table: `inventory_batches`

```sql
CREATE TABLE inventory_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- What & Where
    batch_number TEXT UNIQUE NOT NULL,
    product_variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    -- When
    received_date DATE NOT NULL,
    expiry_date DATE,
    manufacture_date DATE,
    
    -- Cost
    cost_price REAL NOT NULL,  -- Cost per unit in this batch
    
    -- Quantities
    initial_quantity INTEGER NOT NULL,     -- Received
    current_quantity INTEGER NOT NULL,     -- Current total
    reserved_quantity INTEGER DEFAULT 0,   -- Held for orders
    available_quantity INTEGER NOT NULL,   -- current - reserved
    
    -- Location & Status
    location_code TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure available = current - reserved
    CHECK (available_quantity = current_quantity - reserved_quantity)
);

-- Critical indexes for FIFO allocation
CREATE INDEX idx_inventory_batches_variant ON inventory_batches(product_variant_id);
CREATE INDEX idx_inventory_batches_available ON inventory_batches(product_variant_id, is_active, available_quantity, received_date);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_inventory_batches_supplier ON inventory_batches(supplier_id);
```

**Why:** Core of batch tracking. Each purchase creates a new batch with its own cost and dates.

**Example Data:**
```
| id | batch_number     | variant_id | supplier_id | received_date | expiry_date | cost_price | initial_qty | current_qty | available_qty |
|----|------------------|------------|-------------|---------------|-------------|------------|-------------|-------------|---------------|
| 1  | PROD-001-20241016-001 | 1    | 1           | 2024-10-16    | 2025-04-16  | 8.50       | 100         | 75          | 75            |
| 2  | PROD-001-20241020-001 | 1    | 2           | 2024-10-20    | 2025-04-20  | 9.00       | 100         | 100         | 100           |
| 3  | PROD-002-20241015-001 | 2    | 1           | 2024-10-15    | 2024-12-15  | 12.00      | 50          | 30          | 25            |
```

**Story:** Product #1 has 2 batches:
- Batch 1: Bought from Supplier A @ $8.50, 25 units left
- Batch 2: Bought from Supplier B @ $9.00, 100 units left
- **FIFO:** When selling, take from Batch 1 first (older)
- **Profit tracking:** Know exact cost of sold units

---

### 4. New Table: `batch_allocations` 

```sql
CREATE TABLE batch_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
    batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
    quantity_allocated INTEGER NOT NULL,
    cost_price REAL NOT NULL,  -- Snapshot of batch cost at sale time
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for traceability
CREATE INDEX idx_batch_allocations_sale_item ON batch_allocations(sale_item_id);
CREATE INDEX idx_batch_allocations_batch ON batch_allocations(batch_id);
```

**Why:** Track exactly which batches were used in each sale. Essential for:
- Profit margin calculation (know exact COGS)
- Returns (which batch to return to?)
- Recalls (find all sales from a bad batch)
- Audit trail

**Example:**
```
Sale #100, Item: Product A (qty 30)
Allocations:
  - Batch 1: 25 units @ $8.50 = $212.50 COGS
  - Batch 2: 5 units @ $9.00 = $45.00 COGS
  Total COGS: $257.50
  Selling Price: $300.00
  Profit: $42.50
```

---

### 5. Update Existing Tables

**Add to `product_variants` link:**
```sql
-- Update inventory table
ALTER TABLE inventory ADD COLUMN product_variant_id INTEGER REFERENCES product_variants(id);

-- Update inventory_movements table
ALTER TABLE inventory_movements ADD COLUMN batch_id INTEGER REFERENCES inventory_batches(id);
ALTER TABLE inventory_movements ADD COLUMN product_variant_id INTEGER REFERENCES product_variants(id);

-- Update sale_items table
ALTER TABLE sale_items ADD COLUMN batch_id INTEGER REFERENCES inventory_batches(id);
ALTER TABLE sale_items ADD COLUMN product_variant_id INTEGER REFERENCES product_variants(id);
```

**Note:** We keep `product_id` columns for backward compatibility. New code uses `product_variant_id` and `batch_id`.

---

## Data Migration Script

**Critical:** Must run after creating new tables, before using new features.

```sql
-- Step 1: Create default supplier for existing products
INSERT INTO suppliers (id, name, contact_person, notes, is_active) 
VALUES (1, 'Legacy Supplier', NULL, 'Auto-created during migration', true);

-- Step 2: For each product, create ONE default variant
INSERT INTO product_variants (
    product_id, sku, barcode, variant_name, unit_of_measure,
    default_selling_price, default_wholesale_price, reorder_point,
    is_default, is_active, weight, dimensions
)
SELECT 
    id as product_id,
    sku || '-STD' as sku,  -- Make unique: PROD-001 → PROD-001-STD
    barcode,
    'Standard Unit' as variant_name,
    unit_of_measure,
    selling_price as default_selling_price,
    wholesale_price as default_wholesale_price,
    reorder_point,
    true as is_default,
    is_active,
    weight,
    dimensions
FROM products;

-- Step 3: Link inventory to variants
UPDATE inventory 
SET product_variant_id = (
    SELECT id FROM product_variants 
    WHERE product_variants.product_id = inventory.product_id 
    LIMIT 1
);

-- Step 4: Create ONE batch for each product with existing inventory
INSERT INTO inventory_batches (
    batch_number, product_variant_id, supplier_id, received_date,
    cost_price, initial_quantity, current_quantity, available_quantity,
    is_active, notes
)
SELECT 
    p.sku || '-MIGRATION-' || i.id as batch_number,
    pv.id as product_variant_id,
    1 as supplier_id,  -- Legacy supplier
    CURRENT_TIMESTAMP as received_date,
    p.cost_price,
    i.current_stock as initial_quantity,
    i.current_stock as current_quantity,
    i.available_stock as available_quantity,
    true as is_active,
    'Migrated from legacy inventory on ' || CURRENT_TIMESTAMP as notes
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN product_variants pv ON pv.product_id = p.id
WHERE i.current_stock > 0;

-- Step 5: Log migration in movements
INSERT INTO inventory_movements (
    product_variant_id, batch_id, movement_type, quantity_change,
    previous_stock, new_stock, notes
)
SELECT 
    pv.id as product_variant_id,
    ib.id as batch_id,
    'receipt' as movement_type,
    ib.initial_quantity as quantity_change,
    0 as previous_stock,
    ib.initial_quantity as new_stock,
    'Data migration from legacy system' as notes
FROM inventory_batches ib
JOIN product_variants pv ON ib.product_variant_id = pv.id;
```

**Result:** 
- All 36 existing products → 36 product variants
- Products with stock → One batch per product
- Everything linked properly
- Inventory numbers match exactly

---

## Backend Implementation (Rust)

### 1. New Models (`src-tauri/src/models/mod.rs`)

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Supplier {
    pub id: i64,
    pub name: String,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub tax_id: Option<String>,
    pub payment_terms: Option<String>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductVariant {
    pub id: i64,
    pub product_id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub variant_name: String,
    pub unit_of_measure: String,
    pub unit_quantity: f64,
    pub default_selling_price: f64,
    pub default_wholesale_price: f64,
    pub reorder_point: i32,
    pub is_default: bool,
    pub is_active: bool,
    pub weight: f64,
    pub dimensions: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryBatch {
    pub id: i64,
    pub batch_number: String,
    pub product_variant_id: i64,
    pub supplier_id: Option<i64>,
    pub received_date: String,
    pub expiry_date: Option<String>,
    pub manufacture_date: Option<String>,
    pub cost_price: f64,
    pub initial_quantity: i32,
    pub current_quantity: i32,
    pub reserved_quantity: i32,
    pub available_quantity: i32,
    pub location_code: Option<String>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchAllocation {
    pub id: i64,
    pub sale_item_id: i64,
    pub batch_id: i64,
    pub quantity_allocated: i32,
    pub cost_price: f64,
    pub created_at: String,
}
```

### 2. Core Commands

**File: `src-tauri/src/commands/batch_management.rs`** (NEW)

```rust
use crate::models::{InventoryBatch, ProductVariant, Supplier};
use sqlx::SqlitePool;
use tauri::State;

// ========== BATCH COMMANDS ==========

#[tauri::command]
pub async fn create_batch(
    pool: State<'_, SqlitePool>,
    batch: InventoryBatch,
    user_id: i64,
) -> Result<i64, String> {
    let pool_ref = pool.inner();
    
    // Auto-generate batch number if not provided
    let batch_number = if batch.batch_number.is_empty() {
        generate_batch_number(batch.product_variant_id, pool_ref).await?
    } else {
        batch.batch_number.clone()
    };
    
    // Insert batch
    let result = sqlx::query(
        "INSERT INTO inventory_batches (
            batch_number, product_variant_id, supplier_id, received_date,
            expiry_date, manufacture_date, cost_price, initial_quantity,
            current_quantity, reserved_quantity, available_quantity,
            location_code, is_active, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"
    )
    .bind(&batch_number)
    .bind(batch.product_variant_id)
    .bind(batch.supplier_id)
    .bind(&batch.received_date)
    .bind(&batch.expiry_date)
    .bind(&batch.manufacture_date)
    .bind(batch.cost_price)
    .bind(batch.initial_quantity)
    .bind(batch.current_quantity)
    .bind(batch.reserved_quantity)
    .bind(batch.available_quantity)
    .bind(&batch.location_code)
    .bind(batch.is_active)
    .bind(&batch.notes)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create batch: {}", e))?;
    
    let batch_id = result.last_insert_rowid();
    
    // Update aggregate inventory
    update_aggregate_inventory(batch.product_variant_id, pool_ref).await?;
    
    // Log movement
    log_batch_movement(
        batch.product_variant_id,
        batch_id,
        "receipt",
        batch.initial_quantity,
        0,
        batch.initial_quantity,
        user_id,
        Some("Batch received"),
        pool_ref
    ).await?;
    
    Ok(batch_id)
}

#[tauri::command]
pub async fn get_batches_for_variant(
    pool: State<'_, SqlitePool>,
    variant_id: i64,
    include_depleted: bool,
) -> Result<Vec<InventoryBatch>, String> {
    let pool_ref = pool.inner();
    
    let query = if include_depleted {
        "SELECT * FROM inventory_batches WHERE product_variant_id = ? ORDER BY received_date ASC"
    } else {
        "SELECT * FROM inventory_batches 
         WHERE product_variant_id = ? AND available_quantity > 0 
         ORDER BY received_date ASC"
    };
    
    let batches = sqlx::query_as::<_, InventoryBatch>(query)
        .bind(variant_id)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Failed to fetch batches: {}", e))?;
    
    Ok(batches)
}

#[tauri::command]
pub async fn allocate_batches_fifo(
    pool: State<'_, SqlitePool>,
    variant_id: i64,
    quantity_needed: i32,
) -> Result<Vec<(i64, i32, f64)>, String> {
    let pool_ref = pool.inner();
    
    // Get available batches ordered by received_date (FIFO)
    let batches = sqlx::query!(
        "SELECT id, available_quantity, cost_price 
         FROM inventory_batches 
         WHERE product_variant_id = ? 
           AND is_active = 1 
           AND available_quantity > 0
         ORDER BY received_date ASC, created_at ASC",
        variant_id
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch batches: {}", e))?;
    
    let mut allocations = Vec::new();
    let mut remaining = quantity_needed;
    
    for batch in batches {
        if remaining <= 0 {
            break;
        }
        
        let allocate_qty = remaining.min(batch.available_quantity);
        allocations.push((batch.id, allocate_qty, batch.cost_price));
        remaining -= allocate_qty;
    }
    
    if remaining > 0 {
        return Err(format!(
            "Insufficient stock. Need {}, have {}",
            quantity_needed,
            quantity_needed - remaining
        ));
    }
    
    Ok(allocations)
}

// ========== HELPER FUNCTIONS ==========

async fn generate_batch_number(
    variant_id: i64,
    pool: &SqlitePool,
) -> Result<String, String> {
    // Format: {VARIANT_SKU}-{YYYYMMDD}-{SEQUENCE}
    let variant = sqlx::query!("SELECT sku FROM product_variants WHERE id = ?", variant_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Variant not found: {}", e))?;
    
    let date = chrono::Local::now().format("%Y%m%d");
    
    // Get today's count
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM inventory_batches 
         WHERE product_variant_id = ? AND DATE(received_date) = DATE('now')"
    )
    .bind(variant_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    Ok(format!("{}-{}-{:03}", variant.sku, date, count + 1))
}

async fn update_aggregate_inventory(
    variant_id: i64,
    pool: &SqlitePool,
) -> Result<(), String> {
    // Calculate totals from all active batches
    let totals = sqlx::query!(
        "SELECT 
            COALESCE(SUM(current_quantity), 0) as total_stock,
            COALESCE(SUM(available_quantity), 0) as available_stock,
            COALESCE(SUM(reserved_quantity), 0) as reserved_stock
         FROM inventory_batches
         WHERE product_variant_id = ? AND is_active = 1",
        variant_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to calculate inventory: {}", e))?;
    
    // Update inventory table
    sqlx::query!(
        "UPDATE inventory SET
            total_stock = ?,
            available_stock = ?,
            reserved_stock = ?,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_variant_id = ?",
        totals.total_stock,
        totals.available_stock,
        totals.reserved_stock,
        variant_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;
    
    Ok(())
}

async fn log_batch_movement(
    variant_id: i64,
    batch_id: i64,
    movement_type: &str,
    quantity_change: i32,
    previous_stock: i32,
    new_stock: i32,
    user_id: i64,
    notes: Option<&str>,
    pool: &SqlitePool,
) -> Result<(), String> {
    sqlx::query!(
        "INSERT INTO inventory_movements (
            product_variant_id, batch_id, movement_type, quantity_change,
            previous_stock, new_stock, user_id, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        variant_id,
        batch_id,
        movement_type,
        quantity_change,
        previous_stock,
        new_stock,
        user_id,
        notes
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to log movement: {}", e))?;
    
    Ok(())
}
```

---

## Summary: What You Need To Do

### Step 1: Add Migration
Add version 4 migration to `src-tauri/src/database.rs` with:
- suppliers table
- product_variants table
- inventory_batches table
- batch_allocations table
- Data migration script

### Step 2: Add Models
Add to `src-tauri/src/models/mod.rs`:
- `Supplier` struct
- `ProductVariant` struct
- `InventoryBatch` struct
- `BatchAllocation` struct

### Step 3: Add Commands
Create `src-tauri/src/commands/batch_management.rs` with:
- `create_batch`
- `get_batches_for_variant`
- `allocate_batches_fifo`
- Helper functions

### Step 4: Register Commands
In `src-tauri/src/main.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::batch_management::create_batch,
    commands::batch_management::get_batches_for_variant,
    commands::batch_management::allocate_batches_fifo,
])
```

### Step 5: Update Product Creation
Modify `create_product` to auto-create default variant.

### Step 6: Update Stock Receipt
Modify stock receipt to create batches instead of direct inventory.

### Step 7: Update Sales
Modify sales to allocate from batches using FIFO.

---

## Testing Checklist

- [ ] Migration runs without errors
- [ ] All 36 existing products have variants
- [ ] Inventory numbers match pre-migration
- [ ] Can create new batch manually
- [ ] Batch number auto-generates correctly
- [ ] FIFO allocation works (sells from oldest batch first)
- [ ] Sale deducts from correct batches
- [ ] Inventory aggregate updates correctly
- [ ] Movement log tracks all changes
- [ ] Expiry date filtering works

---

## This is Phase 1 Only!

**What's NOT included yet:**
- Multi-variant products (Phase 4)
- Purchase Order system (Phase 3)
- Advanced UI (Phase 4-5)
- LIFO/FEFO allocation (Phase 2)
- Reports and analytics (Phase 6)

**Focus:** Get batch tracking working with existing single-variant products first!

---

**Next:** Implement this specification step-by-step. Start with migration, then models, then commands.
