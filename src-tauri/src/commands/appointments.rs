// src-tauri/src/commands/appointments.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_appointments(
    pool: State<'_, SqlitePool>,
    status: Option<String>,
    employee_id: Option<i64>,
    customer_id: Option<i64>,
) -> Result<Vec<Appointment>, String> {
    let mut query = "SELECT * FROM appointments WHERE 1=1".to_string();

    if status.is_some() {
        query.push_str(" AND status = ?");
    }
    if employee_id.is_some() {
        query.push_str(" AND employee_id = ?");
    }
    if customer_id.is_some() {
        query.push_str(" AND customer_id = ?");
    }
    query.push_str(" ORDER BY appointment_date DESC, start_time DESC");

    let mut q = sqlx::query_as::<_, Appointment>(&query);

    if let Some(s) = status {
        q = q.bind(s);
    }
    if let Some(emp_id) = employee_id {
        q = q.bind(emp_id);
    }
    if let Some(cust_id) = customer_id {
        q = q.bind(cust_id);
    }

    let appointments = q
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch appointments: {}", e))?;

    Ok(appointments)
}

#[tauri::command]
pub async fn get_appointment(
    pool: State<'_, SqlitePool>,
    appointment_id: i64,
) -> Result<Appointment, String> {
    let appointment = sqlx::query_as::<_, Appointment>("SELECT * FROM appointments WHERE id = ?")
        .bind(appointment_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch appointment: {}", e))?;

    Ok(appointment)
}

#[tauri::command]
pub async fn create_appointment(
    pool: State<'_, SqlitePool>,
    request: CreateAppointmentRequest,
    user_id: i64,
) -> Result<Appointment, String> {
    // Generate appointment number
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM appointments")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to count appointments: {}", e))?;

    let appointment_number = format!("APT{:05}", count + 1);

    let result = sqlx::query(
        "INSERT INTO appointments (
            appointment_number, customer_id, service_id, employee_id,
            appointment_date, start_time, end_time, duration_minutes,
            status, price, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&appointment_number)
    .bind(&request.customer_id)
    .bind(&request.service_id)
    .bind(&request.employee_id)
    .bind(&request.appointment_date)
    .bind(&request.start_time)
    .bind(&request.end_time)
    .bind(&request.duration_minutes)
    .bind(&request.status)
    .bind(&request.price)
    .bind(&request.notes)
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create appointment: {}", e))?;

    let appointment_id = result.last_insert_rowid();
    get_appointment(pool, appointment_id).await
}

#[tauri::command]
pub async fn update_appointment(
    pool: State<'_, SqlitePool>,
    appointment_id: i64,
    request: UpdateAppointmentRequest,
) -> Result<Appointment, String> {
    sqlx::query(
        "UPDATE appointments SET
            customer_id = COALESCE(?, customer_id),
            service_id = COALESCE(?, service_id),
            employee_id = COALESCE(?, employee_id),
            appointment_date = COALESCE(?, appointment_date),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            duration_minutes = COALESCE(?, duration_minutes),
            status = COALESCE(?, status),
            price = COALESCE(?, price),
            notes = COALESCE(?, notes),
            reminder_sent = COALESCE(?, reminder_sent),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.customer_id)
    .bind(&request.service_id)
    .bind(&request.employee_id)
    .bind(&request.appointment_date)
    .bind(&request.start_time)
    .bind(&request.end_time)
    .bind(&request.duration_minutes)
    .bind(&request.status)
    .bind(&request.price)
    .bind(&request.notes)
    .bind(&request.reminder_sent)
    .bind(appointment_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update appointment: {}", e))?;

    get_appointment(pool, appointment_id).await
}

#[tauri::command]
pub async fn delete_appointment(
    pool: State<'_, SqlitePool>,
    appointment_id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM appointments WHERE id = ?")
        .bind(appointment_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete appointment: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_appointment(
    pool: State<'_, SqlitePool>,
    appointment_id: i64,
) -> Result<Appointment, String> {
    sqlx::query(
        "UPDATE appointments SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(appointment_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to cancel appointment: {}", e))?;

    get_appointment(pool, appointment_id).await
}
