use crate::models::{DashboardStats, InventoryItem, Product, Sale};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentActivity {
    pub sales: Vec<Sale>,
    pub low_stock_items: Vec<InventoryItem>,
    pub recent_products: Vec<Product>,
}

#[command]
pub async fn get_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, String> {
    let pool_ref = pool.inner();

    // Fetch today's sales
    let today_sales_row = sqlx::query(
        "SELECT COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as total_sales,
                CAST(COUNT(*) AS INTEGER) as transaction_count
         FROM sales 
         WHERE DATE(created_at) = DATE('now') AND is_voided = 0",
    )
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to get today's sales: {}", e))?;

    let today_sales_amount: f64 = today_sales_row.try_get("total_sales").map_err(|e| {
        log_error("total_sales", "f64", &e);
        format!("Type mismatch for total_sales: {}", e)
    })?;

    let today_transactions: i32 = today_sales_row.try_get("transaction_count").map_err(|e| {
        log_error("transaction_count", "i32", &e);
        format!("Type mismatch for transaction_count: {}", e)
    })?;

    // Fetch week sales
    let week_sales_row = sqlx::query(
        "SELECT COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as week_total
         FROM sales 
         WHERE DATE(created_at) >= DATE('now', '-6 days') AND is_voided = 0",
    )
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to get week sales: {}", e))?;

    let week_sales_amount: f64 = week_sales_row.try_get("week_total").map_err(|e| {
        log_error("week_total", "f64", &e);
        format!("Type mismatch for week_sales: {}", e)
    })?;

    // Fetch month sales
    let month_sales_row = sqlx::query(
        "SELECT COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as month_total
         FROM sales 
         WHERE DATE(created_at) >= DATE('now', 'start of month') AND is_voided = 0",
    )
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to get month sales: {}", e))?;

    let month_sales_amount: f64 = month_sales_row.try_get("month_total").map_err(|e| {
        log_error("month_total", "f64", &e);
        format!("Type mismatch for month_sales: {}", e)
    })?;

    // Fetch total products
    let total_products_row = sqlx::query(
        "SELECT CAST(COUNT(*) AS INTEGER) as product_count 
         FROM products 
         WHERE is_active = 1",
    )
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to get product count: {}", e))?;

    let total_products_count: i32 = total_products_row.try_get("product_count").map_err(|e| {
        log_error("product_count", "i32", &e);
        format!("Type mismatch for total_products: {}", e)
    })?;

    // Fetch low stock items count
    let low_stock_items_row = sqlx::query(
        "SELECT CAST(COUNT(*) AS INTEGER) as low_stock_count
         FROM inventory i
         JOIN products p ON i.product_id = p.id
         WHERE i.current_stock <= i.minimum_stock AND p.is_active = 1",
    )
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to get low stock count: {}", e))?;

    let low_stock_count: i32 = low_stock_items_row
        .try_get("low_stock_count")
        .map_err(|e| {
            log_error("low_stock_count", "i32", &e);
            format!("Type mismatch for low_stock_items: {}", e)
        })?;

    // Calculate average transaction value
    let avg_transaction = if today_transactions > 0 {
        today_sales_amount / (today_transactions as f64)
    } else {
        0.0
    };

    // Construct dashboard stats
    let stats = DashboardStats {
        today_sales: today_sales_amount,
        today_transactions,
        total_products: total_products_count,
        low_stock_items: low_stock_count,
        average_transaction_value: avg_transaction,
        week_sales: week_sales_amount,
        month_sales: month_sales_amount,
    };

    #[cfg(debug_assertions)]
    println!("Dashboard stats fetched: {:?}", stats);

    Ok(stats)
}

#[command]
pub async fn get_recent_activity(
    pool: State<'_, SqlitePool>,
    limit: Option<i32>,
) -> Result<RecentActivity, String> {
    let pool_ref = pool.inner();
    let limit = limit.unwrap_or(10);

    // Fetch recent sales
    let sales = fetch_recent_sales(pool_ref, limit).await?;

    // Fetch low stock items
    let low_stock_items = fetch_low_stock_items(pool_ref, limit).await?;

    // Fetch recent products
    let recent_products = fetch_recent_products(pool_ref, limit).await?;

    Ok(RecentActivity {
        sales,
        low_stock_items,
        recent_products,
    })
}

