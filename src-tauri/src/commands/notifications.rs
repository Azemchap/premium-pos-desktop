// src-tauri/src/commands/notifications.rs
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct Notification {
    pub id: i64,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub severity: String, // info, warning, error, success
    pub is_read: bool,
    pub user_id: Option<i64>,
    pub reference_id: Option<i64>,
    pub reference_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationStats {
    pub total: i32,
    pub unread: i32,
    pub low_stock: i32,
    pub system: i32,
    pub invoice: i32,
    pub debt: i32,
}

#[command]
pub async fn get_notifications(
    pool: State<'_, SqlitePool>,
    user_id: Option<i64>,
    is_read: Option<bool>,
    notification_type: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<Notification>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(50);

    let mut query = String::from(
        "SELECT id, notification_type, title, message, severity, is_read, 
                user_id, reference_id, reference_type, created_at
         FROM notifications
         WHERE 1=1",
    );

    let mut params: Vec<String> = Vec::new();
    let mut param_count = 0;

    if let Some(uid) = user_id {
        param_count += 1;
        query.push_str(&format!(
            " AND (user_id = ?{} OR user_id IS NULL)",
            param_count
        ));
        params.push(uid.to_string());
    }

    if let Some(read) = is_read {
        param_count += 1;
        query.push_str(&format!(" AND is_read = ?{}", param_count));
        params.push(if read { "1" } else { "0" }.to_string());
    }

    if let Some(ref ntype) = notification_type {
        if !ntype.is_empty() && ntype != "all" {
            param_count += 1;
            query.push_str(&format!(" AND notification_type = ?{}", param_count));
            params.push(ntype.clone());
        }
    }

    query.push_str(" ORDER BY created_at DESC");
    query.push_str(&format!(" LIMIT ?{}", param_count + 1));
    params.push(limit.to_string());

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut notifications = Vec::new();
    for row in rows {
        notifications.push(Notification {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            notification_type: row
                .try_get("notification_type")
                .map_err(|e| e.to_string())?,
            title: row.try_get("title").map_err(|e| e.to_string())?,
            message: row.try_get("message").map_err(|e| e.to_string())?,
            severity: row.try_get("severity").map_err(|e| e.to_string())?,
            is_read: row.try_get("is_read").map_err(|e| e.to_string())?,
            user_id: row.try_get("user_id").ok(),
            reference_id: row.try_get("reference_id").ok(),
            reference_type: row.try_get("reference_type").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        });
    }

    Ok(notifications)
}

#[command]
pub async fn get_notification_stats(
    pool: State<'_, SqlitePool>,
    user_id: Option<i64>,
) -> Result<NotificationStats, String> {
    let pool_ref = pool.inner();

    let mut query = String::from(
        "SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
            SUM(CASE WHEN notification_type = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN notification_type = 'system' THEN 1 ELSE 0 END) as system,
            SUM(CASE WHEN notification_type = 'invoice' THEN 1 ELSE 0 END) as invoice,
            SUM(CASE WHEN notification_type = 'debt' THEN 1 ELSE 0 END) as debt
         FROM notifications
         WHERE 1=1",
    );

    if user_id.is_some() {
        query.push_str(" AND (user_id = ? OR user_id IS NULL)");
    }

    let mut sql_query = sqlx::query(&query);

    if let Some(uid) = user_id {
        sql_query = sql_query.bind(uid);
    }

    let row = sql_query
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(NotificationStats {
        total: row.try_get("total").unwrap_or(0),
        unread: row.try_get("unread").unwrap_or(0),
        low_stock: row.try_get("low_stock").unwrap_or(0),
        system: row.try_get("system").unwrap_or(0),
        invoice: row.try_get("invoice").unwrap_or(0),
        debt: row.try_get("debt").unwrap_or(0),
    })
}

#[command]
pub async fn mark_notification_read(
    pool: State<'_, SqlitePool>,
    notification_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    sqlx::query("UPDATE notifications SET is_read = 1 WHERE id = ?")
        .bind(notification_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to mark notification as read: {}", e))?;

    Ok(true)
}

#[command]
pub async fn mark_notification_unread(
    pool: State<'_, SqlitePool>,
    notification_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    sqlx::query("UPDATE notifications SET is_read = 0 WHERE id = ?")
        .bind(notification_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to mark notification as unread: {}", e))?;

    Ok(true)
}

#[command]
pub async fn mark_all_notifications_read(
    pool: State<'_, SqlitePool>,
    user_id: Option<i64>,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    let mut query = String::from("UPDATE notifications SET is_read = 1 WHERE 1=1");

    if user_id.is_some() {
        query.push_str(" AND (user_id = ? OR user_id IS NULL)");
    }

    let mut sql_query = sqlx::query(&query);

    if let Some(uid) = user_id {
        sql_query = sql_query.bind(uid);
    }

    sql_query
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to mark notifications as read: {}", e))?;

    Ok(true)
}

#[command]
pub async fn create_notification(
    pool: State<'_, SqlitePool>,
    notification_type: String,
    title: String,
    message: String,
    severity: String,
    user_id: Option<i64>,
    reference_id: Option<i64>,
    reference_type: Option<String>,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    let result = sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity, user_id, reference_id, reference_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&notification_type)
    .bind(&title)
    .bind(&message)
    .bind(&severity)
    .bind(user_id)
    .bind(reference_id)
    .bind(&reference_type)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create notification: {}", e))?;

    Ok(result.last_insert_rowid())
}

// Helper functions for internal use
async fn check_low_stock_internal(pool: &SqlitePool) -> Result<i32, String> {
    let result = sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity, reference_id, reference_type)
         SELECT 
            'low_stock', 
            'Low Stock Alert', 
            p.name || ' is running low. Current: ' || i.current_stock || ', Minimum: ' || i.minimum_stock,
            'warning',
            p.id,
            'product'
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         WHERE i.current_stock <= i.minimum_stock
         AND p.is_active = 1
         AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.notification_type = 'low_stock' 
            AND n.reference_id = p.id 
            AND n.reference_type = 'product'
            AND n.is_read = 0
         )"
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(result.rows_affected() as i32)
}

