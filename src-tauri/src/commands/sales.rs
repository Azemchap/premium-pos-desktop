use crate::models::{CreateSaleRequest, Sale, SaleItem};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};
use uuid::Uuid;

#[command]
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
    cashier_id: i64,
    shift_id: Option<i64>,
) -> Result<Sale, String> {
    let pool_ref = pool.inner();

    // Generate unique sale number
    let sale_number = format!(
        "SALE-{}",
        Uuid::new_v4().to_string().split('-').next().unwrap()
    );

    // Start transaction
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Create sale record
    let sale_result = sqlx::query(
        "INSERT INTO sales (sale_number, subtotal, tax_amount, discount_amount, total_amount,
                           payment_method, payment_status, cashier_id, customer_name, customer_phone,
                           customer_email, notes, shift_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
    )
    .bind(&sale_number)
    .bind(request.subtotal)
    .bind(request.tax_amount)
    .bind(request.discount_amount)
    .bind(request.total_amount)
    .bind(&request.payment_method)
    .bind("completed")
    .bind(cashier_id)
    .bind(&request.customer_name)
    .bind(&request.customer_phone)
    .bind(&request.customer_email)
    .bind(&request.notes)
    .bind(shift_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create sale: {}", e))?;

    let sale_id = sale_result.last_insert_rowid();

    // Create sale items and update inventory
    for item in &request.items {
        // Get product cost price for profit calculation
        let product =
            sqlx::query("SELECT cost_price, is_taxable, tax_rate FROM products WHERE id = ?1")
                .bind(item.product_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| format!("Failed to get product: {}", e))?;

        let cost_price: f64 = product.try_get("cost_price").map_err(|e| e.to_string())?;
        let is_taxable: bool = product.try_get("is_taxable").map_err(|e| e.to_string())?;
        let product_tax_rate: f64 = product.try_get("tax_rate").map_err(|e| e.to_string())?;

        // Calculate item tax if product is taxable
        let item_tax = if is_taxable {
            item.line_total * product_tax_rate
        } else {
            0.0
        };

        // Create sale item
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount,
                                    line_total, tax_amount, cost_price)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )
        .bind(sale_id)
        .bind(item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.discount_amount)
        .bind(item.line_total)
        .bind(item_tax)
        .bind(cost_price)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create sale item: {}", e))?;

        // Update inventory (decrease stock)
        let inventory_update = sqlx::query(
            "UPDATE inventory SET 
                current_stock = current_stock - ?1,
                available_stock = available_stock - ?1,
                last_updated = CURRENT_TIMESTAMP
             WHERE product_id = ?2",
        )
        .bind(item.quantity)
        .bind(item.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update inventory: {}", e))?;

        if inventory_update.rows_affected() == 0 {
            return Err(format!(
                "Product {} not found in inventory",
                item.product_id
            ));
        }

        // Get previous stock for movement record
        let prev_stock = sqlx::query(
            "SELECT current_stock + ?1 as previous_stock FROM inventory WHERE product_id = ?2",
        )
        .bind(item.quantity)
        .bind(item.product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to get previous stock: {}", e))?;

        let previous_stock: i32 = prev_stock
            .try_get("previous_stock")
            .map_err(|e| e.to_string())?;

        // Get current stock for movement record
        let current_stock =
            sqlx::query("SELECT current_stock FROM inventory WHERE product_id = ?1")
                .bind(item.product_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| format!("Failed to get current stock: {}", e))?;

        let new_stock: i32 = current_stock
            .try_get("current_stock")
            .map_err(|e| e.to_string())?;

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, movement_type, quantity_change, previous_stock,
                                             new_stock, reference_id, reference_type, notes, user_id)
             VALUES (?1, 'sale', ?2, ?3, ?4, ?5, 'sale', 'Sale transaction', ?6)"
        )
        .bind(item.product_id)
        .bind(-item.quantity)
        .bind(previous_stock)
        .bind(new_stock)
        .bind(sale_id)
        .bind(cashier_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to record inventory movement: {}", e))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // Get the created sale
    let row = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales WHERE id = ?1",
    )
    .bind(sale_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created sale: {}", e))?;

    let sale = Sale {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
        subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
        discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
        payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
        cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
        customer_name: row.try_get("customer_name").ok().flatten(),
        customer_phone: row.try_get("customer_phone").ok().flatten(),
        customer_email: row.try_get("customer_email").ok().flatten(),
        notes: row.try_get("notes").ok().flatten(),
        is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
        voided_by: row.try_get("voided_by").ok().flatten(),
        voided_at: row.try_get("voided_at").ok().flatten(),
        void_reason: row.try_get("void_reason").ok().flatten(),
        shift_id: row.try_get("shift_id").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    Ok(sale)
}

#[command]
pub async fn get_sales(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Sale>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut query = String::from(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales
         WHERE 1=1",
    );

    let mut params: Vec<String> = Vec::new();
    let mut param_count = 0;

    if let Some(start) = start_date {
        if !start.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(created_at) >= ?{}", param_count));
            params.push(start);
        }
    }

    if let Some(end) = end_date {
        if !end.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(created_at) <= ?{}", param_count));
            params.push(end);
        }
    }

    query.push_str(" ORDER BY created_at DESC");
    query.push_str(&format!(" LIMIT ?{}", param_count + 1));
    query.push_str(&format!(" OFFSET ?{}", param_count + 2));
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

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
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            customer_phone: row.try_get("customer_phone").ok().flatten(),
            customer_email: row.try_get("customer_email").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        sales.push(sale);
    }

    Ok(sales)
}

