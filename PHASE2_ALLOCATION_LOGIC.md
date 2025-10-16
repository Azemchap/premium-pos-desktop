# Phase 2: Advanced Batch Allocation Logic

**Timeline:** Week 3-4 after Phase 1  
**Dependencies:** Phase 1 must be complete and stable  
**Complexity:** Medium  

---

## Overview

Phase 1 implemented basic FIFO allocation. Phase 2 adds:
- LIFO (Last In, First Out) allocation
- FEFO (First Expired, First Out) allocation
- Manual batch selection
- Batch reservation system
- Location-based allocation

---

## Database Changes

### Migration v5: Add Allocation Settings

```sql
-- Add allocation method to store settings
ALTER TABLE locations ADD COLUMN inventory_method TEXT DEFAULT 'FIFO' 
    CHECK (inventory_method IN ('FIFO', 'LIFO', 'FEFO', 'MANUAL'));

-- Add location tracking to batches (if not already present)
ALTER TABLE inventory_batches ADD COLUMN location_id INTEGER REFERENCES locations(id);

-- Create reservation table
CREATE TABLE batch_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
    reserved_by TEXT NOT NULL,  -- Order number, customer name, etc.
    quantity_reserved INTEGER NOT NULL,
    reservation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,  -- When reservation expires
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_reservations_batch ON batch_reservations(batch_id);
CREATE INDEX idx_batch_reservations_status ON batch_reservations(status);

-- Trigger to update reserved_quantity on batch
CREATE TRIGGER trg_update_batch_reserved
AFTER INSERT ON batch_reservations
WHEN NEW.status = 'active'
BEGIN
    UPDATE inventory_batches SET
        reserved_quantity = reserved_quantity + NEW.quantity_reserved,
        available_quantity = available_quantity - NEW.quantity_reserved
    WHERE id = NEW.batch_id;
END;

CREATE TRIGGER trg_release_batch_reserved
AFTER UPDATE ON batch_reservations
WHEN OLD.status = 'active' AND NEW.status IN ('fulfilled', 'expired', 'cancelled')
BEGIN
    UPDATE inventory_batches SET
        reserved_quantity = reserved_quantity - OLD.quantity_reserved,
        available_quantity = available_quantity + OLD.quantity_reserved
    WHERE id = OLD.batch_id;
END;
```

---

## Rust Implementation

### File: `src-tauri/src/services/batch_allocator.rs`

