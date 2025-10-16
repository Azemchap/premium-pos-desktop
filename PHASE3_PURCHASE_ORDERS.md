# Phase 3: Purchase Order System

**Timeline:** Week 5-6 after Phase 2  
**Dependencies:** Phase 1 & 2 complete  
**Complexity:** High  

---

## Overview

Implement full PO workflow:
1. Create POs with line items
2. Send to suppliers
3. Receive POs and auto-create batches
4. Track PO status and payments
5. Supplier performance metrics

---

## Database Changes

### Migration v6: Purchase Orders

```sql
-- Purchase Orders table
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'confirmed', 'received', 'partial', 'cancelled')),
    subtotal REAL NOT NULL,
    tax_amount REAL DEFAULT 0.0,
    shipping_cost REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    payment_terms TEXT,  -- e.g., "Net 30"
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    received_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PO Line Items
CREATE TABLE purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost REAL NOT NULL,
    line_total REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PO Receipts (track partial receipts)
CREATE TABLE po_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE po_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES po_receipts(id),
    po_item_id INTEGER NOT NULL REFERENCES purchase_order_items(id),
    batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
    quantity_received INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_receipts_po ON po_receipts(po_id);

-- Auto-generate PO number
CREATE TRIGGER trg_generate_po_number
BEFORE INSERT ON purchase_orders
WHEN NEW.po_number = ''
BEGIN
    SELECT RAISE(ABORT, 'PO number required');
END;

-- Update PO status on receipt
CREATE TRIGGER trg_update_po_status_on_receipt
AFTER UPDATE OF quantity_received ON purchase_order_items
BEGIN
    UPDATE purchase_orders SET
        status = CASE
            WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE po_id = NEW.po_id) = 
                 (SELECT SUM(quantity_ordered) FROM purchase_order_items WHERE po_id = NEW.po_id) THEN 'received'
            WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE po_id = NEW.po_id) > 0 THEN 'partial'
            ELSE status
        END,
        actual_delivery_date = CASE
            WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE po_id = NEW.po_id) = 
                 (SELECT SUM(quantity_ordered) FROM purchase_order_items WHERE po_id = NEW.po_id) 
            THEN CURRENT_TIMESTAMP
            ELSE actual_delivery_date
        END
    WHERE id = NEW.po_id;
END;
```

---

## Rust Implementation

