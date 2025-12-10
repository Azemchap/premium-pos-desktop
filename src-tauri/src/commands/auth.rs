use crate::models::{CreateUserRequest, LoginRequest, LoginResponse, User};
use crate::session::SESSION_MANAGER;
use crate::validation;
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

const GENERIC_AUTH_ERROR: &str = "Invalid username or password";
const ACCOUNT_LOCKED_ERROR: &str = "Account temporarily locked due to multiple failed login attempts. Please try again later.";

#[command]
pub async fn login_user(
    pool: State<'_, SqlitePool>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    // Validate input
    validation::validate_required(&request.username, "username")
        .map_err(|e| e.message)?;
    validation::validate_required(&request.password, "password")
        .map_err(|e| e.message)?;

    let pool_ref = pool.inner();

    // Check if user is rate-limited
    if SESSION_MANAGER.is_locked(&request.username) {
        return Err(ACCOUNT_LOCKED_ERROR.to_string());
    }

    // Fetch user by username or email
    let row = sqlx::query(
        "SELECT id, username, email, password_hash, first_name, last_name, role, 
                is_active, profile_image_url, last_login, created_at, updated_at
         FROM users 
         WHERE (username = ?1 OR email = ?1) AND is_active = 1",
    )
    .bind(&request.username)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    // Handle user not found
    let row = match row {
        Some(r) => r,
        None => {
            SESSION_MANAGER.record_failed_attempt(&request.username);
            return Err(GENERIC_AUTH_ERROR.to_string());
        }
    };

    // Verify password
    let stored_hash: String = row
        .try_get("password_hash")
        .map_err(|e| format!("Failed to get password hash: {}", e))?;

    let password_valid = verify(&request.password, &stored_hash)
        .map_err(|e| format!("Password verification error: {}", e))?;

    if !password_valid {
        SESSION_MANAGER.record_failed_attempt(&request.username);
        return Err(GENERIC_AUTH_ERROR.to_string());
    }

    // Extract user data
    let id: i64 = row.try_get("id").map_err(|e| e.to_string())?;
    let username: String = row.try_get("username").map_err(|e| e.to_string())?;
    let role: String = row.try_get("role").map_err(|e| e.to_string())?;

    // Clear failed attempts on successful login
    SESSION_MANAGER.clear_failed_attempts(&username);

    // Update last_login timestamp (best-effort, non-fatal)
    let _ = sqlx::query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await;

    // Build user object
    let user = User {
        id,
        username: username.clone(),
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: role.clone(),
        is_active: parse_boolean_field(&row, "is_active")?,
        profile_image_url: row.try_get("profile_image_url").ok().flatten(),
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    // Create session
    let session_token = SESSION_MANAGER.create_session(id, username, role);

    Ok(LoginResponse {
        user,
        session_token,
    })
}

#[command]
pub async fn register_user(
    pool: State<'_, SqlitePool>,
    request: CreateUserRequest,
) -> Result<User, String> {
    // Validate all inputs
    validation::validate_username(&request.username)
        .map_err(|e| e.message)?;
    validation::validate_email(&request.email)
        .map_err(|e| e.message)?;
    validation::validate_password_strength(&request.password)
        .map_err(|e| e.message)?;
    validation::validate_required(&request.first_name, "first_name")
        .map_err(|e| e.message)?;
    validation::validate_required(&request.last_name, "last_name")
        .map_err(|e| e.message)?;

    let pool_ref = pool.inner();

    // Check if username or email already exists
    let exists = sqlx::query("SELECT id FROM users WHERE username = ?1 OR email = ?2")
        .bind(&request.username)
        .bind(&request.email)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if exists.is_some() {
        return Err("Username or email already exists".to_string());
    }

    // Hash password
    let password_hash = hash(request.password, DEFAULT_COST)
        .map_err(|e| format!("Password hashing error: {}", e))?;

    // Insert new user
    sqlx::query(
        "INSERT INTO users (username, email, password_hash, first_name, last_name, role)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&password_hash)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.role)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create user: {}", e))?;

    // Fetch and return the created user
    let row = sqlx::query(
        "SELECT id, username, email, first_name, last_name, role, is_active, 
                profile_image_url, last_login, created_at, updated_at
         FROM users 
         WHERE username = ?1",
    )
    .bind(&request.username)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created user: {}", e))?;

    build_user_from_row(row)
}

#[command]
pub async fn verify_session(session_token: String) -> Result<bool, String> {
    #[cfg(debug_assertions)]
    println!(
        "DEBUG(auth): verify_session token_len={}",
        session_token.len()
    );

    if session_token.is_empty() {
        return Ok(false);
    }

    Ok(SESSION_MANAGER.validate_session(&session_token).is_ok())
}

#[command]
pub async fn logout_user(session_token: String) -> Result<(), String> {
    if !session_token.is_empty() {
        SESSION_MANAGER.remove_session(&session_token);
    }

    Ok(())
}

#[command]
pub async fn get_session_user(
    session_token: String,
) -> Result<Option<(i64, String, String)>, String> {
    #[cfg(debug_assertions)]
    println!(
        "DEBUG(auth): get_session_user token_len={}",
        session_token.len()
    );

    if session_token.is_empty() {
        return Ok(None);
    }

    Ok(SESSION_MANAGER.get_session(&session_token))
}

// Helper functions

/// Parse boolean field that might be stored as bool or integer
fn parse_boolean_field(row: &sqlx::sqlite::SqliteRow, field_name: &str) -> Result<bool, String> {
    match row.try_get::<bool, _>(field_name) {
        Ok(b) => Ok(b),
        Err(_) => {
            let v: i64 = row
                .try_get(field_name)
                .map_err(|e| format!("Failed to parse {} as boolean: {}", field_name, e))?;
            Ok(v != 0)
        }
    }
}

/// Build User struct from database row
fn build_user_from_row(row: sqlx::sqlite::SqliteRow) -> Result<User, String> {
    Ok(User {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        username: row.try_get("username").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: row.try_get("role").map_err(|e| e.to_string())?,
        is_active: parse_boolean_field(&row, "is_active")?,
        profile_image_url: row.try_get("profile_image_url").ok().flatten(),
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    })
}