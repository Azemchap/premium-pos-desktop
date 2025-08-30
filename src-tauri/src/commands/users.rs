use crate::models::{CreateUserRequest, User};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[tauri::command]
pub async fn get_users(pool: State<'_, SqlitePool>) -> Result<Vec<User>, String> {
    let rows = sqlx::query("SELECT * FROM users WHERE is_active = 1 ORDER BY username")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut users = Vec::new();
    for row in rows {
        let user = User {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            username: row.try_get("username").map_err(|e| e.to_string())?,
            email: row.try_get("email").map_err(|e| e.to_string())?,
            first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
            last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
            role: row.try_get("role").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            last_login: row.try_get("last_login").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        users.push(user);
    }

    Ok(users)
}

#[tauri::command]
pub async fn create_user(
    pool: State<'_, SqlitePool>,
    request: CreateUserRequest,
) -> Result<User, String> {
    let user_id = sqlx::query(
        "INSERT INTO users (username, email, password, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&request.password)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.role)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let user = User {
        id: user_id,
        username: request.username,
        email: request.email,
        first_name: request.first_name,
        last_name: request.last_name,
        role: request.role,
        is_active: true,
        last_login: None,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(user)
}

#[tauri::command]
pub async fn update_user(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    request: CreateUserRequest,
) -> Result<User, String> {
    sqlx::query(
        "UPDATE users SET username = ?, email = ?, password = ?, first_name = ?, last_name = ?, role = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&request.password)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.role)
    .bind(chrono::Utc::now().naive_utc())
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let user = User {
        id: user_id,
        username: request.username,
        email: request.email,
        first_name: request.first_name,
        last_name: request.last_name,
        role: request.role,
        is_active: true,
        last_login: None,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(user)
}

#[tauri::command]
pub async fn delete_user(pool: State<'_, SqlitePool>, user_id: i64) -> Result<bool, String> {
    let result = sqlx::query("UPDATE users SET is_active = 0 WHERE id = ?")
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}