async fn check_pending_invoices_internal(pool: &SqlitePool) -> Result<i32, String> {
    let result = sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity, reference_id, reference_type)
         SELECT 
            'invoice',
            'Pending Invoice',
            'Purchase Order ' || po.po_number || ' from ' || COALESCE(s.company_name, 'Unknown Supplier') || ' is ' || LOWER(po.payment_status) || '. Amount: $' || printf('%.2f', po.total_amount),
            CASE WHEN po.payment_status = 'Unpaid' THEN 'error' ELSE 'warning' END,
            po.id,
            'purchase_order'
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.payment_status IN ('Unpaid', 'Partial')
         AND po.status != 'Cancelled'
         AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.notification_type = 'invoice' 
            AND n.reference_id = po.id 
            AND n.reference_type = 'purchase_order'
            AND n.is_read = 0
         )"
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(result.rows_affected() as i32)
}

async fn check_outstanding_debts_internal(pool: &SqlitePool) -> Result<i32, String> {
    let result = sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity, reference_id, reference_type)
         SELECT 
            'debt',
            'Outstanding Debt',
            'Sale ' || s.sale_number || ' from ' || COALESCE(s.customer_name, s.customer_phone, 'Walk-in Customer') || ' has ' || LOWER(s.payment_status) || ' payment. Amount: $' || printf('%.2f', s.total_amount),
            CASE WHEN s.payment_status = 'Pending' THEN 'error' ELSE 'warning' END,
            s.id,
            'sale'
         FROM sales s
         WHERE s.payment_status IN ('Pending', 'Partial')
         AND s.is_voided = 0
         AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.notification_type = 'debt' 
            AND n.reference_id = s.id 
            AND n.reference_type = 'sale'
            AND n.is_read = 0
         )"
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(result.rows_affected() as i32)
}

#[command]
pub async fn check_low_stock_alerts(pool: State<'_, SqlitePool>) -> Result<i32, String> {
    check_low_stock_internal(pool.inner()).await
}

#[command]
pub async fn delete_notification(
    pool: State<'_, SqlitePool>,
    notification_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();

    sqlx::query("DELETE FROM notifications WHERE id = ?")
        .bind(notification_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to delete notification: {}", e))?;

    Ok(true)
}

#[command]
pub async fn check_pending_invoices(pool: State<'_, SqlitePool>) -> Result<i32, String> {
    check_pending_invoices_internal(pool.inner()).await
}

#[command]
pub async fn check_outstanding_debts(pool: State<'_, SqlitePool>) -> Result<i32, String> {
    check_outstanding_debts_internal(pool.inner()).await
}

#[command]
pub async fn refresh_notifications(pool: State<'_, SqlitePool>) -> Result<(i32, i32, i32), String> {
    let pool_ref = pool.inner();

    // Call all three notification check functions
    let low_stock_count = check_low_stock_internal(pool_ref).await?;
    let invoice_count = check_pending_invoices_internal(pool_ref).await?;
    let debt_count = check_outstanding_debts_internal(pool_ref).await?;

    Ok((low_stock_count, invoice_count, debt_count))
}
