use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnItem {
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReturnRequest {
    pub original_sale_id: Option<i64>,
    pub items: Vec<ReturnItem>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub refund_method: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnWithDetails {
    pub id: i64,
    pub return_number: String,
    pub original_sale_id: Option<i64>,
    pub original_sale_number: Option<String>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub refund_method: String,
    pub processed_by: i64,
    pub processed_by_name: Option<String>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub shift_id: Option<i64>,
    pub created_at: String,
    pub items_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnItemDetail {
    pub id: i64,
    pub return_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
    pub created_at: String,
}

#[command]
pub async fn create_return(
    pool: State<'_, SqlitePool>,
    request: CreateReturnRequest,
    user_id: i64,
    shift_id: Option<i64>,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    // Generate unique return number
    let uuid_str = Uuid::new_v4().to_string();
    let return_number = format!(
        "RET-{}",
        uuid_str.split('-').next().unwrap_or(&uuid_str[..8])
    );

    // Start transaction
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Create return record
    let return_result = sqlx::query(
        "INSERT INTO returns (return_number, original_sale_id, subtotal, tax_amount, total_amount,
                             refund_method, processed_by, reason, notes, shift_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    )
    .bind(&return_number)
    .bind(request.original_sale_id)
    .bind(request.subtotal)
    .bind(request.tax_amount)
    .bind(request.total_amount)
    .bind(&request.refund_method)
    .bind(user_id)
    .bind(&request.reason)
    .bind(&request.notes)
    .bind(shift_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create return: {}", e))?;

    let return_id = return_result.last_insert_rowid();

    // Create return items and update inventory
    for item in &request.items {
        // Insert return item
        sqlx::query(
            "INSERT INTO return_items (return_id, product_id, quantity, unit_price, line_total)
             VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(return_id)
        .bind(item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.line_total)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create return item: {}", e))?;

        // Get current inventory
        let inventory_row = sqlx::query(
            "SELECT id, current_stock, reserved_stock FROM inventory WHERE product_id = ?1"
        )
        .bind(item.product_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| format!("Failed to fetch inventory: {}", e))?;

        if let Some(row) = inventory_row {
            let current_stock: i32 = row.try_get("current_stock").unwrap_or(0);
            let reserved_stock: i32 = row.try_get("reserved_stock").unwrap_or(0);
            let new_stock = current_stock + item.quantity;
            let available_stock = new_stock - reserved_stock;

            // Update inventory
            sqlx::query(
                "UPDATE inventory
                 SET current_stock = ?1, available_stock = ?2, last_updated = CURRENT_TIMESTAMP
                 WHERE product_id = ?3"
            )
            .bind(new_stock)
            .bind(available_stock)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to update inventory: {}", e))?;

            // Log inventory movement
            sqlx::query(
                "INSERT INTO inventory_movements (product_id, movement_type, quantity_change,
                                                  previous_stock, new_stock, reference_id, reference_type, user_id)
                 VALUES (?1, 'return', ?2, ?3, ?4, ?5, 'return', ?6)"
            )
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(current_stock)
            .bind(new_stock)
            .bind(return_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to log inventory movement: {}", e))?;
        } else {
            // Create inventory entry if it doesn't exist
            let available_stock = item.quantity;
            sqlx::query(
                "INSERT INTO inventory (product_id, current_stock, available_stock, minimum_stock, maximum_stock)
                 VALUES (?1, ?2, ?3, 0, 0)"
            )
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(available_stock)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to create inventory: {}", e))?;

            // Log inventory movement
            sqlx::query(
                "INSERT INTO inventory_movements (product_id, movement_type, quantity_change,
                                                  previous_stock, new_stock, reference_id, reference_type, user_id)
                 VALUES (?1, 'return', ?2, 0, ?3, ?4, 'return', ?5)"
            )
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(item.quantity)
            .bind(return_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to log inventory movement: {}", e))?;
        }

        // Create notification for return
        sqlx::query(
            "INSERT INTO notifications (notification_type, title, message, severity, reference_id, reference_type)
             VALUES ('return', 'Return Processed', 'Return ' || ?1 || ' has been processed', 'info', ?2, 'return')"
        )
        .bind(&return_number)
        .bind(return_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create notification: {}", e))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(return_id)
}

#[command]
pub async fn get_returns(
    pool: State<'_, SqlitePool>,
    page: i64,
    page_size: i64,
    search: Option<String>,
) -> Result<Vec<ReturnWithDetails>, String> {
    let pool_ref = pool.inner();
    let offset = (page - 1) * page_size;

    let search_pattern = search
        .as_ref()
        .map(|s| format!("%{}%", s))
        .unwrap_or_else(|| "%".to_string());

    let rows = sqlx::query(
        "SELECT
            r.id,
            r.return_number,
            r.original_sale_id,
            s.sale_number as original_sale_number,
            r.subtotal,
            r.tax_amount,
            r.total_amount,
            r.refund_method,
            r.processed_by,
            (u.first_name || ' ' || u.last_name) as processed_by_name,
            r.reason,
            r.notes,
            r.shift_id,
            r.created_at,
            (SELECT COUNT(*) FROM return_items WHERE return_id = r.id) as items_count
         FROM returns r
         LEFT JOIN sales s ON r.original_sale_id = s.id
         LEFT JOIN users u ON r.processed_by = u.id
         WHERE r.return_number LIKE ?1 OR r.reason LIKE ?1 OR s.sale_number LIKE ?1
         ORDER BY r.created_at DESC
         LIMIT ?2 OFFSET ?3"
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch returns: {}", e))?;

    let returns = rows
        .iter()
        .map(|row| ReturnWithDetails {
            id: row.try_get("id").unwrap_or(0),
            return_number: row.try_get("return_number").unwrap_or_default(),
            original_sale_id: row.try_get("original_sale_id").ok(),
            original_sale_number: row.try_get("original_sale_number").ok(),
            subtotal: row.try_get("subtotal").unwrap_or(0.0),
            tax_amount: row.try_get("tax_amount").unwrap_or(0.0),
            total_amount: row.try_get("total_amount").unwrap_or(0.0),
            refund_method: row.try_get("refund_method").unwrap_or_default(),
            processed_by: row.try_get("processed_by").unwrap_or(0),
            processed_by_name: row.try_get("processed_by_name").ok(),
            reason: row.try_get("reason").ok(),
            notes: row.try_get("notes").ok(),
            shift_id: row.try_get("shift_id").ok(),
            created_at: row.try_get("created_at").unwrap_or_default(),
            items_count: row.try_get("items_count").unwrap_or(0),
        })
        .collect();

    Ok(returns)
}

#[command]
pub async fn get_return_by_id(
    pool: State<'_, SqlitePool>,
    return_id: i64,
) -> Result<ReturnWithDetails, String> {
    let pool_ref = pool.inner();

    let row = sqlx::query(
        "SELECT
            r.id,
            r.return_number,
            r.original_sale_id,
            s.sale_number as original_sale_number,
            r.subtotal,
            r.tax_amount,
            r.total_amount,
            r.refund_method,
            r.processed_by,
            (u.first_name || ' ' || u.last_name) as processed_by_name,
            r.reason,
            r.notes,
            r.shift_id,
            r.created_at,
            (SELECT COUNT(*) FROM return_items WHERE return_id = r.id) as items_count
         FROM returns r
         LEFT JOIN sales s ON r.original_sale_id = s.id
         LEFT JOIN users u ON r.processed_by = u.id
         WHERE r.id = ?1"
    )
    .bind(return_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch return: {}", e))?;

    let return_record = ReturnWithDetails {
        id: row.try_get("id").unwrap_or(0),
        return_number: row.try_get("return_number").unwrap_or_default(),
        original_sale_id: row.try_get("original_sale_id").ok(),
        original_sale_number: row.try_get("original_sale_number").ok(),
        subtotal: row.try_get("subtotal").unwrap_or(0.0),
        tax_amount: row.try_get("tax_amount").unwrap_or(0.0),
        total_amount: row.try_get("total_amount").unwrap_or(0.0),
        refund_method: row.try_get("refund_method").unwrap_or_default(),
        processed_by: row.try_get("processed_by").unwrap_or(0),
        processed_by_name: row.try_get("processed_by_name").ok(),
        reason: row.try_get("reason").ok(),
        notes: row.try_get("notes").ok(),
        shift_id: row.try_get("shift_id").ok(),
        created_at: row.try_get("created_at").unwrap_or_default(),
        items_count: row.try_get("items_count").unwrap_or(0),
    };

    Ok(return_record)
}

#[command]
pub async fn get_return_items(
    pool: State<'_, SqlitePool>,
    return_id: i64,
) -> Result<Vec<ReturnItemDetail>, String> {
    let pool_ref = pool.inner();

    let rows = sqlx::query(
        "SELECT
            ri.id,
            ri.return_id,
            ri.product_id,
            p.name as product_name,
            p.sku as product_sku,
            ri.quantity,
            ri.unit_price,
            ri.line_total,
            ri.created_at
         FROM return_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.return_id = ?1
         ORDER BY ri.id"
    )
    .bind(return_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch return items: {}", e))?;

    let items = rows
        .iter()
        .map(|row| ReturnItemDetail {
            id: row.try_get("id").unwrap_or(0),
            return_id: row.try_get("return_id").unwrap_or(0),
            product_id: row.try_get("product_id").unwrap_or(0),
            product_name: row.try_get("product_name").unwrap_or_default(),
            product_sku: row.try_get("product_sku").unwrap_or_default(),
            quantity: row.try_get("quantity").unwrap_or(0),
            unit_price: row.try_get("unit_price").unwrap_or(0.0),
            line_total: row.try_get("line_total").unwrap_or(0.0),
            created_at: row.try_get("created_at").unwrap_or_default(),
        })
        .collect();

    Ok(items)
}

#[command]
pub async fn get_sale_for_return(
    pool: State<'_, SqlitePool>,
    sale_number: String,
) -> Result<serde_json::Value, String> {
    let pool_ref = pool.inner();

    // Get sale details
    let sale_row = sqlx::query(
        "SELECT
            s.id,
            s.sale_number,
            s.subtotal,
            s.tax_amount,
            s.discount_amount,
            s.total_amount,
            s.payment_method,
            s.customer_name,
            s.customer_phone,
            s.created_at
         FROM sales s
         WHERE s.sale_number = ?1 AND s.is_voided = 0"
    )
    .bind(&sale_number)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch sale: {}", e))?;

    if let Some(row) = sale_row {
        let sale_id: i64 = row.try_get("id").unwrap_or(0);

        // Get sale items
        let items = sqlx::query(
            "SELECT
                si.id,
                si.product_id,
                p.name as product_name,
                p.sku as product_sku,
                si.quantity,
                si.unit_price,
                si.line_total
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?1"
        )
        .bind(sale_id)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Failed to fetch sale items: {}", e))?;

        let items_json: Vec<serde_json::Value> = items
            .iter()
            .map(|item| {
                serde_json::json!({
                    "id": item.try_get::<i64, _>("id").unwrap_or(0),
                    "product_id": item.try_get::<i64, _>("product_id").unwrap_or(0),
                    "product_name": item.try_get::<String, _>("product_name").unwrap_or_default(),
                    "product_sku": item.try_get::<String, _>("product_sku").unwrap_or_default(),
                    "quantity": item.try_get::<i32, _>("quantity").unwrap_or(0),
                    "unit_price": item.try_get::<f64, _>("unit_price").unwrap_or(0.0),
                    "line_total": item.try_get::<f64, _>("line_total").unwrap_or(0.0),
                })
            })
            .collect();

        let result = serde_json::json!({
            "id": sale_id,
            "sale_number": row.try_get::<String, _>("sale_number").unwrap_or_default(),
            "subtotal": row.try_get::<f64, _>("subtotal").unwrap_or(0.0),
            "tax_amount": row.try_get::<f64, _>("tax_amount").unwrap_or(0.0),
            "discount_amount": row.try_get::<f64, _>("discount_amount").unwrap_or(0.0),
            "total_amount": row.try_get::<f64, _>("total_amount").unwrap_or(0.0),
            "payment_method": row.try_get::<String, _>("payment_method").unwrap_or_default(),
            "customer_name": row.try_get::<Option<String>, _>("customer_name").unwrap_or(None),
            "customer_phone": row.try_get::<Option<String>, _>("customer_phone").unwrap_or(None),
            "created_at": row.try_get::<String, _>("created_at").unwrap_or_default(),
            "items": items_json,
        });

        Ok(result)
    } else {
        Err("Sale not found or has been voided".to_string())
    }
}

#[command]
pub async fn get_returns_count(
    pool: State<'_, SqlitePool>,
    search: Option<String>,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    let search_pattern = search
        .as_ref()
        .map(|s| format!("%{}%", s))
        .unwrap_or_else(|| "%".to_string());

    let row = sqlx::query(
        "SELECT COUNT(*) as count
         FROM returns r
         LEFT JOIN sales s ON r.original_sale_id = s.id
         WHERE r.return_number LIKE ?1 OR r.reason LIKE ?1 OR s.sale_number LIKE ?1"
    )
    .bind(&search_pattern)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to count returns: {}", e))?;

    let count: i64 = row.try_get("count").unwrap_or(0);
    Ok(count)
}
