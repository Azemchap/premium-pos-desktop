use crate::models::{
    CreateSaleRequest, ProductWithInventory, ReturnItemRequest, Sale, SaleItem, SaleWithItems,
};
use sqlx::{Row, SqlitePool};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_sale_new(
    pool: State<'_, SqlitePool>,
    customer_name: Option<String>,
    customer_phone: Option<String>,
    customer_email: Option<String>,
    payment_method: String,
    notes: Option<String>,
    items: Vec<crate::models::CreateSaleItemRequest>,
) -> Result<Sale, String> {
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    let sale_number = format!("SALE-{}", Uuid::new_v4().to_string()[..8].to_uppercase());

    let subtotal: f64 = items
        .iter()
        .map(|item| item.price * item.quantity as f64)
        .sum();
    let tax_amount: f64 = items.iter().map(|item| item.tax_amount).sum();
    let total_amount = subtotal + tax_amount;

    let sale_id = sqlx::query(
        "INSERT INTO sales (sale_number, customer_name, customer_phone, customer_email, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, cashier_id, notes, is_voided, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&sale_number)
    .bind(&customer_name)
    .bind(&customer_phone)
    .bind(&customer_email)
    .bind(subtotal)
    .bind(tax_amount)
    .bind(0.0)
    .bind(total_amount)
    .bind(&payment_method)
    .bind("completed")
    .bind(1i64)
    .bind(&notes)
    .bind(false)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    for item_request in &items {
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, line_total, tax_amount, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(sale_id)
        .bind(item_request.product_id)
        .bind(item_request.quantity)
        .bind(item_request.price)
        .bind(0.0)
        .bind(item_request.price * item_request.quantity as f64 + item_request.tax_amount)
        .bind(item_request.tax_amount)
        .bind(0.0)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE inventory SET quantity_on_hand = quantity_on_hand - ?, available_stock = available_stock - ? WHERE product_id = ?"
        )
        .bind(item_request.quantity)
        .bind(item_request.quantity)
        .bind(item_request.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(item_request.product_id)
        .bind("out")
        .bind(-item_request.quantity)
        .bind("sale")
        .bind(sale_id)
        .bind(1i64)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    let sale = Sale {
        id: sale_id,
        sale_number,
        subtotal,
        tax_amount,
        discount_amount: 0.0,
        total_amount,
        payment_method,
        payment_status: "completed".to_string(),
        cashier_id: 1,
        customer_name,
        customer_phone,
        customer_email,
        notes,
        is_voided: false,
        voided_by: None,
        voided_at: None,
        void_reason: None,
        shift_id: None,
        created_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(sale)
}

#[tauri::command]
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
) -> Result<Sale, String> {
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    let sale_id = sqlx::query(
        "INSERT INTO sales (sale_number, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, cashier_id, customer_name, customer_phone, customer_email, notes, is_voided, shift_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.sale_number)
    .bind(request.subtotal)
    .bind(request.tax_amount)
    .bind(request.discount_amount)
    .bind(request.total_amount)
    .bind(&request.payment_method)
    .bind("completed")
    .bind(request.cashier_id)
    .bind(&request.customer_name)
    .bind(&request.customer_phone)
    .bind(&request.customer_email)
    .bind(&request.notes)
    .bind(false)
    .bind(request.shift_id)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    for item_request in &request.items {
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, line_total, tax_amount, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(sale_id)
        .bind(item_request.product_id)
        .bind(item_request.quantity)
        .bind(item_request.unit_price)
        .bind(item_request.discount_amount)
        .bind(item_request.line_total)
        .bind(item_request.tax_amount)
        .bind(item_request.cost_price)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE inventory SET quantity_on_hand = quantity_on_hand - ?, available_stock = available_stock - ? WHERE product_id = ?"
        )
        .bind(item_request.quantity)
        .bind(item_request.quantity)
        .bind(item_request.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    let sale = Sale {
        id: sale_id,
        sale_number: request.sale_number,
        subtotal: request.subtotal,
        tax_amount: request.tax_amount,
        discount_amount: request.discount_amount,
        total_amount: request.total_amount,
        payment_method: request.payment_method,
        payment_status: "completed".to_string(),
        cashier_id: request.cashier_id,
        customer_name: request.customer_name,
        customer_phone: request.customer_phone,
        customer_email: request.customer_email,
        notes: request.notes,
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

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    if let Some(off) = offset {
        query.push_str(&format!(" OFFSET {}", off));
    }

    let rows = sqlx::query(&query)
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
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

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

    for return_item in return_items {
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

        sqlx::query(
            "UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, available_stock = available_stock + ? WHERE product_id = ?"
        )
        .bind(return_item.quantity)
        .bind(return_item.quantity)
        .bind(return_item.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_products_for_sale(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<ProductWithInventory>, String> {
    let rows = sqlx::query(
        "SELECT p.*, COALESCE(i.quantity_on_hand, 0) as current_stock, COALESCE(i.minimum_stock, 0) as minimum_stock 
         FROM products p 
         LEFT JOIN inventory i ON p.id = i.product_id 
         WHERE p.is_active = 1 
         ORDER BY p.name"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = ProductWithInventory {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            current_stock: row.try_get("current_stock").unwrap_or(0),
            minimum_stock: row.try_get("minimum_stock").unwrap_or(0),
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            category: row.try_get("category").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        products.push(product);
    }

    Ok(products)
}

#[tauri::command]
pub async fn get_sales_history(
    pool: State<'_, SqlitePool>,
    limit: Option<i64>,
    offset: Option<i64>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<Sale>, String> {
    let mut query = String::from("SELECT * FROM sales WHERE 1=1");
    let mut params: Vec<String> = Vec::new();

    if let Some(search_term) = search {
        query
            .push_str(" AND (sale_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)");
        let search_pattern = format!("%{}%", search_term);
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }

    if let Some(from) = date_from {
        query.push_str(" AND DATE(created_at) >= DATE(?)");
        params.push(from);
    }

    if let Some(to) = date_to {
        query.push_str(" AND DATE(created_at) <= DATE(?)");
        params.push(to);
    }

    query.push_str(" ORDER BY created_at DESC");

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

#[tauri::command]
pub async fn get_sale_details(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
) -> Result<Option<SaleWithItems>, String> {
    let sale_row = sqlx::query("SELECT * FROM sales WHERE id = ?")
        .bind(sale_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = sale_row {
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

        let item_rows = sqlx::query(
            "SELECT si.*, p.name as product_name 
             FROM sale_items si 
             LEFT JOIN products p ON si.product_id = p.id 
             WHERE si.sale_id = ? 
             ORDER BY si.id",
        )
        .bind(sale_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for item_row in item_rows {
            let item = SaleItem {
                id: item_row.try_get("id").map_err(|e| e.to_string())?,
                sale_id: item_row.try_get("sale_id").map_err(|e| e.to_string())?,
                product_id: item_row.try_get("product_id").map_err(|e| e.to_string())?,
                quantity: item_row.try_get("quantity").map_err(|e| e.to_string())?,
                unit_price: item_row.try_get("unit_price").map_err(|e| e.to_string())?,
                discount_amount: item_row
                    .try_get("discount_amount")
                    .map_err(|e| e.to_string())?,
                line_total: item_row.try_get("line_total").map_err(|e| e.to_string())?,
                tax_amount: item_row.try_get("tax_amount").map_err(|e| e.to_string())?,
                cost_price: item_row.try_get("cost_price").map_err(|e| e.to_string())?,
                created_at: item_row.try_get("created_at").map_err(|e| e.to_string())?,
                product: None,
            };
            items.push(item);
        }

        Ok(Some(SaleWithItems { sale, items }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn void_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
    reason: String,
) -> Result<bool, String> {
    let mut tx = pool.inner().begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE sales SET is_voided = 1, voided_by = ?, voided_at = ?, void_reason = ? WHERE id = ?"
    )
    .bind(1i64)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(&reason)
    .bind(sale_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let sale_items = sqlx::query("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?")
        .bind(sale_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for item in sale_items {
        let product_id: i64 = item.try_get("product_id").map_err(|e| e.to_string())?;
        let quantity: i32 = item.try_get("quantity").map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, available_stock = available_stock + ? WHERE product_id = ?"
        )
        .bind(quantity)
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(product_id)
        .bind("in")
        .bind(quantity)
        .bind("void")
        .bind(sale_id)
        .bind(&reason)
        .bind(1i64)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(true)
}
