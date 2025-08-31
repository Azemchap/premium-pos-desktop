use tauri::{command, State};
use crate::models::User;
use sqlx::{SqlitePool, Row};
use bcrypt::{hash, verify, DEFAULT_COST};

#[tauri::command]
pub async fn authenticate_user(
    pool: State<'_, SqlitePool>,
    username: &str,
    password: &str,
) -> Result<Option<User>, String> {
    let row = sqlx::query(
        "SELECT * FROM users WHERE username = ? AND is_active = 1"
    )
    .bind(username)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let stored_hash: String = row.try_get("password_hash").map_err(|e| e.to_string())?;
        
        if verify(password, &stored_hash).map_err(|e| e.to_string())? {
            let user = User {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                username: row.try_get("username").map_err(|e| e.to_string())?,
                email: row.try_get("email").map_err(|e| e.to_string())?,
                first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
                last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
                role: row.try_get("role").map_err(|e| e.to_string())?,
                pin_code: row.try_get("pin_code").map_err(|e| e.to_string())?,
                permissions: row.try_get("permissions").map_err(|e| e.to_string())?,
                is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
                last_login: row.try_get("last_login").ok().flatten(),
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            };
            Ok(Some(user))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn authenticate_with_pin(
    pool: State<'_, SqlitePool>,
    pin_code: &str,
) -> Result<Option<User>, String> {
    let row = sqlx::query(
        "SELECT * FROM users WHERE pin_code = ? AND is_active = 1"
    )
    .bind(pin_code)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let user = User {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            username: row.try_get("username").map_err(|e| e.to_string())?,
            email: row.try_get("email").map_err(|e| e.to_string())?,
            first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
            last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
            role: row.try_get("role").map_err(|e| e.to_string())?,
            pin_code: row.try_get("pin_code").map_err(|e| e.to_string())?,
            permissions: row.try_get("permissions").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            last_login: row.try_get("last_login").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        Ok(Some(user))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn update_last_login(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE users SET last_login = ? WHERE id = ?"
    )
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn change_password(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    current_password: &str,
    new_password: &str,
) -> Result<bool, String> {
    // First verify current password
    let row = sqlx::query(
        "SELECT password_hash FROM users WHERE id = ?"
    )
    .bind(user_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let stored_hash: String = row.try_get("password_hash").map_err(|e| e.to_string())?;
    
    if !verify(current_password, &stored_hash).map_err(|e| e.to_string())? {
        return Ok(false);
    }

    // Hash new password and update
    let new_hash = hash(new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    
    sqlx::query(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&new_hash)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn reset_password(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    new_password: &str,
) -> Result<(), String> {
    let new_hash = hash(new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    
    sqlx::query(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&new_hash)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