```rust
use crate::models::InventoryBatch;
use sqlx::SqlitePool;

#[derive(Debug, Clone)]
pub struct BatchAllocation {
    pub batch_id: i64,
    pub quantity: i32,
    pub cost_price: f64,
}

pub struct BatchAllocator;

impl BatchAllocator {
    /// FIFO: First In, First Out (oldest first)
    pub async fn allocate_fifo(
        variant_id: i64,
        quantity: i32,
        location_id: Option<i64>,
        pool: &SqlitePool,
    ) -> Result<Vec<BatchAllocation>, String> {
        let location_filter = if let Some(loc) = location_id {
            format!("AND location_id = {}", loc)
        } else {
            String::new()
        };

        let batches = sqlx::query_as::<_, InventoryBatch>(&format!(
            "SELECT * FROM inventory_batches 
             WHERE product_variant_id = ? 
               AND is_active = 1 
               AND available_quantity > 0
               {}
             ORDER BY received_date ASC, created_at ASC",
            location_filter
        ))
        .bind(variant_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch batches: {}", e))?;

        Self::allocate_from_batches(batches, quantity)
    }

    /// LIFO: Last In, First Out (newest first)
    pub async fn allocate_lifo(
        variant_id: i64,
        quantity: i32,
        location_id: Option<i64>,
        pool: &SqlitePool,
    ) -> Result<Vec<BatchAllocation>, String> {
        let location_filter = if let Some(loc) = location_id {
            format!("AND location_id = {}", loc)
        } else {
            String::new()
        };

        let batches = sqlx::query_as::<_, InventoryBatch>(&format!(
            "SELECT * FROM inventory_batches 
             WHERE product_variant_id = ? 
               AND is_active = 1 
               AND available_quantity > 0
               {}
             ORDER BY received_date DESC, created_at DESC",
            location_filter
        ))
        .bind(variant_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch batches: {}", e))?;

        Self::allocate_from_batches(batches, quantity)
    }

    /// FEFO: First Expired, First Out (expiring first)
    pub async fn allocate_fefo(
        variant_id: i64,
        quantity: i32,
        location_id: Option<i64>,
        pool: &SqlitePool,
    ) -> Result<Vec<BatchAllocation>, String> {
        let location_filter = if let Some(loc) = location_id {
            format!("AND location_id = {}", loc)
        } else {
            String::new()
        };

        let batches = sqlx::query_as::<_, InventoryBatch>(&format!(
            "SELECT * FROM inventory_batches 
             WHERE product_variant_id = ? 
               AND is_active = 1 
               AND available_quantity > 0
               {}
             ORDER BY 
                CASE 
                    WHEN expiry_date IS NULL THEN 1
                    ELSE 0
                END,
                expiry_date ASC,
                received_date ASC",
            location_filter
        ))
        .bind(variant_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch batches: {}", e))?;

        Self::allocate_from_batches(batches, quantity)
    }

    /// Manual: Specific batch allocation
    pub async fn allocate_manual(
        allocations: Vec<(i64, i32)>,  // (batch_id, quantity)
        pool: &SqlitePool,
    ) -> Result<Vec<BatchAllocation>, String> {
        let mut validated = Vec::new();

        for (batch_id, quantity) in allocations {
            // Validate batch has enough available
            let batch = sqlx::query_as::<_, InventoryBatch>(
                "SELECT * FROM inventory_batches WHERE id = ? AND is_active = 1"
            )
            .bind(batch_id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Batch {} not found: {}", batch_id, e))?;

            if batch.available_quantity < quantity {
                return Err(format!(
                    "Batch {} only has {} available, requested {}",
                    batch_id, batch.available_quantity, quantity
                ));
            }

            validated.push(BatchAllocation {
                batch_id,
                quantity,
                cost_price: batch.cost_price,
            });
        }

        Ok(validated)
    }

    /// Helper: Allocate from ordered list of batches
    fn allocate_from_batches(
        batches: Vec<InventoryBatch>,
        quantity_needed: i32,
    ) -> Result<Vec<BatchAllocation>, String> {
        let mut allocations = Vec::new();
        let mut remaining = quantity_needed;

        for batch in batches {
            if remaining <= 0 {
                break;
            }

            let allocate_qty = remaining.min(batch.available_quantity);
            
            allocations.push(BatchAllocation {
                batch_id: batch.id,
                quantity: allocate_qty,
                cost_price: batch.cost_price,
            });

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

    /// Reserve batches for future order
    pub async fn reserve_batches(
        allocations: Vec<BatchAllocation>,
        reserved_by: String,
        expiry_hours: i32,
        user_id: i64,
        notes: Option<String>,
        pool: &SqlitePool,
    ) -> Result<Vec<i64>, String> {
        let mut reservation_ids = Vec::new();

        for allocation in allocations {
            let result = sqlx::query!(
                "INSERT INTO batch_reservations (
                    batch_id, reserved_by, quantity_reserved, 
                    expiry_date, notes, created_by
                ) VALUES (?1, ?2, ?3, datetime('now', '+' || ?4 || ' hours'), ?5, ?6)",
                allocation.batch_id,
                reserved_by,
                allocation.quantity,
                expiry_hours,
                notes,
                user_id
            )
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to reserve batch: {}", e))?;

            reservation_ids.push(result.last_insert_rowid());
        }

        Ok(reservation_ids)
    }

    /// Release reservation (cancel or fulfill)
    pub async fn release_reservation(
        reservation_id: i64,
        status: &str,  // 'fulfilled', 'cancelled', 'expired'
        pool: &SqlitePool,
    ) -> Result<(), String> {
        sqlx::query!(
            "UPDATE batch_reservations SET status = ? WHERE id = ?",
            status,
            reservation_id
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to release reservation: {}", e))?;

        Ok(())
    }
}
```

