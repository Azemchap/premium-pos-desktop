use crate::models::{InventoryItem, StockUpdateRequest};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryMovement {
    pub id: i64,
    pub product_id: i64,
    pub movement_type: String,
    pub quantity_change: i32,
    pub previous_stock: i32,
    pub new_stock: i32,
    pub reference_id: Option<i64>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,
    pub user_id: Option<i64>,
    pub created_at: String,
    pub product_name: Option<String>,
    pub user_name: Option<String>,
}

#[command]
pub async fn sync_inventory(pool: State<'_, SqlitePool>) -> Result<i32, String> {
    let pool_ref = pool.inner();
    
    // Find products without inventory records and create them
    let result = sqlx::query(
        "INSERT INTO inventory (product_id, current_stock, available_stock, minimum_stock, maximum_stock, reserved_stock, stock_take_count)
         SELECT p.id, 0, 0, p.reorder_point, 1000, 0, 0
         FROM products p
         WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id)"
    )
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to sync inventory: {}", e))?;
    
    Ok(result.rows_affected() as i32)
}

#[command]
pub async fn get_inventory(pool: State<'_, SqlitePool>) -> Result<Vec<InventoryItem>, String> {
    let pool_ref = pool.inner();
    
    // First, sync to ensure all products have inventory records
    let _ = sync_inventory(pool.clone()).await;


    let rows = sqlx::query(
        "SELECT 
                i.id, 
                p.id as product_id, 
                COALESCE(i.current_stock, 0) as current_stock, 
                COALESCE(i.minimum_stock, p.reorder_point) as minimum_stock, 
                COALESCE(i.maximum_stock, 1000) as maximum_stock,
                COALESCE(i.reserved_stock, 0) as reserved_stock, 
                COALESCE(i.available_stock, 0) as available_stock, 
                COALESCE(i.last_updated, p.created_at) as last_updated, 
                i.last_stock_take,
                COALESCE(i.stock_take_count, 0) as stock_take_count,
                p.sku, p.barcode, p.name, p.description, p.category, p.subcategory, p.brand,
                p.unit_of_measure, p.cost_price, p.selling_price, p.wholesale_price, p.tax_rate,
                p.is_active, p.is_taxable, p.weight, p.dimensions, p.supplier_info, p.reorder_point,
                p.created_at, p.updated_at
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         ORDER BY p.name ASC",
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut inventory_items = Vec::new();
    for row in rows {
        let product = crate::models::Product {
            id: row.try_get("product_id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };

        let inventory_item = InventoryItem {
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
            product: Some(product),
        };

        inventory_items.push(inventory_item);
    }

    Ok(inventory_items)
}

#[command]
pub async fn update_stock(
    pool: State<'_, SqlitePool>,
    request: StockUpdateRequest,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    // Get current stock
    let current_stock =
        sqlx::query("SELECT current_stock, reserved_stock FROM inventory WHERE product_id = ?1")
            .bind(request.product_id)
            .fetch_one(pool_ref)
            .await
            .map_err(|e| format!("Failed to get current stock: {}", e))?;

    let current_stock_value: i32 = current_stock
        .try_get("current_stock")
        .map_err(|e| e.to_string())?;
    let reserved_stock_value: i32 = current_stock
        .try_get("reserved_stock")
        .map_err(|e| e.to_string())?;

    let new_stock = current_stock_value + request.quantity_change;
    let new_available_stock = new_stock - reserved_stock_value;

    if new_stock < 0 {
        return Err("Stock cannot go below zero".to_string());
    }

    // Update inventory
    sqlx::query(
        "UPDATE inventory SET 
            current_stock = ?1,
            available_stock = ?2,
            last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?3",
    )
    .bind(new_stock)
    .bind(new_available_stock)
    .bind(request.product_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // Record movement
    sqlx::query(
        "INSERT INTO inventory_movements (product_id, movement_type, quantity_change, previous_stock, 
                                         new_stock, reference_id, reference_type, notes, user_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
    )
    .bind(request.product_id)
    .bind(&request.movement_type)
    .bind(request.quantity_change)
    .bind(current_stock_value)
    .bind(new_stock)
    .bind(request.reference_id)
    .bind(&request.reference_type)
    .bind(&request.notes)
    .bind(request.user_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to record inventory movement: {}", e))?;

    Ok(true)
}

#[command]
pub async fn get_inventory_movements(
    pool: State<'_, SqlitePool>,
    product_id: Option<i64>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<InventoryMovement>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let query = if let Some(_pid) = product_id {
        "SELECT im.id, im.product_id, im.movement_type, im.quantity_change, im.previous_stock,
                im.new_stock, im.reference_id, im.reference_type, im.notes, im.user_id, im.created_at,
                p.name as product_name,
                u.first_name || ' ' || u.last_name as user_name
         FROM inventory_movements im
         JOIN products p ON im.product_id = p.id
         LEFT JOIN users u ON im.user_id = u.id
         WHERE im.product_id = ?1
         ORDER BY im.created_at DESC
         LIMIT ?2 OFFSET ?3"
    } else {
        "SELECT im.id, im.product_id, im.movement_type, im.quantity_change, im.previous_stock,
                im.new_stock, im.reference_id, im.reference_type, im.notes, im.user_id, im.created_at,
                p.name as product_name,
                u.first_name || ' ' || u.last_name as user_name
         FROM inventory_movements im
         JOIN products p ON im.product_id = p.id
         LEFT JOIN users u ON im.user_id = u.id
         ORDER BY im.created_at DESC
         LIMIT ?1 OFFSET ?2"
    };

    let rows = if let Some(pid) = product_id {
        sqlx::query(query)
            .bind(pid)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool_ref)
            .await
    } else {
        sqlx::query(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool_ref)
            .await
    }
    .map_err(|e| format!("Database error: {}", e))?;

    let mut movements = Vec::new();
    for row in rows {
        let movement = InventoryMovement {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            movement_type: row.try_get("movement_type").map_err(|e| e.to_string())?,
            quantity_change: row.try_get("quantity_change").map_err(|e| e.to_string())?,
            previous_stock: row.try_get("previous_stock").map_err(|e| e.to_string())?,
            new_stock: row.try_get("new_stock").map_err(|e| e.to_string())?,
            reference_id: row.try_get("reference_id").ok().flatten(),
            reference_type: row.try_get("reference_type").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            user_id: row.try_get("user_id").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            product_name: row.try_get("product_name").ok().flatten(),
            user_name: row.try_get("user_name").ok().flatten(),
        };
        movements.push(movement);
    }

    Ok(movements)
}

#[command]
pub async fn create_stock_adjustment(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    quantity_change: i32,
    reason: String,
    user_id: i64,
) -> Result<bool, String> {
    let _pool_ref = pool.inner();

    let request = StockUpdateRequest {
        product_id,
        quantity_change,
        movement_type: "adjustment".to_string(),
        notes: Some(reason),
        reference_id: None,
        reference_type: None,
        user_id: Some(user_id),
    };

    update_stock(pool, request).await
}

#[command]
pub async fn get_low_stock_items(
    pool: State<'_, SqlitePool>,
    limit: Option<i32>,
) -> Result<Vec<InventoryItem>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(50);

    let rows = sqlx::query(
        "SELECT i.id, i.product_id, i.current_stock, i.minimum_stock, i.maximum_stock,
                i.reserved_stock, i.available_stock, i.last_updated, i.last_stock_take,
                i.stock_take_count,
                p.sku, p.barcode, p.name, p.description, p.category, p.subcategory, p.brand,
                p.unit_of_measure, p.cost_price, p.selling_price, p.wholesale_price, p.tax_rate,
                p.is_active, p.is_taxable, p.weight, p.dimensions, p.supplier_info, p.reorder_point,
                p.created_at, p.updated_at
         FROM inventory i
         JOIN products p ON i.product_id = p.id
         WHERE i.current_stock <= i.minimum_stock AND p.is_active = 1
         ORDER BY (i.minimum_stock - i.current_stock) DESC
         LIMIT ?1",
    )
    .bind(limit)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut low_stock_items = Vec::new();
    for row in rows {
        let product = crate::models::Product {
            id: row.try_get("product_id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };

        let inventory_item = InventoryItem {
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
            product: Some(product),
        };

        low_stock_items.push(inventory_item);
    }

    Ok(low_stock_items)
}