// Helper functions

/// Log error in debug mode
fn log_error<E: std::fmt::Display>(field: &str, expected_type: &str, error: &E) {
    #[cfg(debug_assertions)]
    println!(
        "Dashboard Stats Error: Failed to fetch '{}' as {}. Error: {}",
        field, expected_type, error
    );
}

/// Fetch recent sales with cashier information
async fn fetch_recent_sales(pool: &SqlitePool, limit: i32) -> Result<Vec<Sale>, String> {
    let sales_rows = sqlx::query(
        "SELECT s.id, s.sale_number, s.subtotal, s.tax_amount, s.discount_amount, s.total_amount,
                s.payment_method, s.payment_status, s.cashier_id, s.customer_name, s.customer_phone,
                s.customer_email, s.notes, s.is_voided, s.voided_by, s.voided_at, s.void_reason,
                s.shift_id, s.created_at,
                u.first_name, u.last_name
         FROM sales s
         JOIN users u ON s.cashier_id = u.id
         WHERE s.is_voided = 0
         ORDER BY s.created_at DESC
         LIMIT ?1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to get recent sales: {}", e))?;

    sales_rows
        .iter()
        .map(|row| build_sale_from_row(row))
        .collect()
}

/// Fetch low stock items with product details
async fn fetch_low_stock_items(
    pool: &SqlitePool,
    limit: i32,
) -> Result<Vec<InventoryItem>, String> {
    let low_stock_rows = sqlx::query(
        "SELECT i.id, i.product_id, i.current_stock, i.minimum_stock, i.maximum_stock,
                i.reserved_stock, i.available_stock, i.last_updated, i.last_stock_take,
                i.stock_take_count,
                p.sku, p.barcode, p.name, p.description, p.category, p.subcategory, p.brand,
                p.unit_of_measure, p.cost_price, p.selling_price, p.wholesale_price, p.tax_rate,
                p.is_active, p.is_taxable, p.weight, p.dimensions, p.supplier_info, p.reorder_point,
                p.created_at as product_created_at, p.updated_at as product_updated_at
         FROM inventory i
         JOIN products p ON i.product_id = p.id
         WHERE i.current_stock <= i.minimum_stock AND p.is_active = 1
         ORDER BY (i.minimum_stock - i.current_stock) DESC
         LIMIT ?1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to get low stock items: {}", e))?;

    low_stock_rows
        .iter()
        .map(|row| build_inventory_item_from_row(row))
        .collect()
}

/// Fetch recent products
async fn fetch_recent_products(pool: &SqlitePool, limit: i32) -> Result<Vec<Product>, String> {
    let recent_products_rows = sqlx::query(
        "SELECT id, sku, barcode, name, description, category, subcategory, brand,
                unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                is_active, is_taxable, weight, dimensions, supplier_info, reorder_point,
                created_at, updated_at
         FROM products
         WHERE is_active = 1
         ORDER BY created_at DESC
         LIMIT ?1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to get recent products: {}", e))?;

    recent_products_rows
        .iter()
        .map(|row| build_product_from_row(row, "created_at", "updated_at"))
        .collect()
}

/// Build Sale struct from database row
fn build_sale_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Sale, String> {
    Ok(Sale {
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
    })
}

/// Build Product struct from database row with custom timestamp field names
fn build_product_from_row(
    row: &sqlx::sqlite::SqliteRow,
    created_field: &str,
    updated_field: &str,
) -> Result<Product, String> {
    Ok(Product {
        id: row.try_get("id").map_err(|e| e.to_string())?,
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
        created_at: row.try_get(created_field).map_err(|e| e.to_string())?,
        updated_at: row.try_get(updated_field).map_err(|e| e.to_string())?,
    })
}

/// Build InventoryItem struct from database row with joined product data
fn build_inventory_item_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<InventoryItem, String> {
    let product = build_product_from_row(row, "product_created_at", "product_updated_at")?;

    Ok(InventoryItem {
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
    })
}
