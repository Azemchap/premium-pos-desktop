use tauri::{command, State};
use sqlx::{SqlitePool, Row};
use crate::models::{Shift, CreateShiftRequest, CloseShiftRequest};

#[command]
pub async fn create_shift(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    request: CreateShiftRequest,
) -> Result<Shift, String> {
    let pool_ref = pool.inner();
    
    // Check if user already has an open shift
    let existing_shift = sqlx::query(
        "SELECT id FROM shifts WHERE user_id = ?1 AND status = 'open'"
    )
    .bind(user_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if existing_shift.is_some() {
        return Err("User already has an open shift".to_string());
    }

    // Create new shift
    let result = sqlx::query(
        "INSERT INTO shifts (user_id, start_time, opening_amount, status) 
         VALUES (?1, CURRENT_TIMESTAMP, ?2, 'open')"
    )
    .bind(user_id)
    .bind(request.opening_amount)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create shift: {}", e))?;

    let shift_id = result.last_insert_rowid();

    // Get the created shift
    let row = sqlx::query(
        "SELECT id, user_id, start_time, end_time, opening_amount, closing_amount, 
                total_sales, total_returns, cash_sales, card_sales, status, notes, created_at
         FROM shifts WHERE id = ?1"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created shift: {}", e))?;

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

#[command]
pub async fn close_shift(
    pool: State<'_, SqlitePool>,
    shift_id: i64,
    user_id: i64,
    request: CloseShiftRequest,
) -> Result<Shift, String> {
    let pool_ref = pool.inner();
    
    // Verify shift exists and belongs to user
    let shift = sqlx::query(
        "SELECT id, status FROM shifts WHERE id = ?1 AND user_id = ?2"
    )
    .bind(shift_id)
    .bind(user_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let shift = match shift {
        Some(s) => s,
        None => return Err("Shift not found or access denied".to_string()),
    };

    let shift_status: String = shift.try_get("status").map_err(|e| e.to_string())?;
    if shift_status != "open" {
        return Err("Shift is already closed".to_string());
    }

    // Calculate totals from sales
    let sales_totals = sqlx::query(
        "SELECT 
            COALESCE(SUM(total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN payment_method != 'Cash' THEN total_amount ELSE 0 END), 0) as card_sales
         FROM sales WHERE shift_id = ?1 AND is_voided = 0"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to calculate sales totals: {}", e))?;

    let total_sales: f64 = sales_totals.try_get("total_sales").map_err(|e| e.to_string())?;
    let cash_sales: f64 = sales_totals.try_get("cash_sales").map_err(|e| e.to_string())?;
    let card_sales: f64 = sales_totals.try_get("card_sales").map_err(|e| e.to_string())?;

    // Close the shift
    sqlx::query(
        "UPDATE shifts SET 
            end_time = CURRENT_TIMESTAMP,
            closing_amount = ?1,
            total_sales = ?2,
            cash_sales = ?3,
            card_sales = ?4,
            status = 'closed',
            notes = ?5
         WHERE id = ?6"
    )
    .bind(request.closing_amount)
    .bind(total_sales)
    .bind(cash_sales)
    .bind(card_sales)
    .bind(&request.notes)
    .bind(shift_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to close shift: {}", e))?;

    // Get the updated shift
    let row = sqlx::query(
        "SELECT id, user_id, start_time, end_time, opening_amount, closing_amount, 
                total_sales, total_returns, cash_sales, card_sales, status, notes, created_at
         FROM shifts WHERE id = ?1"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch updated shift: {}", e))?;

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

#[command]
pub async fn get_current_shift(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<Option<Shift>, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, user_id, start_time, end_time, opening_amount, closing_amount, 
                total_sales, total_returns, cash_sales, card_sales, status, notes, created_at
         FROM shifts WHERE user_id = ?1 AND status = 'open'"
    )
    .bind(user_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    match row {
        Some(r) => {
            let shift = Shift {
                id: r.try_get("id").map_err(|e| e.to_string())?,
                user_id: r.try_get("user_id").map_err(|e| e.to_string())?,
                start_time: r.try_get("start_time").map_err(|e| e.to_string())?,
                end_time: r.try_get("end_time").ok().flatten(),
                opening_amount: r.try_get("opening_amount").map_err(|e| e.to_string())?,
                closing_amount: r.try_get("closing_amount").ok().flatten(),
                total_sales: r.try_get("total_sales").map_err(|e| e.to_string())?,
                total_returns: r.try_get("total_returns").map_err(|e| e.to_string())?,
                cash_sales: r.try_get("cash_sales").map_err(|e| e.to_string())?,
                card_sales: r.try_get("card_sales").map_err(|e| e.to_string())?,
                status: r.try_get("status").map_err(|e| e.to_string())?,
                notes: r.try_get("notes").ok().flatten(),
                created_at: r.try_get("created_at").map_err(|e| e.to_string())?,
            };
            Ok(Some(shift))
        }
        None => Ok(None),
    }
}

#[command]
pub async fn get_shift_history(
    pool: State<'_, SqlitePool>,
    user_id: Option<i64>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Shift>, String> {
    let pool_ref = pool.inner();
    
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    
    let query = if let Some(uid) = user_id {
        "SELECT id, user_id, start_time, end_time, opening_amount, closing_amount, 
                total_sales, total_returns, cash_sales, card_sales, status, notes, created_at
         FROM shifts WHERE user_id = ?1 ORDER BY start_time DESC LIMIT ?2 OFFSET ?3"
    } else {
        "SELECT id, user_id, start_time, end_time, opening_amount, closing_amount, 
                total_sales, total_returns, cash_sales, card_sales, status, notes, created_at
         FROM shifts ORDER BY start_time DESC LIMIT ?1 OFFSET ?2"
    };

    let rows = if let Some(uid) = user_id {
        sqlx::query(query)
            .bind(uid)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool_ref)
            .await
    } else {
        sqlx::query(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool_ref)
            .await
    }
    .map_err(|e| format!("Database error: {}", e))?;

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
