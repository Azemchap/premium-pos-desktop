// src-tauri/src/commands/stock.rs - Stock Management Commands
use sqlx::{Row, SqlitePool};
use tauri::{command, State};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StockReceiptRequest {
    pub product_id: i64,
    pub quantity: i32,
    pub cost_price: f64,
    pub supplier: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockAdjustmentRequest {
    pub product_id: i64,
    pub adjustment_type: String, // 'add' or 'subtract'
    pub quantity: i32,
    pub reason: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockTransferRequest {
    pub product_id: i64,
    pub quantity: i32,
    pub from_location: String,
    pub to_location: String,
    pub notes: Option<String>,
}

/// Receive new stock (purchase/delivery)
#[command]
pub async fn receive_stock(
    pool: State<'_, SqlitePool>,
    request: StockReceiptRequest,
    user_id: i64,
) -> Result<String, String> {
    let pool_ref = pool.inner();
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Get current stock
    let current = sqlx::query("SELECT current_stock FROM inventory WHERE product_id = ?1")
        .bind(request.product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Product not found in inventory: {}", e))?;

    let previous_stock: i32 = current.try_get("current_stock").map_err(|e| e.to_string())?;
    let new_stock = previous_stock + request.quantity;

    // Update inventory
    sqlx::query(
        "UPDATE inventory SET 
            current_stock = current_stock + ?1,
            available_stock = available_stock + ?1,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?2",
    )
    .bind(request.quantity)
    .bind(request.product_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // Update product cost price if provided
    if request.cost_price > 0.0 {
        sqlx::query("UPDATE products SET cost_price = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
            .bind(request.cost_price)
            .bind(request.product_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to update cost price: {}", e))?;
    }

    // Create inventory movement record
    let notes = format!(
        "Stock receipt: {} units @ ${:.2}{}{}",
        request.quantity,
        request.cost_price,
        request.supplier.as_ref().map(|s| format!(" from {}", s)).unwrap_or_default(),
        request.notes.as_ref().map(|n| format!(" - {}", n)).unwrap_or_default()
    );

    sqlx::query(
        "INSERT INTO inventory_movements 
            (product_id, movement_type, quantity_change, previous_stock, new_stock, 
             reference_type, notes, user_id)
         VALUES (?1, 'receipt', ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(request.product_id)
    .bind(request.quantity)
    .bind(previous_stock)
    .bind(new_stock)
    .bind(request.reference_number.as_ref().map(|r| r.as_str()).unwrap_or("manual"))
    .bind(&notes)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create movement record: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(format!("Successfully received {} units", request.quantity))
}

/// Adjust stock (add or subtract)
#[command]
pub async fn adjust_stock(
    pool: State<'_, SqlitePool>,
    request: StockAdjustmentRequest,
    user_id: i64,
) -> Result<String, String> {
    let pool_ref = pool.inner();
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Get current stock
    let current = sqlx::query("SELECT current_stock FROM inventory WHERE product_id = ?1")
        .bind(request.product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Product not found in inventory: {}", e))?;

    let previous_stock: i32 = current.try_get("current_stock").map_err(|e| e.to_string())?;
    
    let quantity_change = if request.adjustment_type == "add" {
        request.quantity
    } else {
        -request.quantity
    };

    let new_stock = previous_stock + quantity_change;

    if new_stock < 0 {
        return Err("Cannot adjust stock below zero".to_string());
    }

    // Update inventory
    sqlx::query(
        "UPDATE inventory SET 
            current_stock = current_stock + ?1,
            available_stock = available_stock + ?1,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?2",
    )
    .bind(quantity_change)
    .bind(request.product_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // Create inventory movement record
    let notes = format!(
        "Stock adjustment ({}): {} - {}",
        request.adjustment_type,
        request.reason,
        request.notes.as_ref().map(|n| n.as_str()).unwrap_or("")
    );

    sqlx::query(
        "INSERT INTO inventory_movements 
            (product_id, movement_type, quantity_change, previous_stock, new_stock, 
             reference_type, notes, user_id)
         VALUES (?1, 'adjustment', ?2, ?3, ?4, 'manual', ?5, ?6)",
    )
    .bind(request.product_id)
    .bind(quantity_change)
    .bind(previous_stock)
    .bind(new_stock)
    .bind(&notes)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create movement record: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(format!("Successfully adjusted stock by {} units", quantity_change))
}

/// Reserve stock (for orders, quotes, etc.)
#[command]
pub async fn reserve_stock(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    quantity: i32,
    user_id: i64,
    notes: Option<String>,
) -> Result<String, String> {
    let pool_ref = pool.inner();
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Get current stock
    let current = sqlx::query("SELECT current_stock, reserved_stock, available_stock FROM inventory WHERE product_id = ?1")
        .bind(product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Product not found in inventory: {}", e))?;

    let available_stock: i32 = current.try_get("available_stock").map_err(|e| e.to_string())?;

    if available_stock < quantity {
        return Err(format!("Insufficient stock. Available: {}, Requested: {}", available_stock, quantity));
    }

    // Update inventory (increase reserved, decrease available)
    sqlx::query(
        "UPDATE inventory SET 
            reserved_stock = reserved_stock + ?1,
            available_stock = available_stock - ?1,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?2",
    )
    .bind(quantity)
    .bind(product_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to reserve stock: {}", e))?;

    // Create inventory movement record
    sqlx::query(
        "INSERT INTO inventory_movements 
            (product_id, movement_type, quantity_change, previous_stock, new_stock, 
             reference_type, notes, user_id)
         VALUES (?1, 'reservation', ?2, ?3, ?3, 'reservation', ?4, ?5)",
    )
    .bind(product_id)
    .bind(quantity)
    .bind(available_stock)
    .bind(notes.as_ref().map(|n| n.as_str()).unwrap_or("Stock reserved"))
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create movement record: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(format!("Successfully reserved {} units", quantity))
}

/// Release reserved stock
#[command]
pub async fn release_reserved_stock(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    quantity: i32,
    _user_id: i64,
) -> Result<String, String> {
    let pool_ref = pool.inner();

    // Update inventory (decrease reserved, increase available)
    sqlx::query(
        "UPDATE inventory SET 
            reserved_stock = reserved_stock - ?1,
            available_stock = available_stock + ?1,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?2",
    )
    .bind(quantity)
    .bind(product_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to release stock: {}", e))?;

    Ok(format!("Successfully released {} units", quantity))
}

/// Stock take/count
#[command]
pub async fn stock_take(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    actual_count: i32,
    user_id: i64,
    notes: Option<String>,
) -> Result<String, String> {
    let pool_ref = pool.inner();
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Get current stock
    let current = sqlx::query("SELECT current_stock FROM inventory WHERE product_id = ?1")
        .bind(product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Product not found in inventory: {}", e))?;

    let previous_stock: i32 = current.try_get("current_stock").map_err(|e| e.to_string())?;
    let difference = actual_count - previous_stock;

    // Update inventory with actual count
    sqlx::query(
        "UPDATE inventory SET 
            current_stock = ?1,
            available_stock = available_stock + ?2,
            stock_take_count = stock_take_count + 1,
            last_stock_take = CURRENT_TIMESTAMP,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?3",
    )
    .bind(actual_count)
    .bind(difference)
    .bind(product_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // Create inventory movement record
    let movement_notes = format!(
        "Stock take: counted {} (system: {}, difference: {}) - {}",
        actual_count,
        previous_stock,
        difference,
        notes.as_ref().map(|n| n.as_str()).unwrap_or("")
    );

    sqlx::query(
        "INSERT INTO inventory_movements 
            (product_id, movement_type, quantity_change, previous_stock, new_stock, 
             reference_type, notes, user_id)
         VALUES (?1, 'stock_take', ?2, ?3, ?4, 'stock_take', ?5, ?6)",
    )
    .bind(product_id)
    .bind(difference)
    .bind(previous_stock)
    .bind(actual_count)
    .bind(&movement_notes)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create movement record: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(format!(
        "Stock take completed. Difference: {} units",
        difference
    ))
}
