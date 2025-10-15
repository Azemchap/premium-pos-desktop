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
pub struct FinancialMetrics {
    pub gross_profit: f64,
    pub gross_profit_margin: f64,
    pub net_profit: f64,
    pub net_profit_margin: f64,
    pub revenue_growth_rate: f64,
    pub average_basket_size: f64,
    pub inventory_turnover_ratio: f64,
    pub return_on_investment: f64,
    pub total_cogs: f64,
    pub operating_expenses: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowSummary {
    pub cash_inflow: f64,
    pub cash_outflow: f64,
    pub net_cash_flow: f64,
    pub cash_from_operations: f64,
    pub opening_balance: f64,
    pub closing_balance: f64,
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
            COALESCE(SUM(s.total_amount), 0.0) as total_sales,
            COUNT(*) as total_transactions,
            COALESCE(AVG(s.total_amount), 0.0) as average_transaction,
            COALESCE(SUM(s.tax_amount), 0.0) as total_tax,
            COALESCE(SUM(s.discount_amount), 0.0) as total_discount,
            COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.total_amount ELSE 0.0 END), 0.0) as cash_sales,
            COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.total_amount ELSE 0.0 END), 0.0) as card_sales,
            COALESCE(SUM(CASE WHEN s.payment_method = 'mobile' THEN s.total_amount ELSE 0.0 END), 0.0) as mobile_sales,
            COALESCE(SUM(CASE WHEN s.payment_method = 'check' THEN s.total_amount ELSE 0.0 END), 0.0) as check_sales
         FROM sales s
         WHERE s.is_voided = 0",
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            query.push_str(" AND DATE(s.created_at) >= ?");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            query.push_str(" AND DATE(s.created_at) <= ?");
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
            DATE(s.created_at) as date,
            COALESCE(SUM(s.total_amount), 0.0) as total_sales,
            COUNT(*) as transaction_count,
            COALESCE(AVG(s.total_amount), 0.0) as average_transaction
         FROM sales s
         WHERE s.is_voided = 0",
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

#[command]
pub async fn get_financial_metrics(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<FinancialMetrics, String> {
    let pool_ref = pool.inner();

    // Build date filter
    let mut date_filter = String::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            date_filter.push_str(" AND DATE(s.created_at) >= ?");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            date_filter.push_str(" AND DATE(s.created_at) <= ?");
            params.push(end.clone());
        }
    }

    // Calculate revenue and COGS
    let revenue_query = format!(
        "SELECT 
            COALESCE(SUM(s.total_amount), 0.0) as total_revenue,
            COALESCE(SUM(si.cost_price * si.quantity), 0.0) as total_cogs,
            COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0.0) as gross_profit,
            COUNT(DISTINCT s.id) as transaction_count,
            COALESCE(SUM(si.quantity), 0) as total_items
         FROM sales s
         JOIN sale_items si ON s.id = si.sale_id
         WHERE s.is_voided = 0{}",
        date_filter
    );

    let mut sql_query = sqlx::query(&revenue_query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let row = sql_query
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let total_revenue: f64 = row.try_get("total_revenue").unwrap_or(0.0);
    let total_cogs: f64 = row.try_get("total_cogs").unwrap_or(0.0);
    let gross_profit: f64 = row.try_get("gross_profit").unwrap_or(0.0);
    let transaction_count: i32 = row.try_get("transaction_count").unwrap_or(0);
    let total_items: i32 = row.try_get("total_items").unwrap_or(0);

    // Calculate operating expenses (simplified - typically 15-20% of revenue)
    let operating_expenses = total_revenue * 0.15;

    // Calculate net profit
    let net_profit = gross_profit - operating_expenses;

    // Calculate profit margins
    let gross_profit_margin = if total_revenue > 0.0 {
        (gross_profit / total_revenue) * 100.0
    } else {
        0.0
    };

    let net_profit_margin = if total_revenue > 0.0 {
        (net_profit / total_revenue) * 100.0
    } else {
        0.0
    };

    // Calculate average basket size
    let average_basket_size = if transaction_count > 0 {
        total_items as f64 / transaction_count as f64
    } else {
        0.0
    };

    // Calculate inventory turnover (COGS / Average Inventory)
    let inventory_value_query = "SELECT COALESCE(SUM(i.current_stock * p.cost_price), 0.0) as inventory_value
                                  FROM inventory i
                                  JOIN products p ON i.product_id = p.id";
    let inventory_row = sqlx::query(inventory_value_query)
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Failed to get inventory value: {}", e))?;
    
    let inventory_value: f64 = inventory_row.try_get("inventory_value").unwrap_or(0.0);
    let inventory_turnover_ratio = if inventory_value > 0.0 {
        total_cogs / inventory_value
    } else {
        0.0
    };

    // Calculate ROI
    let return_on_investment = if total_cogs > 0.0 {
        (gross_profit / total_cogs) * 100.0
    } else {
        0.0
    };

    // Calculate revenue growth (compare to previous period)
    let revenue_growth_rate = 0.0; // Simplified for now

    Ok(FinancialMetrics {
        gross_profit,
        gross_profit_margin,
        net_profit,
        net_profit_margin,
        revenue_growth_rate,
        average_basket_size,
        inventory_turnover_ratio,
        return_on_investment,
        total_cogs,
        operating_expenses,
    })
}

