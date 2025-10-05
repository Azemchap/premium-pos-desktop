// src/commands/dashboard.rs
use chrono::{Datelike, Duration, NaiveDate};
use sqlx::{Row, SqlitePool};
use tauri::State;

use crate::models::{DashboardStats, LowStockItem, ProductSummary, RecentActivity, RecentSale};

#[tauri::command]
pub async fn get_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, String> {
    let today = chrono::Utc::now().date_naive();
    let start_of_week = today - Duration::days(today.weekday().num_days_from_monday() as i64);
    let start_of_month = NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap_or(today);
    let end_of_month = NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1)
        .unwrap_or(today)
        .pred_opt()
        .unwrap_or(today);

    // Today's sales and transactions
    let today_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE DATE(created_at) = ?",
    )
    .bind(today.to_string())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let today_transactions: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales WHERE DATE(created_at) = ?")
            .bind(today.to_string())
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    // Week's sales
    let week_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE DATE(created_at) >= ?",
    )
    .bind(start_of_week.to_string())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Month's sales
    let month_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?"
    )
    .bind(start_of_month.to_string())
    .bind(end_of_month.to_string())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Total products
    let total_products: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // Low stock items
    let low_stock_items: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM inventory WHERE quantity_on_hand <= minimum_stock",
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Average transaction value
    let average_transaction_value = if today_transactions > 0 {
        today_sales / today_transactions as f64
    } else {
        0.0
    };

    Ok(DashboardStats {
        today_sales,
        today_transactions,
        total_products,
        low_stock_items,
        average_transaction_value,
        week_sales,
        month_sales,
    })
}

#[tauri::command]
pub async fn get_recent_activity(
    pool: State<'_, SqlitePool>,
    limit: i64,
) -> Result<RecentActivity, String> {
    // Fetch recent sales
    let sales_rows = sqlx::query(
        "SELECT id, sale_number, total_amount, customer_name, created_at FROM sales ORDER BY created_at DESC LIMIT ?"
    )
    .bind(limit)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut sales = Vec::new();
    for row in sales_rows {
        sales.push(RecentSale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        });
    }

    // Fetch low stock items
    let low_stock_rows = sqlx::query(
        "SELECT i.id, i.quantity_on_hand as current_stock, i.minimum_stock, p.name, p.sku 
         FROM inventory i 
         JOIN products p ON i.product_id = p.id 
         WHERE i.quantity_on_hand <= i.minimum_stock 
         ORDER BY i.quantity_on_hand ASC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut low_stock_items = Vec::new();
    for row in low_stock_rows {
        low_stock_items.push(LowStockItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            current_stock: row.try_get("current_stock").map_err(|e| e.to_string())?,
            minimum_stock: row.try_get("minimum_stock").map_err(|e| e.to_string())?,
            product: ProductSummary {
                name: row.try_get("name").map_err(|e| e.to_string())?,
                sku: row.try_get("sku").map_err(|e| e.to_string())?,
            },
        });
    }

    Ok(RecentActivity {
        sales,
        low_stock_items,
    })
}

#[tauri::command]
pub async fn get_recent_sales(
    pool: State<'_, SqlitePool>,
    limit: i64,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT s.id, s.sale_number, s.total_amount, s.payment_method, s.created_at, u.first_name || ' ' || u.last_name AS cashier_name 
         FROM sales s 
         LEFT JOIN users u ON s.cashier_id = u.id 
         ORDER BY s.created_at DESC LIMIT ?"
    )
    .bind(limit)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut sales = Vec::new();
    for row in rows {
        let sale = serde_json::json!({
            "id": row.try_get::<i64, _>("id").map_err(|e| e.to_string())?,
            "sale_number": row.try_get::<String, _>("sale_number").map_err(|e| e.to_string())?,
            "total_amount": row.try_get::<f64, _>("total_amount").map_err(|e| e.to_string())?,
            "payment_method": row.try_get::<String, _>("payment_method").map_err(|e| e.to_string())?,
            "created_at": row.try_get::<String, _>("created_at").map_err(|e| e.to_string())?,
            "cashier_name": row.try_get::<Option<String>, _>("cashier_name").map_err(|e| e.to_string())?
        });
        sales.push(sale);
    }

    Ok(serde_json::json!({ "sales": sales }))
}

#[tauri::command]
pub async fn get_top_products(
    pool: State<'_, SqlitePool>,
    limit: i64,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT p.name, p.sku, SUM(si.quantity) as total_sold, SUM(si.total_price) as total_revenue 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         GROUP BY p.id 
         ORDER BY total_sold DESC 
         LIMIT ?"
    )
    .bind(limit)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = serde_json::json!({
            "name": row.try_get::<String, _>("name").map_err(|e| e.to_string())?,
            "sku": row.try_get::<String, _>("sku").map_err(|e| e.to_string())?,
            "total_sold": row.try_get::<i32, _>("total_sold").map_err(|e| e.to_string())?,
            "total_revenue": row.try_get::<f64, _>("total_revenue").map_err(|e| e.to_string())?
        });
        products.push(product);
    }

    Ok(serde_json::json!({ "products": products }))
}
