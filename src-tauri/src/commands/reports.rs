use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub total_sales: f64,
    pub total_transactions: i32,
    pub average_transaction: f64,
    pub total_profit: f64,
    pub total_tax: f64,
    pub total_discount: f64,
    pub cash_sales: f64,
    pub card_sales: f64,
    pub mobile_sales: f64,
    pub check_sales: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductPerformance {
    pub product_id: i64,
    pub product_name: String,
    pub sku: String,
    pub category: Option<String>,
    pub total_quantity_sold: i32,
    pub total_revenue: f64,
    pub total_profit: f64,
    pub transaction_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySales {
    pub date: String,
    pub total_sales: f64,
    pub transaction_count: i32,
    pub average_transaction: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryPerformance {
    pub category: String,
    pub total_revenue: f64,
    pub total_profit: f64,
    pub total_items_sold: i32,
    pub product_count: i32,
}

#[command]
pub async fn get_sales_report(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<SalesReport, String> {
    let pool_ref = pool.inner();

    let mut query = String::from(
        "SELECT 
            COALESCE(SUM(total_amount), 0.0) as total_sales,
            COUNT(*) as total_transactions,
            COALESCE(AVG(total_amount), 0.0) as average_transaction,
            COALESCE(SUM(tax_amount), 0.0) as total_tax,
            COALESCE(SUM(discount_amount), 0.0) as total_discount,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0.0 END), 0.0) as cash_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0.0 END), 0.0) as card_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0.0 END), 0.0) as mobile_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'check' THEN total_amount ELSE 0.0 END), 0.0) as check_sales
         FROM sales
         WHERE is_voided = 0",
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            query.push_str(" AND DATE(created_at) >= ?");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            query.push_str(" AND DATE(created_at) <= ?");
            params.push(end.clone());
        }
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let row = sql_query
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    // Calculate total profit
    let mut profit_query = String::from(
        "SELECT COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0.0) as total_profit
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         WHERE s.is_voided = 0",
    );

    let mut profit_params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            profit_query.push_str(" AND DATE(s.created_at) >= ?");
            profit_params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            profit_query.push_str(" AND DATE(s.created_at) <= ?");
            profit_params.push(end.clone());
        }
    }

    let mut profit_sql_query = sqlx::query(&profit_query);
    for param in &profit_params {
        profit_sql_query = profit_sql_query.bind(param);
    }

    let profit_row = profit_sql_query
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(SalesReport {
        total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
        total_transactions: row.try_get("total_transactions").map_err(|e| e.to_string())?,
        average_transaction: row.try_get("average_transaction").map_err(|e| e.to_string())?,
        total_profit: profit_row.try_get("total_profit").map_err(|e| e.to_string())?,
        total_tax: row.try_get("total_tax").map_err(|e| e.to_string())?,
        total_discount: row.try_get("total_discount").map_err(|e| e.to_string())?,
        cash_sales: row.try_get("cash_sales").map_err(|e| e.to_string())?,
        card_sales: row.try_get("card_sales").map_err(|e| e.to_string())?,
        mobile_sales: row.try_get("mobile_sales").map_err(|e| e.to_string())?,
        check_sales: row.try_get("check_sales").map_err(|e| e.to_string())?,
    })
}

#[command]
pub async fn get_product_performance(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<ProductPerformance>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(20);

    let mut query = String::from(
        "SELECT 
            p.id as product_id,
            p.name as product_name,
            p.sku,
            p.category,
            COALESCE(SUM(si.quantity), 0) as total_quantity_sold,
            COALESCE(SUM(si.line_total), 0.0) as total_revenue,
            COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0.0) as total_profit,
            COUNT(DISTINCT s.id) as transaction_count
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         LEFT JOIN sales s ON si.sale_id = s.id AND s.is_voided = 0
         WHERE 1=1",
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            query.push_str(" AND (s.created_at IS NULL OR DATE(s.created_at) >= ?)");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            query.push_str(" AND (s.created_at IS NULL OR DATE(s.created_at) <= ?)");
            params.push(end.clone());
        }
    }

    query.push_str(" GROUP BY p.id, p.name, p.sku, p.category");
    query.push_str(" HAVING total_quantity_sold > 0");
    query.push_str(" ORDER BY total_revenue DESC");
    query.push_str(" LIMIT ?");

    params.push(limit.to_string());

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut performances = Vec::new();
    for row in rows {
        performances.push(ProductPerformance {
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            product_name: row.try_get("product_name").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            category: row.try_get("category").ok(),
            total_quantity_sold: row.try_get("total_quantity_sold").map_err(|e| e.to_string())?,
            total_revenue: row.try_get("total_revenue").map_err(|e| e.to_string())?,
            total_profit: row.try_get("total_profit").map_err(|e| e.to_string())?,
            transaction_count: row.try_get("transaction_count").map_err(|e| e.to_string())?,
        });
    }

    Ok(performances)
}

#[command]
pub async fn get_daily_sales(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<DailySales>, String> {
    let pool_ref = pool.inner();

    let mut query = String::from(
        "SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(total_amount), 0.0) as total_sales,
            COUNT(*) as transaction_count,
            COALESCE(AVG(total_amount), 0.0) as average_transaction
         FROM sales
         WHERE is_voided = 0",
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            query.push_str(" AND DATE(created_at) >= ?");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            query.push_str(" AND DATE(created_at) <= ?");
            params.push(end.clone());
        }
    }

    query.push_str(" GROUP BY DATE(created_at)");
    query.push_str(" ORDER BY date DESC");

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut daily_sales = Vec::new();
    for row in rows {
        daily_sales.push(DailySales {
            date: row.try_get("date").map_err(|e| e.to_string())?,
            total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
            transaction_count: row.try_get("transaction_count").map_err(|e| e.to_string())?,
            average_transaction: row.try_get("average_transaction").map_err(|e| e.to_string())?,
        });
    }

    Ok(daily_sales)
}

#[command]
pub async fn get_category_performance(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<CategoryPerformance>, String> {
    let pool_ref = pool.inner();

    let mut query = String::from(
        "SELECT 
            COALESCE(p.category, 'Uncategorized') as category,
            COALESCE(SUM(si.line_total), 0.0) as total_revenue,
            COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0.0) as total_profit,
            COALESCE(SUM(si.quantity), 0) as total_items_sold,
            COUNT(DISTINCT p.id) as product_count
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         LEFT JOIN sales s ON si.sale_id = s.id AND s.is_voided = 0
         WHERE 1=1",
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            query.push_str(" AND (s.created_at IS NULL OR DATE(s.created_at) >= ?)");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            query.push_str(" AND (s.created_at IS NULL OR DATE(s.created_at) <= ?)");
            params.push(end.clone());
        }
    }

    query.push_str(" GROUP BY p.category");
    query.push_str(" ORDER BY total_revenue DESC");

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut categories = Vec::new();
    for row in rows {
        let total_revenue: f64 = row.try_get("total_revenue").map_err(|e| e.to_string())?;
        if total_revenue > 0.0 {
            categories.push(CategoryPerformance {
                category: row.try_get("category").map_err(|e| e.to_string())?,
                total_revenue,
                total_profit: row.try_get("total_profit").map_err(|e| e.to_string())?,
                total_items_sold: row.try_get("total_items_sold").map_err(|e| e.to_string())?,
                product_count: row.try_get("product_count").map_err(|e| e.to_string())?,
            });
        }
    }

    Ok(categories)
}
