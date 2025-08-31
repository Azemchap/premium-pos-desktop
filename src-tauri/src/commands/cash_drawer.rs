use tauri::{command, State};
use crate::models::{CashDrawerTransaction, CreateCashDrawerTransactionRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn add_cash_transaction(
    pool: State<'_, SqlitePool>,
    request: CreateCashDrawerTransactionRequest,
) -> Result<CashDrawerTransaction, String> {
    let transaction_id = sqlx::query(
        "INSERT INTO cash_drawer_transactions (shift_id, transaction_type, amount, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.shift_id)
    .bind(&request.transaction_type)
    .bind(request.amount)
    .bind(&request.reason)
    .bind(1) // Default user_id, should be passed from request
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let transaction = CashDrawerTransaction {
        id: transaction_id,
        shift_id: request.shift_id,
        transaction_type: request.transaction_type,
        amount: request.amount,
        reason: request.reason,
        user_id: 1, // Default user_id
        created_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(transaction)
}

#[tauri::command]
pub async fn get_cash_drawer_balance(
    pool: State<'_, SqlitePool>,
    shift_id: i64,
) -> Result<f64, String> {
    let shift_row = sqlx::query("SELECT opening_amount FROM shifts WHERE id = ?")
        .bind(shift_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let opening_amount: f64 = shift_row.try_get("opening_amount").map_err(|e| e.to_string())?;

    let transactions_result = sqlx::query(
        "SELECT SUM(CASE WHEN transaction_type = 'add' THEN amount ELSE -amount END) as net_change FROM cash_drawer_transactions WHERE shift_id = ?"
    )
    .bind(shift_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let net_change: f64 = transactions_result.try_get("net_change").map_err(|e| e.to_string()).unwrap_or(0.0);

    Ok(opening_amount + net_change)
}

#[tauri::command]
pub async fn get_transaction_history(
    pool: State<'_, SqlitePool>,
    shift_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<CashDrawerTransaction>, String> {
    let mut query = String::from("SELECT * FROM cash_drawer_transactions");
    let mut params: Vec<String> = Vec::new();

    if let Some(sid) = shift_id {
        query.push_str(" WHERE shift_id = ?");
        params.push(sid.to_string());
    }

    query.push_str(" ORDER BY created_at DESC");

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