use crate::models::{CreateUserRequest, LoginRequest, LoginResponse, User};
use crate::session::SESSION_MANAGER;
use crate::validation;
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};

#[command]
pub async fn login_user(
    pool: State<'_, SqlitePool>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
        "DEBUG(auth): login_user called username='{}'",
        request.username
    );
        "DEBUG(auth): received password length = {}",
        request.password.len()
    );

    // Validate input
    if let Err(e) = validation::validate_required(&request.username, "username") {
        return Err(e.message);
    }
    if let Err(e) = validation::validate_required(&request.password, "password") {
        return Err(e.message);
    }

    let pool_ref = pool.inner();

    // Check if user is rate-limited
    if SESSION_MANAGER.is_locked(&request.username) {
            "DEBUG(auth): user locked due to failed attempts: {}",
            request.username
        );
        return Err("Account temporarily locked due to multiple failed login attempts. Please try again later.".to_string());
    }

    // Try to find user by username first, then by email if username fails
    let row = sqlx::query(
        "SELECT id, username, email, password_hash, first_name, last_name, role, is_active, profile_image_url, last_login, created_at, updated_at
         FROM users WHERE (username = ?1 OR email = ?1) AND is_active = 1",
    )
    .bind(&request.username)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| {
        format!("Database error: {}", e)
    })?;

    let row = match row {
        Some(r) => r,
        None => {
            SESSION_MANAGER.record_failed_attempt(&request.username);
            return Err("Invalid username or password".to_string());
        }
    };

    let stored_hash: String = row.try_get("password_hash").map_err(|e| {
        e.to_string()
    })?;

    if !verify(&request.password, &stored_hash).map_err(|e| {
        format!("Password verification error: {}", e)
    })? {
        SESSION_MANAGER.record_failed_attempt(&request.username);
        return Err("Invalid username or password".to_string());
    }

    let id: i64 = row.try_get("id").map_err(|e| e.to_string())?;
    let username: String = row.try_get("username").map_err(|e| e.to_string())?;
    let role: String = row.try_get("role").map_err(|e| e.to_string())?;

    // Clear failed attempts on successful login
    SESSION_MANAGER.clear_failed_attempts(&username);

    // Update last_login (best-effort; non-fatal)
    if let Err(e) = sqlx::query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await
    {
    }

    let user = User {
        id,
        username: username.clone(),
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: role.clone(),
        is_active: {
            match row.try_get::<bool, _>("is_active") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                    v != 0
                }
            }
        },
        profile_image_url: row.try_get("profile_image_url").ok().flatten(),
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    // Create session with proper management
    let session_token = SESSION_MANAGER.create_session(id, username, role);
        "DEBUG(auth): login successful id={}, token created",
        user.id
    );

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
        "DEBUG(auth): register_user username='{}' email='{}'",
        request.username, request.email
    );

    // Validate inputs
    if let Err(e) = validation::validate_username(&request.username) {
        return Err(e.message);
    }
    if let Err(e) = validation::validate_email(&request.email) {
        return Err(e.message);
    }
    if let Err(e) = validation::validate_password_strength(&request.password) {
        return Err(e.message);
    }
    if let Err(e) = validation::validate_required(&request.first_name, "first_name") {
        return Err(e.message);
    }
    if let Err(e) = validation::validate_required(&request.last_name, "last_name") {
        return Err(e.message);
    }

    let pool_ref = pool.inner();

    // check existing
    let exists = sqlx::query("SELECT id FROM users WHERE username = ?1 OR email = ?2")
        .bind(&request.username)
        .bind(&request.email)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST).map_err(|e| {
        format!("Password hashing error: {}", e)
    })?;

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
    .map_err(|e| {
        format!("Failed to create user: {}", e)
    })?;

    let row = sqlx::query(
        "SELECT id, username, email, first_name, last_name, role, is_active, profile_image_url, last_login, created_at, updated_at
         FROM users WHERE username = ?1",
    )
    .bind(&request.username)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| {
        format!("Failed to fetch created user: {}", e)
    })?;

    let user = User {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        username: row.try_get("username").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: row.try_get("role").map_err(|e| e.to_string())?,
        is_active: {
            match row.try_get::<bool, _>("is_active") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                    v != 0
                }
            }
        },
        profile_image_url: row.try_get("profile_image_url").ok().flatten(),
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    Ok(user)
}

#[command]
pub async fn verify_session(session_token: String) -> Result<bool, String> {
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
        "DEBUG(auth): get_session_user token_len={}",
        session_token.len()
    );

    if session_token.is_empty() {
        return Ok(None);
    }

    Ok(SESSION_MANAGER.get_session(&session_token))
}
