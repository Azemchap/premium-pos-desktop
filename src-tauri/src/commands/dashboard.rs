use chrono::Datelike;
use sqlx::{Row, SqlitePool};
use tauri::State;

#[tauri::command]
pub async fn get_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let today = chrono::Utc::now().date_naive();
    let start_of_month =
        chrono::NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap_or(today);
    let end_of_month = chrono::NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1)
        .unwrap_or(today)
        .pred_opt()
        .unwrap_or(today);

    // Today's sales
    let today_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE DATE(created_at) = ?",
    )
    .bind(today.to_string())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Today's transactions
    let today_transactions: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales WHERE DATE(created_at) = ?")
            .bind(today.to_string())
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

    // Month's transactions
    let month_transactions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?",
    )
    .bind(start_of_month.to_string())
    .bind(end_of_month.to_string())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Low stock products
    let low_stock_products: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM inventory WHERE current_stock <= reorder_point")
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    // Total products
    let total_products: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let stats = serde_json::json!({
        "today_sales": today_sales,
        "today_transactions": today_transactions,
        "month_sales": month_sales,
        "month_transactions": month_transactions,
        "low_stock_products": low_stock_products,
        "total_products": total_products,
        "date": today.to_string()
    });

    Ok(stats)
}

#[tauri::command]
pub async fn get_recent_sales(
    pool: State<'_, SqlitePool>,
    limit: i64,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT s.*, u.username as cashier_name FROM sales s 
         LEFT JOIN users u ON s.user_id = u.id 
         ORDER BY s.created_at DESC LIMIT ?",
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