#[command]
pub async fn get_sale_details(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
) -> Result<(Sale, Vec<SaleItem>), String> {
    let pool_ref = pool.inner();

    // Get sale
    let sale_row = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales WHERE id = ?1",
    )
    .bind(sale_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Sale not found: {}", e))?;

    let sale = Sale {
        id: sale_row.try_get("id").map_err(|e| e.to_string())?,
        sale_number: sale_row.try_get("sale_number").map_err(|e| e.to_string())?,
        subtotal: sale_row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: sale_row.try_get("tax_amount").map_err(|e| e.to_string())?,
        discount_amount: sale_row
            .try_get("discount_amount")
            .map_err(|e| e.to_string())?,
        total_amount: sale_row
            .try_get("total_amount")
            .map_err(|e| e.to_string())?,
        payment_method: sale_row
            .try_get("payment_method")
            .map_err(|e| e.to_string())?,
        payment_status: sale_row
            .try_get("payment_status")
            .map_err(|e| e.to_string())?,
        cashier_id: sale_row.try_get("cashier_id").map_err(|e| e.to_string())?,
        customer_name: sale_row.try_get("customer_name").ok().flatten(),
        customer_phone: sale_row.try_get("customer_phone").ok().flatten(),
        customer_email: sale_row.try_get("customer_email").ok().flatten(),
        notes: sale_row.try_get("notes").ok().flatten(),
        is_voided: sale_row.try_get("is_voided").map_err(|e| e.to_string())?,
        voided_by: sale_row.try_get("voided_by").ok().flatten(),
        voided_at: sale_row.try_get("voided_at").ok().flatten(),
        void_reason: sale_row.try_get("void_reason").ok().flatten(),
        shift_id: sale_row.try_get("shift_id").ok().flatten(),
        created_at: sale_row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    // Get sale items
    let items_rows = sqlx::query(
        "SELECT id, sale_id, product_id, quantity, unit_price, discount_amount,
                line_total, tax_amount, cost_price, created_at
         FROM sale_items WHERE sale_id = ?1",
    )
    .bind(sale_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to get sale items: {}", e))?;

    let mut items = Vec::new();
    for row in items_rows {
        let item = SaleItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_id: row.try_get("sale_id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
            unit_price: row.try_get("unit_price").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            line_total: row.try_get("line_total").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            product: None, // Could be populated if needed
        };
        items.push(item);
    }

    Ok((sale, items))
}

#[command]
pub async fn void_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
    reason: String,
    user_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    // Check if sale exists and is not already voided
    let sale_check = sqlx::query("SELECT is_voided FROM sales WHERE id = ?1")
        .bind(sale_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let sale_check = match sale_check {
        Some(s) => s,
        None => return Err("Sale not found".to_string()),
    };

    let is_voided: bool = sale_check.try_get("is_voided").map_err(|e| e.to_string())?;
    if is_voided {
        return Err("Sale is already voided".to_string());
    }

    // Start transaction
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Mark sale as voided
    sqlx::query(
        "UPDATE sales SET 
            is_voided = 1,
            voided_by = ?1,
            voided_at = CURRENT_TIMESTAMP,
            void_reason = ?2
         WHERE id = ?3",
    )
    .bind(user_id)
    .bind(&reason)
    .bind(sale_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to void sale: {}", e))?;

    // Get sale items to restore inventory
    let items = sqlx::query("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1")
        .bind(sale_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Failed to get sale items: {}", e))?;

    // Restore inventory for each item
    for item in items {
        let product_id: i64 = item.try_get("product_id").map_err(|e| e.to_string())?;
        let quantity: i32 = item.try_get("quantity").map_err(|e| e.to_string())?;

        // Get previous stock for movement record
        let prev_stock = sqlx::query("SELECT current_stock FROM inventory WHERE product_id = ?1")
            .bind(product_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to get previous stock: {}", e))?;

        let previous_stock: i32 = prev_stock
            .try_get("current_stock")
            .map_err(|e| e.to_string())?;

        // Update inventory (increase stock)
        sqlx::query(
            "UPDATE inventory SET 
                current_stock = current_stock + ?1,
                available_stock = available_stock + ?1,
                last_updated = CURRENT_TIMESTAMP
             WHERE product_id = ?2",
        )
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to restore inventory: {}", e))?;

        let new_stock = previous_stock + quantity;

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, movement_type, quantity_change, previous_stock,
                                             new_stock, reference_id, reference_type, notes, user_id)
             VALUES (?1, 'void', ?2, ?3, ?4, ?5, 'void', 'Sale voided', ?6)"
        )
        .bind(product_id)
        .bind(quantity)
        .bind(previous_stock)
        .bind(new_stock)
        .bind(sale_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to record inventory movement: {}", e))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(true)
}

#[command]
pub async fn search_sales(
    pool: State<'_, SqlitePool>,
    query: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Sale>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let rows = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales
         WHERE sale_number LIKE ?1 OR customer_name LIKE ?1 OR customer_phone LIKE ?1
         ORDER BY created_at DESC
         LIMIT ?2 OFFSET ?3",
    )
    .bind(format!("%{}%", query))
    .bind(limit)
    .bind(offset)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

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
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            customer_phone: row.try_get("customer_phone").ok().flatten(),
            customer_email: row.try_get("customer_email").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        sales.push(sale);
    }

    Ok(sales)
}
