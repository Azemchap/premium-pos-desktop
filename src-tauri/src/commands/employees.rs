// src-tauri/src/commands/employees.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_employees(
    pool: State<'_, SqlitePool>,
    is_active: Option<bool>,
) -> Result<Vec<Employee>, String> {
    let query = if let Some(active) = is_active {
        format!(
            "SELECT e.*, u.username, u.first_name, u.last_name, u.email, u.phone
             FROM employees e
             JOIN users u ON e.user_id = u.id
             WHERE e.is_active = {}
             ORDER BY e.created_at DESC",
            if active { 1 } else { 0 }
        )
    } else {
        "SELECT e.*, u.username, u.first_name, u.last_name, u.email, u.phone
         FROM employees e
         JOIN users u ON e.user_id = u.id
         ORDER BY e.created_at DESC"
            .to_string()
    };

    let employees = sqlx::query_as::<_, Employee>(&query)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch employees: {}", e))?;

    Ok(employees)
}

#[tauri::command]
pub async fn get_employee(
    pool: State<'_, SqlitePool>,
    employee_id: i64,
) -> Result<Employee, String> {
    let employee = sqlx::query_as::<_, Employee>(
        "SELECT e.*, u.username, u.first_name, u.last_name, u.email, u.phone
         FROM employees e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = ?",
    )
    .bind(employee_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch employee: {}", e))?;

    Ok(employee)
}

#[tauri::command]
pub async fn create_employee(
    pool: State<'_, SqlitePool>,
    request: CreateEmployeeRequest,
) -> Result<Employee, String> {
    // Generate employee number
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to count employees: {}", e))?;

    let employee_number = format!("EMP{:05}", count + 1);

    // Insert employee
    let result = sqlx::query(
        "INSERT INTO employees (
            user_id, employee_number, department, position, hire_date,
            employment_type, salary_type, hourly_rate, salary, commission_rate,
            emergency_contact_name, emergency_contact_phone, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&request.user_id)
    .bind(&employee_number)
    .bind(&request.department)
    .bind(&request.position)
    .bind(&request.hire_date)
    .bind(&request.employment_type)
    .bind(&request.salary_type)
    .bind(&request.hourly_rate)
    .bind(&request.salary)
    .bind(&request.commission_rate)
    .bind(&request.emergency_contact_name)
    .bind(&request.emergency_contact_phone)
    .bind(&request.notes)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create employee: {}", e))?;

    let employee_id = result.last_insert_rowid();

    // Fetch and return the created employee
    get_employee(pool, employee_id).await
}

#[tauri::command]
pub async fn update_employee(
    pool: State<'_, SqlitePool>,
    employee_id: i64,
    request: UpdateEmployeeRequest,
) -> Result<Employee, String> {
    sqlx::query(
        "UPDATE employees SET
            department = COALESCE(?, department),
            position = COALESCE(?, position),
            hire_date = COALESCE(?, hire_date),
            employment_type = COALESCE(?, employment_type),
            salary_type = COALESCE(?, salary_type),
            hourly_rate = COALESCE(?, hourly_rate),
            salary = COALESCE(?, salary),
            commission_rate = COALESCE(?, commission_rate),
            emergency_contact_name = COALESCE(?, emergency_contact_name),
            emergency_contact_phone = COALESCE(?, emergency_contact_phone),
            notes = COALESCE(?, notes),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.department)
    .bind(&request.position)
    .bind(&request.hire_date)
    .bind(&request.employment_type)
    .bind(&request.salary_type)
    .bind(&request.hourly_rate)
    .bind(&request.salary)
    .bind(&request.commission_rate)
    .bind(&request.emergency_contact_name)
    .bind(&request.emergency_contact_phone)
    .bind(&request.notes)
    .bind(&request.is_active)
    .bind(employee_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update employee: {}", e))?;

    get_employee(pool, employee_id).await
}

#[tauri::command]
pub async fn delete_employee(
    pool: State<'_, SqlitePool>,
    employee_id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM employees WHERE id = ?")
        .bind(employee_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete employee: {}", e))?;

    Ok(())
}