#[command]
pub async fn get_cash_flow_summary(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<CashFlowSummary, String> {
    let pool_ref = pool.inner();

    // Build date filter
    let mut date_filter = String::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(start) = &start_date {
        if !start.is_empty() {
            date_filter.push_str(" AND DATE(s.created_at) >= ?");
            params.push(start.clone());
        }
    }

    if let Some(end) = &end_date {
        if !end.is_empty() {
            date_filter.push_str(" AND DATE(s.created_at) <= ?");
            params.push(end.clone());
        }
    }

    // Calculate cash inflow from sales
    let inflow_query = format!(
        "SELECT COALESCE(SUM(s.total_amount), 0.0) as cash_inflow
         FROM sales s
         WHERE s.is_voided = 0{}",
        date_filter
    );

    let mut sql_query = sqlx::query(&inflow_query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let inflow_row = sql_query
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let cash_inflow: f64 = inflow_row.try_get("cash_inflow").unwrap_or(0.0);

    // Calculate cash outflow (COGS + operating expenses estimate)
    let mut outflow_params: Vec<String> = Vec::new();
    let outflow_query = format!(
        "SELECT COALESCE(SUM(si.cost_price * si.quantity), 0.0) as cogs
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         WHERE s.is_voided = 0{}",
        date_filter
    );

    let mut outflow_sql = sqlx::query(&outflow_query);
    if let Some(start) = &start_date {
        if !start.is_empty() {
            outflow_params.push(start.clone());
        }
    }
    if let Some(end) = &end_date {
        if !end.is_empty() {
            outflow_params.push(end.clone());
        }
    }
    for param in &outflow_params {
        outflow_sql = outflow_sql.bind(param);
    }

    let outflow_row = outflow_sql
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let cogs: f64 = outflow_row.try_get("cogs").unwrap_or(0.0);
    let operating_expenses = cash_inflow * 0.15; // Estimate
    let cash_outflow = cogs + operating_expenses;

    // Calculate net cash flow
    let net_cash_flow = cash_inflow - cash_outflow;

    // Cash from operations (simplified)
    let cash_from_operations = net_cash_flow;

    // Balance calculations (simplified - would need actual cash drawer data)
    let opening_balance = 1000.0; // Placeholder
    let closing_balance = opening_balance + net_cash_flow;

    Ok(CashFlowSummary {
        cash_inflow,
        cash_outflow,
        net_cash_flow,
        cash_from_operations,
        opening_balance,
        closing_balance,
    })
}
