use tauri::{command, State};
use crate::models::{Sale, SaleItem, CreateSaleRequest, SaleItemRequest, ReturnItemRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
) -> Result<Sale, String> {
    // Start a transaction
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    // Create sale record
    let sale_id = sqlx::query(
        "INSERT INTO sales (sale_number, total_amount, tax_amount, payment_method, cashier_id, customer_name, customer_phone, customer_email, payment_status, is_voided, shift_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.sale_number)
    .bind(request.total_amount)
    .bind(request.tax_amount)
    .bind(&request.payment_method)
    .bind(request.cashier_id)
    .bind(&request.customer_name)
    .bind(&request.customer_phone)
    .bind(&request.customer_email)
    .bind("completed")
    .bind(false)
    .bind(request.shift_id)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    // Create sale items
    for item_request in &request.items {
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, product_name, sku, quantity, unit_price, total_price, tax_amount, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(sale_id)
        .bind(item_request.product_id)
        .bind(&item_request.product_name)
        .bind(&item_request.sku)
        .bind(item_request.quantity)
        .bind(item_request.unit_price)
        .bind(item_request.total_price)
        .bind(item_request.tax_amount)
        .bind(item_request.cost_price)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Update inventory
        sqlx::query(
            "UPDATE inventory SET current_stock = current_stock - ?, available_stock = available_stock - ? WHERE product_id = ?"
        )
        .bind(item_request.quantity)
        .bind(item_request.quantity)
        .bind(item_request.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    // Return created sale
    let sale = Sale {
        id: sale_id,
        sale_number: request.sale_number,
        subtotal: request.subtotal,
        tax_amount: request.tax_amount,
        discount_amount: request.discount_amount,
        total_amount: request.total_amount,
        payment_method: request.payment_method,
        cashier_id: request.cashier_id,
        customer_name: request.customer_name,
        customer_phone: request.customer_phone,
        customer_email: request.customer_email,
        notes: request.notes,
        payment_status: "completed".to_string(),
        is_voided: false,
        voided_by: None,
        voided_at: None,
        void_reason: None,
        shift_id: request.shift_id,
        created_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(sale)
}

#[tauri::command]
pub async fn get_sales(
    pool: State<'_, SqlitePool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Sale>, String> {
    let mut query = String::from("SELECT * FROM sales ORDER BY created_at DESC");
    let mut params: Vec<String> = Vec::new();

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    if let Some(off) = offset {
        query.push_str(&format!(" OFFSET {}", off));
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut sales = Vec::new();
    for row in rows {
        let sale = Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").map_err(|e| e.to_string())?,
            customer_phone: row.try_get("customer_phone").map_err(|e| e.to_string())?,
            customer_email: row.try_get("customer_email").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").map_err(|e| e.to_string())?,
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
) -> Result<Option<Sale>, String> {
    let row = sqlx::query("SELECT * FROM sales WHERE id = ?")
        .bind(sale_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let sale = Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").map_err(|e| e.to_string())?,
            customer_phone: row.try_get("customer_phone").map_err(|e| e.to_string())?,
            customer_email: row.try_get("customer_email").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        Ok(Some(sale))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn process_return(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
    return_items: Vec<ReturnItemRequest>,
    reason: String,
) -> Result<bool, String> {
    // Start a transaction
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    // Create return record
    let return_id = sqlx::query(
        "INSERT INTO returns (original_sale_id, return_reason, total_refund_amount, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(sale_id)
    .bind(&reason)
    .bind(return_items.iter().map(|item| item.refund_amount).sum::<f64>())
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    // Process each return item
    for return_item in return_items {
        // Create return item record
        sqlx::query(
            "INSERT INTO return_items (return_id, product_id, quantity, refund_amount, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(return_id)
        .bind(return_item.product_id)
        .bind(return_item.quantity)
        .bind(return_item.refund_amount)
        .bind(&return_item.reason)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Update inventory (add back the returned items)
        sqlx::query(
            "UPDATE inventory SET current_stock = current_stock + ?, available_stock = available_stock + ? WHERE product_id = ?"
        )
        .bind(return_item.quantity)
        .bind(return_item.quantity)
        .bind(return_item.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(true)
}