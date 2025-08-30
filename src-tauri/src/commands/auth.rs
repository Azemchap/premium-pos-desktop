use crate::models::{CreateUserRequest, LoginRequest, LoginResponse, User};
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};
use uuid::Uuid;

#[tauri::command]
pub async fn register_user(
    pool: State<'_, SqlitePool>,
    request: CreateUserRequest,
) -> Result<User, String> {
    // Check if username already exists
    let existing_user = sqlx::query("SELECT id FROM users WHERE username = ?")
        .bind(&request.username)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if existing_user.is_some() {
        return Err("Username already exists".to_string());
    }

    // Hash password
    let hashed_password = hash(&request.password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    // Create user
    let user_id = sqlx::query(
        "INSERT INTO users (username, email, password, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&hashed_password)
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
pub async fn login_user(
    pool: State<'_, SqlitePool>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    let row = sqlx::query("SELECT * FROM users WHERE username = ? AND is_active = 1")
        .bind(&request.username)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let stored_hash: String = row.try_get("password").map_err(|e| e.to_string())?;

        if verify(&request.password, &stored_hash).map_err(|e| e.to_string())? {
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

            // Generate session token
            let session_token = Uuid::new_v4().to_string();

            // Update last login
            sqlx::query("UPDATE users SET last_login = ? WHERE id = ?")
                .bind(chrono::Utc::now().naive_utc())
                .bind(user.id)
                .execute(pool.inner())
                .await
                .map_err(|e| e.to_string())?;

            Ok(LoginResponse {
                user,
                session_token,
            })
        } else {
            Err("Invalid password".to_string())
        }
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
pub async fn verify_session(
    pool: State<'_, SqlitePool>,
    session_token: String,
) -> Result<Option<User>, String> {
    // In a real application, you would store and validate session tokens
    // For now, we'll just return None to indicate invalid session
    Ok(None)
}
