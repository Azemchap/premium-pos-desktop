use tauri::{command, State};
use crate::models::{DashboardStats, RecentActivity};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn get_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, String> {
    // Today's date
    let today = chrono::Utc::now().date_naive();
    let week_ago = today - chrono::Duration::days(7);
    let month_ago = today - chrono::Duration::days(30);

    // Today's sales
    let today_sales_result = sqlx::query(
        "SELECT COUNT(*) as count, SUM(total_amount) as total FROM sales WHERE DATE(created_at) = DATE(?)"
    )
    .bind(today)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let today_transactions: i64 = today_sales_result.try_get("count").map_err(|e| e.to_string())?;
    let today_sales: f64 = today_sales_result.try_get("total").map_err(|e| e.to_string()).unwrap_or(0.0);

    // Week sales
    let week_sales_result = sqlx::query(
        "SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) >= DATE(?)"
    )
    .bind(week_ago)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let week_sales: f64 = week_sales_result.try_get("total").map_err(|e| e.to_string()).unwrap_or(0.0);

    // Month sales
    let month_sales_result = sqlx::query(
        "SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) >= DATE(?)"
    )
    .bind(month_ago)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let month_sales: f64 = month_sales_result.try_get("total").map_err(|e| e.to_string()).unwrap_or(0.0);

    // Product counts
    let total_products_result = sqlx::query("SELECT COUNT(*) as count FROM products WHERE is_active = 1")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let total_products: i64 = total_products_result.try_get("count").map_err(|e| e.to_string())?;

    // Low stock items
    let low_stock_result = sqlx::query(
        "SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.minimum_stock <= i.current_stock AND p.is_active = 1"
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let low_stock_items: i64 = low_stock_result.try_get("count").map_err(|e| e.to_string())?;

    let stats = DashboardStats {
        today_sales,
        today_transactions: today_transactions.try_into().unwrap(),
        week_sales,
        month_sales,
        total_products: total_products.try_into().unwrap(),
        low_stock_items: low_stock_items.try_into().unwrap(),
        average_transaction_value: if today_transactions > 0 { today_sales / today_transactions as f64 } else { 0.0 },
    };

    Ok(stats)
}

#[tauri::command]
pub async fn get_recent_activity(
    pool: State<'_, SqlitePool>,
    limit: Option<i64>,
) -> Result<Vec<RecentActivity>, String> {
    let lim = limit.unwrap_or(10);
    
    let rows = sqlx::query(
        "SELECT 'sale' as type, id, total_amount as amount, created_at, 'Sale completed' as description FROM sales ORDER BY created_at DESC LIMIT ?"
    )
    .bind(lim)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut activities = Vec::new();
    for row in rows {
        let activity = RecentActivity {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            activity_type: row.try_get("type").map_err(|e| e.to_string())?,
            amount: row.try_get("amount").map_err(|e| e.to_string())?,
            description: row.try_get("description").map_err(|e| e.to_string())?,
            timestamp: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        activities.push(activity);
    }

    Ok(activities)
}