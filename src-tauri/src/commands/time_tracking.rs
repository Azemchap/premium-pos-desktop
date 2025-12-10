// src-tauri/src/commands/time_tracking.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_time_entries(
    pool: State<'_, SqlitePool>,
    employee_id: Option<i64>,
    status: Option<String>,
) -> Result<Vec<TimeEntry>, String> {
    let mut query = "SELECT * FROM time_entries WHERE 1=1".to_string();

    if employee_id.is_some() {
        query.push_str(" AND employee_id = ?");
    }
    if status.is_some() {
        query.push_str(" AND status = ?");
    }
    query.push_str(" ORDER BY clock_in DESC");

    let mut q = sqlx::query_as::<_, TimeEntry>(&query);

    if let Some(emp_id) = employee_id {
        q = q.bind(emp_id);
    }
    if let Some(s) = status {
        q = q.bind(s);
    }

    let entries = q
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch time entries: {}", e))?;

    Ok(entries)
}

#[tauri::command]
pub async fn get_time_entry(
    pool: State<'_, SqlitePool>,
    entry_id: i64,
) -> Result<TimeEntry, String> {
    let entry = sqlx::query_as::<_, TimeEntry>("SELECT * FROM time_entries WHERE id = ?")
        .bind(entry_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch time entry: {}", e))?;

    Ok(entry)
}

#[tauri::command]
pub async fn clock_in(
    pool: State<'_, SqlitePool>,
    employee_id: i64,
    hourly_rate: f64,
) -> Result<TimeEntry, String> {
    // Check if employee has an active time entry
    let active_entry: Option<TimeEntry> = sqlx::query_as::<_, TimeEntry>(
        "SELECT * FROM time_entries WHERE employee_id = ? AND status = 'Active' LIMIT 1"
    )
    .bind(employee_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| format!("Failed to check active entries: {}", e))?;

    if active_entry.is_some() {
        return Err("Employee already has an active time entry".to_string());
    }

    // Create new time entry
    let result = sqlx::query(
        "INSERT INTO time_entries (employee_id, clock_in, hourly_rate, status)
         VALUES (?, CURRENT_TIMESTAMP, ?, 'Active')",
    )
    .bind(employee_id)
    .bind(hourly_rate)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to clock in: {}", e))?;

    let entry_id = result.last_insert_rowid();
    get_time_entry(pool, entry_id).await
}

#[tauri::command]
pub async fn clock_out(
    pool: State<'_, SqlitePool>,
    entry_id: i64,
    break_minutes: Option<i32>,
) -> Result<TimeEntry, String> {
    // Calculate total hours and pay
    let break_min = break_minutes.unwrap_or(0);

    sqlx::query(
        "UPDATE time_entries SET
            clock_out = CURRENT_TIMESTAMP,
            break_minutes = ?,
            total_hours = ROUND((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(clock_in)) * 24 - ? / 60.0, 2),
            total_pay = ROUND((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(clock_in)) * 24 - ? / 60.0, 2) * hourly_rate,
            status = 'Completed'
         WHERE id = ?",
    )
    .bind(break_min)
    .bind(break_min as f64)
    .bind(break_min as f64)
    .bind(entry_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to clock out: {}", e))?;

    get_time_entry(pool, entry_id).await
}

#[tauri::command]
pub async fn update_time_entry(
    pool: State<'_, SqlitePool>,
    entry_id: i64,
    request: UpdateTimeEntryRequest,
) -> Result<TimeEntry, String> {
    sqlx::query(
        "UPDATE time_entries SET
            clock_in = COALESCE(?, clock_in),
            clock_out = COALESCE(?, clock_out),
            break_minutes = COALESCE(?, break_minutes),
            notes = COALESCE(?, notes),
            status = COALESCE(?, status),
            approved_by = COALESCE(?, approved_by),
            approved_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE approved_at END
         WHERE id = ?",
    )
    .bind(&request.clock_in)
    .bind(&request.clock_out)
    .bind(&request.break_minutes)
    .bind(&request.notes)
    .bind(&request.status)
    .bind(&request.approved_by)
    .bind(&request.approved_by)
    .bind(entry_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update time entry: {}", e))?;

    // Recalculate total_hours and total_pay if clock times were updated
    if request.clock_in.is_some() || request.clock_out.is_some() || request.break_minutes.is_some() {
        sqlx::query(
            "UPDATE time_entries SET
                total_hours = CASE
                    WHEN clock_out IS NOT NULL THEN
                        ROUND((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24 - COALESCE(break_minutes, 0) / 60.0, 2)
                    ELSE 0
                END,
                total_pay = CASE
                    WHEN clock_out IS NOT NULL THEN
                        ROUND((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24 - COALESCE(break_minutes, 0) / 60.0, 2) * hourly_rate
                    ELSE 0
                END
             WHERE id = ?"
        )
        .bind(entry_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to recalculate time entry: {}", e))?;
    }

    get_time_entry(pool, entry_id).await
}

#[tauri::command]
pub async fn delete_time_entry(
    pool: State<'_, SqlitePool>,
    entry_id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM time_entries WHERE id = ?")
        .bind(entry_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete time entry: {}", e))?;

    Ok(())
}