### Models

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: i64,
    pub po_number: String,
    pub supplier_id: i64,
    pub order_date: String,
    pub expected_delivery_date: Option<String>,
    pub actual_delivery_date: Option<String>,
    pub status: String,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub shipping_cost: f64,
    pub total_amount: f64,
    pub payment_status: String,
    pub payment_terms: Option<String>,
    pub created_by: i64,
    pub approved_by: Option<i64>,
    pub received_by: Option<i64>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct POItem {
    pub id: i64,
    pub po_id: i64,
    pub product_variant_id: i64,
    pub quantity_ordered: i32,
    pub quantity_received: i32,
    pub unit_cost: f64,
    pub line_total: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct POReceipt {
    pub id: i64,
    pub po_id: i64,
    pub receipt_number: String,
    pub receipt_date: String,
    pub received_by: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceiveItemRequest {
    pub po_item_id: i64,
    pub quantity_received: i32,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub manufacture_date: Option<String>,
    pub location_code: Option<String>,
    pub notes: Option<String>,
}
```

### Commands

```rust
// File: src-tauri/src/commands/purchase_orders.rs

#[tauri::command]
pub async fn create_purchase_order(
    pool: State<'_, SqlitePool>,
    po: PurchaseOrder,
    items: Vec<POItem>,
    user_id: i64,
) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Generate PO number
    let po_number = generate_po_number(&mut tx).await?;

    // Calculate totals
    let subtotal: f64 = items.iter().map(|item| item.line_total).sum();
    let total = subtotal + po.tax_amount + po.shipping_cost;

    // Insert PO
    let result = sqlx::query!(
        "INSERT INTO purchase_orders (
            po_number, supplier_id, order_date, expected_delivery_date,
            status, subtotal, tax_amount, shipping_cost, total_amount,
            payment_status, payment_terms, created_by, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        po_number,
        po.supplier_id,
        po.order_date,
        po.expected_delivery_date,
        "draft",
        subtotal,
        po.tax_amount,
        po.shipping_cost,
        total,
        "unpaid",
        po.payment_terms,
        user_id,
        po.notes
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create PO: {}", e))?;

    let po_id = result.last_insert_rowid();

    // Insert items
    for item in items {
        sqlx::query!(
            "INSERT INTO purchase_order_items (
                po_id, product_variant_id, quantity_ordered, 
                unit_cost, line_total, notes
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            po_id,
            item.product_variant_id,
            item.quantity_ordered,
            item.unit_cost,
            item.line_total,
            item.notes
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to add PO item: {}", e))?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(po_id)
}

#[tauri::command]
pub async fn receive_purchase_order(
    pool: State<'_, SqlitePool>,
    po_id: i64,
    items: Vec<ReceiveItemRequest>,
    user_id: i64,
    notes: Option<String>,
) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Create receipt record
    let receipt_number = generate_receipt_number(&mut tx).await?;
    
    let receipt_result = sqlx::query!(
        "INSERT INTO po_receipts (po_id, receipt_number, received_by, notes) 
         VALUES (?1, ?2, ?3, ?4)",
        po_id,
        receipt_number,
        user_id,
        notes
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create receipt: {}", e))?;

    let receipt_id = receipt_result.last_insert_rowid();

    // Process each item
    for item_request in items {
        // Get PO item details
        let po_item = sqlx::query_as::<_, POItem>(
            "SELECT * FROM purchase_order_items WHERE id = ?"
        )
        .bind(item_request.po_item_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("PO item not found: {}", e))?;

        // Get variant info for cost price
        let variant = sqlx::query!(
            "SELECT pv.*, p.cost_price 
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.id
             WHERE pv.id = ?",
            po_item.product_variant_id
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Variant not found: {}", e))?;

        // Generate batch number if not provided
        let batch_number = if let Some(bn) = item_request.batch_number {
            bn
        } else {
            generate_batch_number_for_variant(
                po_item.product_variant_id, 
                &mut tx
            ).await?
        };

        // Create batch
        let batch_result = sqlx::query!(
            "INSERT INTO inventory_batches (
                batch_number, product_variant_id, supplier_id,
                received_date, expiry_date, manufacture_date,
                cost_price, initial_quantity, current_quantity,
                available_quantity, location_code, notes
            ) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            batch_number,
            po_item.product_variant_id,
            po.supplier_id,
            item_request.expiry_date,
            item_request.manufacture_date,
            po_item.unit_cost,
            item_request.quantity_received,
            item_request.quantity_received,
            item_request.quantity_received,
            item_request.location_code,
            item_request.notes
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create batch: {}", e))?;

        let batch_id = batch_result.last_insert_rowid();

        // Link receipt to batch
        sqlx::query!(
            "INSERT INTO po_receipt_items (receipt_id, po_item_id, batch_id, quantity_received)
             VALUES (?1, ?2, ?3, ?4)",
            receipt_id,
            item_request.po_item_id,
            batch_id,
            item_request.quantity_received
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to link receipt: {}", e))?;

        // Update PO item quantity_received
        sqlx::query!(
            "UPDATE purchase_order_items 
             SET quantity_received = quantity_received + ?
             WHERE id = ?",
            item_request.quantity_received,
            item_request.po_item_id
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update PO item: {}", e))?;

        // Log movement
        sqlx::query!(
            "INSERT INTO inventory_movements (
                product_variant_id, batch_id, movement_type,
                quantity_change, previous_stock, new_stock,
                reference_id, reference_type, user_id, notes
            ) VALUES (?1, ?2, 'receipt', ?3, 0, ?4, ?5, 'purchase_order', ?6, ?7)",
            po_item.product_variant_id,
            batch_id,
            item_request.quantity_received,
            item_request.quantity_received,
            po_id,
            user_id,
            format!("Received from PO {}", po_number)
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to log movement: {}", e))?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(receipt_id)
}

async fn generate_po_number(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM purchase_orders")
        .fetch_one(&mut **tx)
        .await
        .unwrap_or(0);
    
    Ok(format!("PO-{:06}", count + 1))
}

async fn generate_receipt_number(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM po_receipts")
        .fetch_one(&mut **tx)
        .await
        .unwrap_or(0);
    
    Ok(format!("REC-{:06}", count + 1))
}
```

---

## Frontend Implementation

### PO Creation Form

```typescript
// src/pages/PurchaseOrders/POForm.tsx
export const POForm: React.FC = () => {
  const [po, setPO] = useState({
    supplierId: 0,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    paymentTerms: 'Net 30',
    shippingCost: 0,
    notes: '',
  });

  const [items, setItems] = useState<POItem[]>([]);

  const addItem = () => {
    setItems([...items, {
      productVariantId: 0,
      quantityOrdered: 0,
      unitCost: 0,
      lineTotal: 0,
      notes: '',
    }]);
  };

  const handleSubmit = async () => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * 0.08; // Example tax rate
    const total = subtotal + taxAmount + po.shippingCost;

    await invoke('create_purchase_order', {
      po: { ...po, subtotal, taxAmount, totalAmount: total },
      items,
      userId: currentUser.id,
    });

    toast.success('Purchase order created!');
    navigate('/purchase-orders');
  };

  return (
    <form>
      <SelectSupplier value={po.supplierId} onChange={...} />
      <Input type="date" value={po.orderDate} />
      
      <div className="items-section">
        {items.map((item, idx) => (
          <POItemRow key={idx} item={item} onChange={...} />
        ))}
        <Button onClick={addItem}>Add Item</Button>
      </div>

      <div className="totals">
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>Tax: ${taxAmount.toFixed(2)}</div>
        <div>Shipping: ${po.shippingCost.toFixed(2)}</div>
        <div className="total">Total: ${total.toFixed(2)}</div>
      </div>

      <Button onClick={handleSubmit}>Create PO</Button>
    </form>
  );
};
```

### PO Receiving Interface

```typescript
// src/pages/PurchaseOrders/POReceiving.tsx
export const POReceiving: React.FC<{ poId: number }> = ({ poId }) => {
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [receivingItems, setReceivingItems] = useState<ReceiveItemRequest[]>([]);

  useEffect(() => {
    loadPO();
  }, [poId]);

  const handleReceive = async () => {
    await invoke('receive_purchase_order', {
      poId,
      items: receivingItems,
      userId: currentUser.id,
      notes: receiptNotes,
    });

    toast.success('PO received! Batches created.');
    navigate('/purchase-orders');
  };

  return (
    <div>
      <h2>Receive PO: {po?.poNumber}</h2>
      
      {items.map((item, idx) => (
        <div key={item.id} className="receive-item">
          <div className="item-info">
            <h4>{item.variantName}</h4>
            <div>Ordered: {item.quantityOrdered}</div>
            <div>Already Received: {item.quantityReceived}</div>
            <div>Remaining: {item.quantityOrdered - item.quantityReceived}</div>
          </div>

          <div className="receive-inputs">
            <Input
              type="number"
              label="Quantity Receiving"
              max={item.quantityOrdered - item.quantityReceived}
              onChange={(e) => updateReceivingQty(idx, parseInt(e.target.value))}
            />
            
            <Input
              type="text"
              label="Batch Number (auto-generated if empty)"
              onChange={(e) => updateBatchNumber(idx, e.target.value)}
            />

            <Input
              type="date"
              label="Expiry Date"
              onChange={(e) => updateExpiryDate(idx, e.target.value)}
            />

            <Input
              type="text"
              label="Location Code"
              onChange={(e) => updateLocationCode(idx, e.target.value)}
            />
          </div>
        </div>
      ))}

      <Textarea
        label="Receipt Notes"
        value={receiptNotes}
        onChange={(e) => setReceiptNotes(e.target.value)}
      />

      <Button onClick={handleReceive}>Complete Receipt</Button>
    </div>
  );
};
```

---

## Testing Checklist

- [ ] Can create PO with multiple items
- [ ] PO number auto-generates
- [ ] Totals calculate correctly
- [ ] Can receive full PO (all items at once)
- [ ] Can receive partial PO (some items)
- [ ] Each received item creates a batch
- [ ] Batch numbers auto-generate
- [ ] PO status updates correctly (draft → received)
- [ ] Inventory aggregates update
- [ ] Movement log is accurate
- [ ] Can't receive more than ordered
- [ ] Supplier performance metrics work

---

**Next:** Phase 4 - Product Management UI
