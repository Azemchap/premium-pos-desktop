use tauri::{command, State};
use crate::models::{Sale, CreateSaleRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
) -> Result<Sale, String> {
    let mut transaction = pool.begin().await.map_err(|e| e.to_string())?;

    // Create sale record
    let sale_id = sqlx::query(
        "INSERT INTO sales (cashier_id, subtotal, tax_amount, discount_amount, total_amount, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.cashier_id)
    .bind(request.subtotal)
    .bind(request.tax_amount)
    .bind(request.discount_amount)
    .bind(request.total_amount)
    .bind(&request.payment_method)
    .bind(&request.notes)
    .bind(chrono::Utc::now().naive_utc())
    .execute(&mut *transaction)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    // Create sale items
    for item_request in &request.items {
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, line_total) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(sale_id)
        .bind(item_request.product_id)
        .bind(item_request.quantity)
        .bind(item_request.unit_price)
        .bind(item_request.discount_amount)
        .bind(item_request.line_total)
        .execute(&mut *transaction)
        .await
        .map_err(|e| e.to_string())?;

        // Update inventory
        sqlx::query(
            "UPDATE inventory SET current_stock = current_stock - ?, updated_at = ? WHERE product_id = ?"
        )
        .bind(item_request.quantity)
        .bind(chrono::Utc::now().naive_utc())
        .bind(item_request.product_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Commit transaction
    transaction.commit().await.map_err(|e| e.to_string())?;

    // Return created sale
    get_sale_by_id(pool, sale_id).await
}

#[tauri::command]
pub async fn get_sales(
    pool: State<'_, SqlitePool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Sale>, String> {
    let mut query = String::from("SELECT * FROM sales ORDER BY created_at DESC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
        if let Some(off) = offset {
            query.push_str(&format!(" OFFSET {}", off));
        }
    }

    let rows = sqlx::query(&query)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut sales = Vec::new();
    for row in rows {
        let sale = Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        sales.push(sale);
    }

    Ok(sales)
}

#[tauri::command]
pub async fn get_sale_by_id(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
) -> Result<Sale, String> {
    let sale_row = sqlx::query("SELECT * FROM sales WHERE id = ?")
        .bind(sale_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let sale = Sale {
        id: sale_row.try_get("id").map_err(|e| e.to_string())?,
        cashier_id: sale_row.try_get("cashier_id").map_err(|e| e.to_string())?,
        subtotal: sale_row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: sale_row.try_get("tax_amount").map_err(|e| e.to_string())?,
        discount_amount: sale_row.try_get("discount_amount").map_err(|e| e.to_string())?,
        total_amount: sale_row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_method: sale_row.try_get("payment_method").map_err(|e| e.to_string())?,
        notes: sale_row.try_get("notes").ok().flatten(),
        is_voided: sale_row.try_get("is_voided").map_err(|e| e.to_string())?,
        voided_by: sale_row.try_get("voided_by").ok().flatten(),
        created_at: sale_row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    Ok(sale)
}

#[tauri::command]
pub async fn process_return(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
    return_items: Vec<crate::models::ReturnItemRequest>,
) -> Result<bool, String> {
    let mut transaction = pool.begin().await.map_err(|e| e.to_string())?;

    for return_item in return_items {
        // Create return record
        sqlx::query(
            "INSERT INTO returns (sale_id, product_id, quantity, reason, refund_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(sale_id)
        .bind(return_item.product_id)
        .bind(return_item.quantity)
        .bind(&return_item.reason)
        .bind(return_item.refund_amount)
        .bind(chrono::Utc::now().naive_utc())
        .execute(&mut *transaction)
        .await
        .map_err(|e| e.to_string())?;

        // Update inventory (restock)
        sqlx::query(
            "UPDATE inventory SET current_stock = current_stock + ?, updated_at = ? WHERE product_id = ?"
        )
        .bind(return_item.quantity)
        .bind(chrono::Utc::now().naive_utc())
        .bind(return_item.product_id)
        .execute(&mut *transaction)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Commit transaction
    transaction.commit().await.map_err(|e| e.to_string())?;

    Ok(true)
}