use crate::models::{InventoryItem, InventoryMovement, StockUpdateRequest};
use sqlx::{Row, SqlitePool};
use tauri::State;

#[tauri::command]
pub async fn get_inventory(pool: State<'_, SqlitePool>) -> Result<Vec<InventoryItem>, String> {
    let rows = sqlx::query(
        "SELECT i.*, p.name as product_name, p.sku FROM inventory i 
         JOIN products p ON i.product_id = p.id 
         ORDER BY p.name",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut inventory = Vec::new();
    for row in rows {
        let item = InventoryItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            current_stock: row.try_get("current_stock").map_err(|e| e.to_string())?,
            minimum_stock: row.try_get("minimum_stock").map_err(|e| e.to_string())?,
            maximum_stock: row.try_get("maximum_stock").map_err(|e| e.to_string())?,
            reserved_stock: row.try_get("reserved_stock").map_err(|e| e.to_string())?,
            available_stock: row.try_get("available_stock").map_err(|e| e.to_string())?,
            last_updated: row.try_get("last_updated").map_err(|e| e.to_string())?,
            last_stock_take: row.try_get("last_stock_take").ok().flatten(),
            stock_take_count: row.try_get("stock_take_count").map_err(|e| e.to_string())?,
            product: None, // We'll set this separately if needed
        };
        inventory.push(item);
    }

    Ok(inventory)
}

#[tauri::command]
pub async fn get_inventory_by_product_id(
    pool: State<'_, SqlitePool>,
    product_id: i64,
) -> Result<Option<InventoryItem>, String> {
    let row = sqlx::query(
        "SELECT i.*, p.name as product_name, p.sku FROM inventory i 
         JOIN products p ON i.product_id = p.id 
         WHERE i.product_id = ?",
    )
    .bind(product_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let item = InventoryItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            current_stock: row.try_get("current_stock").map_err(|e| e.to_string())?,
            minimum_stock: row.try_get("minimum_stock").map_err(|e| e.to_string())?,
            maximum_stock: row.try_get("maximum_stock").map_err(|e| e.to_string())?,
            reserved_stock: row.try_get("reserved_stock").map_err(|e| e.to_string())?,
            available_stock: row.try_get("available_stock").map_err(|e| e.to_string())?,
            last_updated: row.try_get("last_updated").map_err(|e| e.to_string())?,
            last_stock_take: row.try_get("last_stock_take").ok().flatten(),
            stock_take_count: row.try_get("stock_take_count").map_err(|e| e.to_string())?,
            product: None, // We'll set this separately if needed
        };
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn update_stock(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    request: StockUpdateRequest,
) -> Result<InventoryItem, String> {
    // Start a transaction
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    // Update inventory
    sqlx::query(
        "UPDATE inventory SET current_stock = ?, available_stock = ?, updated_at = ? WHERE product_id = ?"
    )
    .bind(request.new_stock)
    .bind(request.new_stock - request.reserved_stock)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(product_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Create inventory movement record
    sqlx::query(
        "INSERT INTO inventory_movements (product_id, product_name, sku, quantity_change, movement_type, notes, reference_id, reference_type, user_id, user_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(product_id)
    .bind(&request.product_name)
    .bind(&request.sku)
    .bind(request.quantity_change)
    .bind(&request.movement_type)
    .bind(&request.notes)
    .bind(request.reference_id)
    .bind(&request.reference_type)
    .bind(request.user_id)
    .bind(&request.user_name)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    // Return updated inventory item
    let row = sqlx::query("SELECT * FROM inventory WHERE product_id = ?")
        .bind(product_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let item = InventoryItem {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
        current_stock: row.try_get("current_stock").map_err(|e| e.to_string())?,
        minimum_stock: row.try_get("minimum_stock").map_err(|e| e.to_string())?,
        maximum_stock: row.try_get("maximum_stock").map_err(|e| e.to_string())?,
        reserved_stock: row.try_get("reserved_stock").map_err(|e| e.to_string())?,
        available_stock: row.try_get("available_stock").map_err(|e| e.to_string())?,
        last_updated: row.try_get("last_updated").map_err(|e| e.to_string())?,
        last_stock_take: row.try_get("last_stock_take").ok().flatten(),
        stock_take_count: row.try_get("stock_take_count").map_err(|e| e.to_string())?,
        product: None,
    };

    Ok(item)
}

#[tauri::command]
pub async fn create_stock_adjustment(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    adjustment_type: String,
    quantity: i32,
    notes: Option<String>,
    user_id: i64,
    user_name: String,
) -> Result<InventoryItem, String> {
    // Get current inventory
    let current_inventory = get_inventory_by_product_id(pool.clone(), product_id).await?;
    let current_stock = current_inventory
        .as_ref()
        .map(|inv| inv.current_stock)
        .unwrap_or(0);

    // Calculate new stock
    let new_stock = match adjustment_type.as_str() {
        "add" => current_stock + quantity,
        "subtract" => current_stock - quantity,
        "set" => quantity,
        _ => return Err("Invalid adjustment type".to_string()),
    };

    // Create stock update request
    let request = StockUpdateRequest {
        product_id,
        quantity_change: new_stock - current_stock,
        movement_type: adjustment_type,
        notes,
        reference_id: None,
        reference_type: None,
        new_stock,
        reserved_stock: 0,            // This will be updated from inventory
        product_name: "".to_string(), // Will be fetched
        sku: "".to_string(),          // Will be fetched
        user_id: Some(user_id),
        user_name: Some(user_name),
    };

    update_stock(pool, product_id, request).await
}

#[tauri::command]
pub async fn get_stock_movements(
    pool: State<'_, SqlitePool>,
    product_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<InventoryMovement>, String> {
    let mut query = String::from("SELECT * FROM inventory_movements");
    let mut params: Vec<String> = Vec::new();

    if let Some(pid) = product_id {
        query.push_str(" WHERE product_id = ?");
        params.push(pid.to_string());
    }

    query.push_str(" ORDER BY created_at DESC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut movements = Vec::new();
    for row in rows {
        let movement = InventoryMovement {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            product_name: row.try_get("product_name").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            quantity_change: row.try_get("quantity_change").map_err(|e| e.to_string())?,
            movement_type: row.try_get("movement_type").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            reference_id: row.try_get("reference_id").ok().flatten(),
            reference_type: row.try_get("reference_type").ok().flatten(),
            user_id: row.try_get("user_id").ok().flatten(),
            user_name: row.try_get("user_name").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        movements.push(movement);
    }

    Ok(movements)
}
