use tauri::{command, State};
use crate::models::{Expense, CreateExpenseRequest, UpdateExpenseRequest};
use sqlx::{SqlitePool, Row};

// Generate unique expense number
async fn generate_expense_number(pool: &SqlitePool) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM expenses")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;
    Ok(format!("EXP{:06}", count + 1))
}

#[command]
pub async fn get_expenses(pool: State<'_, SqlitePool>, status: Option<String>) -> Result<Vec<Expense>, String> {
    let pool_ref = pool.inner();
    let mut query = "SELECT * FROM expenses WHERE 1=1".to_string();
    if let Some(s) = &status {
        query.push_str(&format!(" AND status = '{}'", s));
    }
    query.push_str(" ORDER BY expense_date DESC");

    let rows = sqlx::query(&query).fetch_all(pool_ref).await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut expenses = Vec::new();
    for row in rows {
        expenses.push(Expense {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            expense_number: row.try_get("expense_number").map_err(|e| e.to_string())?,
            category_id: row.try_get("category_id").ok(),
            vendor: row.try_get("vendor").ok(),
            description: row.try_get("description").map_err(|e| e.to_string())?,
            amount: row.try_get("amount").map_err(|e| e.to_string())?,
            expense_date: row.try_get("expense_date").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            reference_number: row.try_get("reference_number").ok(),
            receipt_url: row.try_get("receipt_url").ok(),
            is_recurring: match row.try_get::<bool, _>("is_recurring") {
                Ok(b) => b,
                Err(_) => { let v: i64 = row.try_get("is_recurring").map_err(|e| e.to_string())?; v != 0 }
            },
            recurring_frequency: row.try_get("recurring_frequency").ok(),
            tags: row.try_get("tags").ok(),
            notes: row.try_get("notes").ok(),
            status: row.try_get("status").map_err(|e| e.to_string())?,
            approved_by: row.try_get("approved_by").ok(),
            approved_at: row.try_get("approved_at").ok(),
            created_by: row.try_get("created_by").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }
    Ok(expenses)
}

#[command]
pub async fn create_expense(pool: State<'_, SqlitePool>, request: CreateExpenseRequest, user_id: i64) -> Result<Expense, String> {
    let pool_ref = pool.inner();
    let expense_number = generate_expense_number(pool_ref).await?;

    let result = sqlx::query(
        "INSERT INTO expenses (expense_number, category_id, vendor, description, amount, expense_date,
         payment_method, reference_number, is_recurring, recurring_frequency, tags, notes, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
    )
        .bind(&expense_number)
        .bind(&request.category_id)
        .bind(&request.vendor)
        .bind(&request.description)
        .bind(&request.amount)
        .bind(&request.expense_date)
        .bind(&request.payment_method)
        .bind(&request.reference_number)
        .bind(request.is_recurring.unwrap_or(false))
        .bind(&request.recurring_frequency)
        .bind(&request.tags)
        .bind(&request.notes)
        .bind(user_id)
        .execute(pool_ref).await
        .map_err(|e| format!("Database error: {}", e))?;

    get_expense(pool, result.last_insert_rowid()).await
}

#[command]
pub async fn get_expense(pool: State<'_, SqlitePool>, expense_id: i64) -> Result<Expense, String> {
    let pool_ref = pool.inner();
    let row = sqlx::query("SELECT * FROM expenses WHERE id = ?1")
        .bind(expense_id).fetch_optional(pool_ref).await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or("Expense not found".to_string())?;

    Ok(Expense {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        expense_number: row.try_get("expense_number").map_err(|e| e.to_string())?,
        category_id: row.try_get("category_id").ok(),
        vendor: row.try_get("vendor").ok(),
        description: row.try_get("description").map_err(|e| e.to_string())?,
        amount: row.try_get("amount").map_err(|e| e.to_string())?,
        expense_date: row.try_get("expense_date").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
        reference_number: row.try_get("reference_number").ok(),
        receipt_url: row.try_get("receipt_url").ok(),
        is_recurring: match row.try_get::<bool, _>("is_recurring") {
            Ok(b) => b,
            Err(_) => { let v: i64 = row.try_get("is_recurring").map_err(|e| e.to_string())?; v != 0 }
        },
        recurring_frequency: row.try_get("recurring_frequency").ok(),
        tags: row.try_get("tags").ok(),
        notes: row.try_get("notes").ok(),
        status: row.try_get("status").map_err(|e| e.to_string())?,
        approved_by: row.try_get("approved_by").ok(),
        approved_at: row.try_get("approved_at").ok(),
        created_by: row.try_get("created_by").ok(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    })
}

#[command]
pub async fn update_expense(pool: State<'_, SqlitePool>, expense_id: i64, request: UpdateExpenseRequest) -> Result<Expense, String> {
    let pool_ref = pool.inner();

    let mut updates = Vec::new();
    let mut query_builder = sqlx::query("SELECT 1");

    if request.description.is_some() { updates.push("description = ?"); }
    if request.amount.is_some() { updates.push("amount = ?"); }
    if request.expense_date.is_some() { updates.push("expense_date = ?"); }
    if request.payment_method.is_some() { updates.push("payment_method = ?"); }
    if request.vendor.is_some() { updates.push("vendor = ?"); }
    if request.status.is_some() { updates.push("status = ?"); }
    if request.notes.is_some() { updates.push("notes = ?"); }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query_str = format!("UPDATE expenses SET {} WHERE id = ?", updates.join(", "));
    let mut q = sqlx::query(&query_str);

    if let Some(v) = &request.description { q = q.bind(v); }
    if let Some(v) = request.amount { q = q.bind(v); }
    if let Some(v) = &request.expense_date { q = q.bind(v); }
    if let Some(v) = &request.payment_method { q = q.bind(v); }
    if let Some(v) = &request.vendor { q = q.bind(v); }
    if let Some(v) = &request.status { q = q.bind(v); }
    if let Some(v) = &request.notes { q = q.bind(v); }
    q = q.bind(expense_id);

    q.execute(pool_ref).await.map_err(|e| format!("Database error: {}", e))?;
    get_expense(pool, expense_id).await
}

#[command]
pub async fn delete_expense(pool: State<'_, SqlitePool>, expense_id: i64) -> Result<String, String> {
    let pool_ref = pool.inner();
    let result = sqlx::query("DELETE FROM expenses WHERE id = ?1")
        .bind(expense_id).execute(pool_ref).await
        .map_err(|e| format!("Database error: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Expense not found".to_string());
    }
    Ok("Expense deleted successfully".to_string())
}
