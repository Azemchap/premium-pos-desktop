use tauri::{command, State};
use crate::models::{Shift, CreateShiftRequest, CloseShiftRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn open_shift(
    pool: State<'_, SqlitePool>,
    request: CreateShiftRequest,
) -> Result<Shift, String> {
    let shift_id = sqlx::query(
        "INSERT INTO shifts (user_id, start_time, opening_amount, total_sales, total_returns, cash_sales, card_sales, status, notes, created_at) VALUES (?, ?, ?, 0.0, 0.0, 0.0, 0.0, 'open', ?, ?)"
    )
    .bind(1) // Default user_id, should be passed from request
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(request.opening_amount)
    .bind(&request.notes)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let shift = Shift {
        id: shift_id,
        user_id: 1, // Default user_id
        start_time: chrono::Utc::now().naive_utc().to_string(),
        end_time: None,
        opening_amount: request.opening_amount,
        closing_amount: None,
        total_sales: 0.0,
        total_returns: 0.0,
        cash_sales: 0.0,
        card_sales: 0.0,
        status: "open".to_string(),
        notes: request.notes,
        created_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(shift)
}

#[tauri::command]
pub async fn close_shift(
    pool: State<'_, SqlitePool>,
    shift_id: i64,
    request: CloseShiftRequest,
) -> Result<Shift, String> {
    // Calculate totals from sales
    let sales_result = sqlx::query(
        "SELECT COUNT(*) as count, SUM(total_amount) as total FROM sales WHERE shift_id = ?"
    )
    .bind(shift_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let total_transactions: i64 = sales_result.try_get("count").map_err(|e| e.to_string())?;
    let total_sales: f64 = sales_result.try_get("total").map_err(|e| e.to_string()).unwrap_or(0.0);

    // Update shift
    sqlx::query(
        "UPDATE shifts SET end_time = ?, closing_amount = ?, total_sales = ?, status = 'closed', notes = ? WHERE id = ?"
    )
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(request.closing_amount)
    .bind(total_sales)
    .bind(&request.notes)
    .bind(shift_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Return updated shift
    let row = sqlx::query("SELECT * FROM shifts WHERE id = ?")
        .bind(shift_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let shift = Shift {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
        start_time: row.try_get("start_time").map_err(|e| e.to_string())?,
        end_time: row.try_get("end_time").ok().flatten(),
        opening_amount: row.try_get("opening_amount").map_err(|e| e.to_string())?,
        closing_amount: row.try_get("closing_amount").ok().flatten(),
        total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
        total_returns: row.try_get("total_returns").map_err(|e| e.to_string())?,
        cash_sales: row.try_get("cash_sales").map_err(|e| e.to_string())?,
        card_sales: row.try_get("card_sales").map_err(|e| e.to_string())?,
        status: row.try_get("status").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    Ok(shift)
}

#[tauri::command]
pub async fn get_current_shift(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<Option<Shift>, String> {
    let row = sqlx::query(
        "SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY start_time DESC LIMIT 1"
    )
    .bind(user_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let shift = Shift {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
            start_time: row.try_get("start_time").map_err(|e| e.to_string())?,
            end_time: row.try_get("end_time").ok().flatten(),
            opening_amount: row.try_get("opening_amount").map_err(|e| e.to_string())?,
            closing_amount: row.try_get("closing_amount").ok().flatten(),
            total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
            total_returns: row.try_get("total_returns").map_err(|e| e.to_string())?,
            cash_sales: row.try_get("cash_sales").map_err(|e| e.to_string())?,
            card_sales: row.try_get("card_sales").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
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

    query.push_str(" ORDER BY start_time DESC");

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
            start_time: row.try_get("start_time").map_err(|e| e.to_string())?,
            end_time: row.try_get("end_time").ok().flatten(),
            opening_amount: row.try_get("opening_amount").map_err(|e| e.to_string())?,
            closing_amount: row.try_get("closing_amount").ok().flatten(),
            total_sales: row.try_get("total_sales").map_err(|e| e.to_string())?,
            total_returns: row.try_get("total_returns").map_err(|e| e.to_string())?,
            cash_sales: row.try_get("cash_sales").map_err(|e| e.to_string())?,
            card_sales: row.try_get("card_sales").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            notes: row.try_get("notes").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        shifts.push(shift);
    }

    Ok(shifts)
}
