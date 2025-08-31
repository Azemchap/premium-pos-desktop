use tauri::{command, State};
use sqlx::{SqlitePool, Row};
use crate::models::{CashDrawerTransaction, CreateCashDrawerTransactionRequest};

#[command]
pub async fn create_transaction(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    request: CreateCashDrawerTransactionRequest,
) -> Result<CashDrawerTransaction, String> {
    let pool_ref = pool.inner();
    
    // Verify shift exists and is open
    let shift = sqlx::query(
        "SELECT id, status FROM shifts WHERE id = ?1 AND status = 'open'"
    )
    .bind(request.shift_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let _shift = match shift {
        Some(s) => s,
        None => return Err("Shift not found or not open".to_string()),
    };

    // Create cash drawer transaction
    let result = sqlx::query(
        "INSERT INTO cash_drawer_transactions (shift_id, transaction_type, amount, reason, user_id) 
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(request.shift_id)
    .bind(&request.transaction_type)
    .bind(request.amount)
    .bind(&request.reason)
    .bind(user_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create cash drawer transaction: {}", e))?;

    let transaction_id = result.last_insert_rowid();

    // Get the created transaction
    let row = sqlx::query(
        "SELECT id, shift_id, transaction_type, amount, reason, user_id, created_at
         FROM cash_drawer_transactions WHERE id = ?1"
    )
    .bind(transaction_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created transaction: {}", e))?;

    let transaction = CashDrawerTransaction {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        shift_id: row.try_get("shift_id").map_err(|e| e.to_string())?,
        transaction_type: row.try_get("transaction_type").map_err(|e| e.to_string())?,
        amount: row.try_get("amount").map_err(|e| e.to_string())?,
        reason: row.try_get("reason").ok().flatten(),
        user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    Ok(transaction)
}

#[command]
pub async fn get_transactions(
    pool: State<'_, SqlitePool>,
    shift_id: Option<i64>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<CashDrawerTransaction>, String> {
    let pool_ref = pool.inner();
    
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    
    let query = if let Some(_sid) = shift_id {
        "SELECT id, shift_id, transaction_type, amount, reason, user_id, created_at
         FROM cash_drawer_transactions WHERE shift_id = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
    } else {
        "SELECT id, shift_id, transaction_type, amount, reason, user_id, created_at
         FROM cash_drawer_transactions ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
    };

    let rows = if let Some(sid) = shift_id {
        sqlx::query(query)
            .bind(sid)
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

    let mut transactions = Vec::new();
    for row in rows {
        let transaction = CashDrawerTransaction {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            shift_id: row.try_get("shift_id").map_err(|e| e.to_string())?,
            transaction_type: row.try_get("transaction_type").map_err(|e| e.to_string())?,
            amount: row.try_get("amount").map_err(|e| e.to_string())?,
            reason: row.try_get("reason").ok().flatten(),
            user_id: row.try_get("user_id").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        transactions.push(transaction);
    }

    Ok(transactions)
}

#[command]
pub async fn get_cash_drawer_balance(
    pool: State<'_, SqlitePool>,
    shift_id: i64,
) -> Result<f64, String> {
    let pool_ref = pool.inner();
    
    // Get shift opening amount
    let shift = sqlx::query(
        "SELECT opening_amount FROM shifts WHERE id = ?1"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch shift: {}", e))?;

    let opening_amount: f64 = shift.try_get("opening_amount").map_err(|e| e.to_string())?;
    
    // Calculate net cash flow from transactions
    let cash_flow = sqlx::query(
        "SELECT COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('opening', 'deposit') THEN amount
                WHEN transaction_type IN ('withdrawal', 'adjustment') THEN -amount
                ELSE 0
            END
        ), 0) as net_flow
         FROM cash_drawer_transactions WHERE shift_id = ?1"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to calculate cash flow: {}", e))?;

    let net_flow: f64 = cash_flow.try_get("net_flow").map_err(|e| e.to_string())?;
    
    // Calculate cash sales
    let cash_sales = sqlx::query(
        "SELECT COALESCE(SUM(total_amount), 0) as total_cash_sales
         FROM sales WHERE shift_id = ?1 AND payment_method = 'Cash' AND is_voided = 0"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to calculate cash sales: {}", e))?;

    let total_cash_sales: f64 = cash_sales.try_get("total_cash_sales").map_err(|e| e.to_string())?;
    
    // Calculate cash returns/refunds
    let cash_returns = sqlx::query(
        "SELECT COALESCE(SUM(total_amount), 0) as total_cash_returns
         FROM returns WHERE shift_id = ?1 AND refund_method = 'Cash'"
    )
    .bind(shift_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to calculate cash returns: {}", e))?;

    let total_cash_returns: f64 = cash_returns.try_get("total_cash_returns").map_err(|e| e.to_string())?;
    
    // Final balance = opening + net flow + cash sales - cash returns
    let balance = opening_amount + net_flow + total_cash_sales - total_cash_returns;
    
    Ok(balance)
}
