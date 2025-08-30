use crate::models::{InventoryItem, StockUpdateRequest, InventoryMovement};
use sqlx::{SqlitePool, Row};

pub async fn get_inventory(pool: &SqlitePool) -> Result<Vec<InventoryItem>, String> {
    let rows = sqlx::query(
        "SELECT i.*, p.name as product_name, p.sku, p.category 
         FROM inventory i 
         JOIN products p ON i.product_id = p.id 
         WHERE p.is_active = 1 
         ORDER BY p.name"
    )
    .fetch_all(pool)
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
            product: None, // We'll need to fetch this separately if needed
        };
        inventory.push(item);
    }

    Ok(inventory)
}

pub async fn get_inventory_by_product_id(
    pool: &SqlitePool,
    product_id: i64,
) -> Result<Option<InventoryItem>, String> {
    let row = sqlx::query(
        "SELECT i.*, p.name as product_name, p.sku, p.category 
         FROM inventory i 
         JOIN products p ON i.product_id = p.id 
         WHERE i.product_id = ? AND p.is_active = 1"
    )
    .bind(product_id)
    .fetch_optional(pool)
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
            product: None, // We'll need to fetch this separately if needed
        };
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

pub async fn update_stock(
    pool: &SqlitePool,
    request: StockUpdateRequest,
) -> Result<InventoryItem, String> {
    let mut transaction = pool.begin().await.map_err(|e| e.to_string())?;

    // Update inventory
    let result = sqlx::query(
        "UPDATE inventory 
         SET minimum_stock = minimum_stock + ?, 
             last_updated = ? 
         WHERE product_id = ?"
    )
    .bind(request.quantity_change)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(request.product_id)
    .execute(&mut *transaction)
    .await
    .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("Product not found in inventory".to_string());
    }

    // Record inventory movement
    let _movement_id = sqlx::query(
        "INSERT INTO inventory_movements (product_id, quantity_change, movement_type, notes, reference_id, reference_type, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.product_id)
    .bind(request.quantity_change)
    .bind(&request.movement_type)
    .bind(&request.notes)
    .bind(&request.reference_id)
    .bind(&request.reference_type)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *transaction)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    // Commit transaction
    transaction.commit().await.map_err(|e| e.to_string())?;

    // Return updated inventory item
    get_inventory_by_product_id(pool, request.product_id)
        .await?
        .ok_or("Failed to retrieve updated inventory item".to_string())
}

pub async fn create_stock_adjustment(
    pool: &SqlitePool,
    request: StockUpdateRequest,
) -> Result<InventoryItem, String> {
    // This would typically create a stock adjustment record
    // For now, we'll just update the stock
    update_stock(pool, request).await
}

pub async fn get_stock_movements(
    pool: &SqlitePool,
    product_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<InventoryMovement>, String> {
    let mut query = String::from(
        "SELECT im.*, p.name as product_name, p.sku 
         FROM inventory_movements im 
         JOIN products p ON im.product_id = p.id"
    );

    let mut params: Vec<String> = Vec::new();
    if let Some(pid) = product_id {
        query.push_str(" WHERE im.product_id = ?");
        params.push(pid.to_string());
    }

    query.push_str(" ORDER BY im.created_at DESC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool)
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