### Tauri Commands

```rust
#[tauri::command]
pub async fn allocate_batches(
    pool: State<'_, SqlitePool>,
    variant_id: i64,
    quantity: i32,
    method: String,  // FIFO, LIFO, FEFO, MANUAL
    location_id: Option<i64>,
) -> Result<Vec<BatchAllocation>, String> {
    let allocator = BatchAllocator;
    
    match method.as_str() {
        "FIFO" => allocator.allocate_fifo(variant_id, quantity, location_id, pool.inner()).await,
        "LIFO" => allocator.allocate_lifo(variant_id, quantity, location_id, pool.inner()).await,
        "FEFO" => allocator.allocate_fefo(variant_id, quantity, location_id, pool.inner()).await,
        _ => Err(format!("Unknown allocation method: {}", method)),
    }
}

#[tauri::command]
pub async fn reserve_stock(
    pool: State<'_, SqlitePool>,
    allocations: Vec<(i64, i32)>,
    reserved_by: String,
    expiry_hours: i32,
    user_id: i64,
    notes: Option<String>,
) -> Result<Vec<i64>, String> {
    // First allocate
    let batch_allocations = BatchAllocator::allocate_manual(allocations, pool.inner()).await?;
    
    // Then reserve
    BatchAllocator::reserve_batches(
        batch_allocations,
        reserved_by,
        expiry_hours,
        user_id,
        notes,
        pool.inner()
    ).await
}

#[tauri::command]
pub async fn release_reservation(
    pool: State<'_, SqlitePool>,
    reservation_id: i64,
    status: String,
) -> Result<(), String> {
    BatchAllocator::release_reservation(reservation_id, &status, pool.inner()).await
}
```

---

## Frontend Updates

### Settings Page: Choose Allocation Method

```typescript
// src/pages/Settings/InventorySettings.tsx
export const InventorySettings: React.FC = () => {
  const [method, setMethod] = useState<string>('FIFO');

  const handleSave = async () => {
    await invoke('update_store_setting', {
      key: 'inventory_method',
      value: method,
    });
    toast.success('Inventory method updated');
  };

  return (
    <div>
      <h3>Inventory Allocation Method</h3>
      <Select value={method} onValueChange={setMethod}>
        <SelectItem value="FIFO">
          FIFO - First In, First Out (Oldest first)
        </SelectItem>
        <SelectItem value="LIFO">
          LIFO - Last In, First Out (Newest first)
        </SelectItem>
        <SelectItem value="FEFO">
          FEFO - First Expired, First Out (Expiring first)
        </SelectItem>
      </Select>
      <Button onClick={handleSave}>Save</Button>
    </div>
  );
};
```

---

## Testing Checklist

- [ ] FIFO allocation works (oldest first)
- [ ] LIFO allocation works (newest first)
- [ ] FEFO allocation works (expiring first)
- [ ] FEFO handles NULL expiry dates correctly
- [ ] Manual allocation validates availability
- [ ] Reservation reduces available_stock
- [ ] Reservation expiry releases stock
- [ ] Location-based allocation works
- [ ] Multi-batch allocation handles partial availability
- [ ] Insufficient stock error is clear

---

## Use Cases

### Scenario 1: FIFO for Perishables
Restaurant uses FIFO to ensure oldest ingredients are used first.

### Scenario 2: LIFO for Non-Perishables
Bar uses LIFO for bottled spirits (newest stock to front, preserve aged stock).

### Scenario 3: FEFO for Drinks
Bar uses FEFO for beer/wine to avoid serving expired products.

### Scenario 4: Reservations
Customer pre-orders for weekend. System reserves specific batches, preventing overselling.

---

**Next:** Phase 3 - Purchase Order System
