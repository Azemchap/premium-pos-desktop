use crate::models::{
    CreatePurchaseOrderRequest, PurchaseOrder, PurchaseOrderItem, UpdatePurchaseOrderRequest,
};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

// Generate unique PO number
async fn generate_po_number(pool: &SqlitePool) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM purchase_orders")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;
    Ok(format!("PO{:06}", count + 1))
}

#[command]
pub async fn get_purchase_orders(
    pool: State<'_, SqlitePool>,
    status: Option<String>,
) -> Result<Vec<PurchaseOrder>, String> {
    let pool_ref = pool.inner();
    let mut query = String::from("SELECT * FROM purchase_orders WHERE 1=1");

    if status.is_some() {
        query.push_str(" AND status = ?");
    }

    query.push_str(" ORDER BY order_date DESC, created_at DESC");

    let mut sql_query = sqlx::query(&query);

    if let Some(s) = status {
        sql_query = sql_query.bind(s);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut orders = Vec::new();
    for row in rows {
        orders.push(PurchaseOrder {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            po_number: row.try_get("po_number").map_err(|e| e.to_string())?,
            supplier_id: row.try_get("supplier_id").map_err(|e| e.to_string())?,
            order_date: row.try_get("order_date").map_err(|e| e.to_string())?,
            expected_delivery_date: row.try_get("expected_delivery_date").ok(),
            actual_delivery_date: row.try_get("actual_delivery_date").ok(),
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax: row.try_get("tax").map_err(|e| e.to_string())?,
            shipping_cost: row.try_get("shipping_cost").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").ok(),
            notes: row.try_get("notes").ok(),
            created_by: row.try_get("created_by").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    Ok(orders)
}

#[command]
pub async fn get_purchase_order(
    pool: State<'_, SqlitePool>,
    po_id: i64,
) -> Result<PurchaseOrder, String> {
    let pool_ref = pool.inner();
    let row = sqlx::query("SELECT * FROM purchase_orders WHERE id = ?1")
        .bind(po_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or("Purchase order not found".to_string())?;

    Ok(PurchaseOrder {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        po_number: row.try_get("po_number").map_err(|e| e.to_string())?,
        supplier_id: row.try_get("supplier_id").map_err(|e| e.to_string())?,
        order_date: row.try_get("order_date").map_err(|e| e.to_string())?,
        expected_delivery_date: row.try_get("expected_delivery_date").ok(),
        actual_delivery_date: row.try_get("actual_delivery_date").ok(),
        subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax: row.try_get("tax").map_err(|e| e.to_string())?,
        shipping_cost: row.try_get("shipping_cost").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        status: row.try_get("status").map_err(|e| e.to_string())?,
        payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").ok(),
        notes: row.try_get("notes").ok(),
        created_by: row.try_get("created_by").ok(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    })
}

#[command]
pub async fn get_purchase_order_items(
    pool: State<'_, SqlitePool>,
    po_id: i64,
) -> Result<Vec<PurchaseOrderItem>, String> {
    let pool_ref = pool.inner();
    let rows = sqlx::query("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?1")
        .bind(po_id)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(PurchaseOrderItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            purchase_order_id: row
                .try_get("purchase_order_id")
                .map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
            received_quantity: row
                .try_get("received_quantity")
                .map_err(|e| e.to_string())?,
            unit_cost: row.try_get("unit_cost").map_err(|e| e.to_string())?,
            total_cost: row.try_get("total_cost").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok(),
        });
    }

    Ok(items)
}

#[command]
pub async fn create_purchase_order(
    pool: State<'_, SqlitePool>,
    request: CreatePurchaseOrderRequest,
    user_id: i64,
) -> Result<PurchaseOrder, String> {
    let pool_ref = pool.inner();
    let po_number = generate_po_number(pool_ref).await?;

    // Calculate totals
    let subtotal: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_cost)
        .sum();

    let tax = request.tax.unwrap_or(0.0);
    let shipping_cost = request.shipping_cost.unwrap_or(0.0);
    let total_amount = subtotal + tax + shipping_cost;

    // Start a transaction
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Transaction error: {}", e))?;

    // Insert purchase order
    let result = sqlx::query(
        "INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_delivery_date,
         subtotal, tax, shipping_cost, total_amount, payment_method, notes, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    )
    .bind(&po_number)
    .bind(request.supplier_id)
    .bind(&request.order_date)
    .bind(&request.expected_delivery_date)
    .bind(subtotal)
    .bind(tax)
    .bind(shipping_cost)
    .bind(total_amount)
    .bind(&request.payment_method)
    .bind(&request.notes)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let po_id = result.last_insert_rowid();

    // Insert purchase order items
    for item in &request.items {
        let total_cost = item.quantity as f64 * item.unit_cost;

        sqlx::query(
            "INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, total_cost)
             VALUES (?1, ?2, ?3, ?4, ?5)"
        )
            .bind(po_id)
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(item.unit_cost)
            .bind(total_cost)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Transaction commit error: {}", e))?;

    // Fetch and return the created purchase order
    get_purchase_order(pool, po_id).await
}

#[command]
pub async fn update_purchase_order(
    pool: State<'_, SqlitePool>,
    po_id: i64,
    request: UpdatePurchaseOrderRequest,
) -> Result<PurchaseOrder, String> {
    let pool_ref = pool.inner();

    let mut updates = Vec::new();

    if request.supplier_id.is_some() {
        updates.push("supplier_id = ?");
    }
    if request.order_date.is_some() {
        updates.push("order_date = ?");
    }
    if request.expected_delivery_date.is_some() {
        updates.push("expected_delivery_date = ?");
    }
    if request.actual_delivery_date.is_some() {
        updates.push("actual_delivery_date = ?");
    }
    if request.status.is_some() {
        updates.push("status = ?");
    }
    if request.payment_status.is_some() {
        updates.push("payment_status = ?");
    }
    if request.payment_method.is_some() {
        updates.push("payment_method = ?");
    }
    if request.tax.is_some() {
        updates.push("tax = ?");
    }
    if request.shipping_cost.is_some() {
        updates.push("shipping_cost = ?");
    }
    if request.notes.is_some() {
        updates.push("notes = ?");
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query_str = format!(
        "UPDATE purchase_orders SET {} WHERE id = ?",
        updates.join(", ")
    );
    let mut q = sqlx::query(&query_str);

    if let Some(v) = request.supplier_id {
        q = q.bind(v);
    }
    if let Some(v) = &request.order_date {
        q = q.bind(v);
    }
    if let Some(v) = &request.expected_delivery_date {
        q = q.bind(v);
    }
    if let Some(v) = &request.actual_delivery_date {
        q = q.bind(v);
    }
    if let Some(v) = &request.status {
        q = q.bind(v);
    }
    if let Some(v) = &request.payment_status {
        q = q.bind(v);
    }
    if let Some(v) = &request.payment_method {
        q = q.bind(v);
    }
    if let Some(v) = request.tax {
        q = q.bind(v);
    }
    if let Some(v) = request.shipping_cost {
        q = q.bind(v);
    }
    if let Some(v) = &request.notes {
        q = q.bind(v);
    }
    q = q.bind(po_id);

    q.execute(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    // If tax or shipping_cost changed, recalculate total
    if request.tax.is_some() || request.shipping_cost.is_some() {
        // Query the current values directly
        let row =
            sqlx::query("SELECT subtotal, tax, shipping_cost FROM purchase_orders WHERE id = ?1")
                .bind(po_id)
                .fetch_one(pool_ref)
                .await
                .map_err(|e| format!("Database error: {}", e))?;

        let subtotal: f64 = row.try_get("subtotal").map_err(|e| e.to_string())?;
        let tax: f64 = row.try_get("tax").map_err(|e| e.to_string())?;
        let shipping_cost: f64 = row.try_get("shipping_cost").map_err(|e| e.to_string())?;
        let new_total = subtotal + tax + shipping_cost;

        sqlx::query("UPDATE purchase_orders SET total_amount = ?1 WHERE id = ?2")
            .bind(new_total)
            .bind(po_id)
            .execute(pool_ref)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
    }

    get_purchase_order(pool, po_id).await
}

#[command]
pub async fn delete_purchase_order(
    pool: State<'_, SqlitePool>,
    po_id: i64,
) -> Result<String, String> {
    let pool_ref = pool.inner();

    // Items will be deleted automatically due to ON DELETE CASCADE
    let result = sqlx::query("DELETE FROM purchase_orders WHERE id = ?1")
        .bind(po_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Purchase order not found".to_string());
    }

    Ok("Purchase order deleted successfully".to_string())
}

#[command]
pub async fn receive_purchase_order_item(
    pool: State<'_, SqlitePool>,
    item_id: i64,
    received_qty: i32,
) -> Result<PurchaseOrderItem, String> {
    let pool_ref = pool.inner();

    // Update received quantity
    sqlx::query(
        "UPDATE purchase_order_items SET received_quantity = received_quantity + ?1 WHERE id = ?2",
    )
    .bind(received_qty)
    .bind(item_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    // Get the updated item
    let row = sqlx::query("SELECT * FROM purchase_order_items WHERE id = ?1")
        .bind(item_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or("Purchase order item not found".to_string())?;

    let item = PurchaseOrderItem {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        purchase_order_id: row
            .try_get("purchase_order_id")
            .map_err(|e| e.to_string())?,
        product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
        quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
        received_quantity: row
            .try_get("received_quantity")
            .map_err(|e| e.to_string())?,
        unit_cost: row.try_get("unit_cost").map_err(|e| e.to_string())?,
        total_cost: row.try_get("total_cost").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").ok(),
    };

    // Check if all items are received and update PO status
    let po_id = item.purchase_order_id;

    // Query items directly
    let item_rows = sqlx::query(
        "SELECT quantity, received_quantity FROM purchase_order_items WHERE purchase_order_id = ?1",
    )
    .bind(po_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let all_received = item_rows.iter().all(|row| {
        let qty: i32 = row.try_get("quantity").unwrap_or(0);
        let received: i32 = row.try_get("received_quantity").unwrap_or(0);
        received >= qty
    });
    let partial_received = item_rows.iter().any(|row| {
        let received: i32 = row.try_get("received_quantity").unwrap_or(0);
        received > 0
    });

    if all_received {
        sqlx::query("UPDATE purchase_orders SET status = 'Received' WHERE id = ?1")
            .bind(po_id)
            .execute(pool_ref)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
    } else if partial_received {
        sqlx::query("UPDATE purchase_orders SET status = 'Partial' WHERE id = ?1")
            .bind(po_id)
            .execute(pool_ref)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
    }

    Ok(item)
}
