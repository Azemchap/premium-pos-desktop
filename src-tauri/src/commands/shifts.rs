use tauri::{command, State};
use crate::models::{Shift, CreateShiftRequest, CloseShiftRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn open_shift(
    pool: State<'_, SqlitePool>,
    request: CreateShiftRequest,
) -> Result<Shift, String> {
    let shift_id = sqlx::query(
        "INSERT INTO shifts (user_id, opening_amount, status, opened_at) VALUES (?, ?, 'open', ?)"
    )
    .bind(request.user_id)
    .bind(request.opening_amount)
    .bind(chrono::Utc::now().naive_utc())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let shift = Shift {
        id: shift_id,
        user_id: request.user_id,
        opening_amount: request.opening_amount,
        closing_amount: None,
        total_sales: 0.0,
        total_transactions: 0,
        status: "open".to_string(),
        opened_at: chrono::Utc::now().naive_utc(),
        closed_at: None,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(shift)
}

#[tauri::command]
pub async fn close_shift(
    pool: State<'_, SqlitePool>,
    shift_id: i64,
    request: CloseShiftRequest,
) -> Result<Shift, String> {
    // Get shift details
    let shift_row = sqlx::query("SELECT * FROM shifts WHERE id = ? AND status = 'open'")
        .bind(shift_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // Calculate totals
    let sales_result = sqlx::query("SELECT COUNT(*) as count, SUM(total_amount) as total FROM sales WHERE shift_id = ?")
        .bind(shift_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let total_transactions: i64 = sales_result.try_get("count").map_err(|e| e.to_string())?;
    let total_sales: f64 = sales_result.try_get("total").map_err(|e| e.to_string()).unwrap_or(0.0);

    // Update shift
    sqlx::query(
        "UPDATE shifts SET closing_amount = ?, total_sales = ?, total_transactions = ?, status = 'closed', closed_at = ?, updated_at = ? WHERE id = ?"
    )
    .bind(request.closing_amount)
    .bind(total_sales)
    .bind(total_transactions)
    .bind(chrono::Utc::now().naive_utc())
    .bind(chrono::Utc::now().naive_utc())
    .bind(shift_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let shift = Shift {
        id: shift_id,
        user_id: shift_row.try_get("user_id").map_err(|e| e.to_string())?,
        opening_amount: shift_row.try_get("opening_amount").map_err(|e| e.to_string())?,
        closing_amount: Some(request.closing_amount),
        total_sales,
        total_transactions,
        status: "closed".to_string(),
        opened_at: shift_row.try_get("opened_at").map_err(|e| e.to_string())?,
        closed_at: Some(chrono::Utc::now().naive_utc()),
        created_at: shift_row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(shift)
}

#[tauri::command]
pub async fn get_current_shift(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<Option<Shift>, String> {
    let row = sqlx::query("SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1")
        .bind(user_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let shift = Shift {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
            opening_amount: row.try_get("opening_amount").map_err(|e| e.to_string())?,
            closing_amount: row.try_get("closing_amount").ok().flatten(),
            total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
            total_transactions: row.try_get("total_transactions").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            opened_at: row.try_get("opened_at").map_err(|e| e.to_string())?,
            closed_at: row.try_get("closed_at").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        Ok(Some(shift))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_shift_history(
    pool: State<'_, SqlitePool>,
    user_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Shift>, String> {
    let mut query = String::from("SELECT * FROM shifts WHERE status = 'closed'");
    let mut params: Vec<String> = Vec::new();

    if let Some(uid) = user_id {
        query.push_str(" AND user_id = ?");
        params.push(uid.to_string());
    }

    query.push_str(" ORDER BY closed_at DESC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut shifts = Vec::new();
    for row in rows {
        let shift = Shift {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
            opening_amount: row.try_get("opening_amount").map_err(|e| e.to_string())?,
            closing_amount: row.try_get("closing_amount").ok().flatten(),
            total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
            total_transactions: row.try_get("total_transactions").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            opened_at: row.try_get("opened_at").map_err(|e| e.to_string())?,
            closed_at: row.try_get("closed_at").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        shifts.push(shift);
    }

    Ok(shifts)
}