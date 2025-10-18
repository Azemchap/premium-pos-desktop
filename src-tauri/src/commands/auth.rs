use tauri::{command, State};
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use crate::models::{LoginRequest, LoginResponse, User, CreateUserRequest};
use sqlx::{SqlitePool, Row};

#[command]
pub async fn login_user(pool: State<'_, SqlitePool>, request: LoginRequest) -> Result<LoginResponse, String> {
    println!("DEBUG(auth): login_user called username='{}'", request.username);
    println!("DEBUG(auth): received password length = {}", request.password.len());

    let pool_ref = pool.inner();
    
    // Try to find user by username first, then by email if username fails
    let row = sqlx::query(
        "SELECT id, username, email, password_hash, first_name, last_name, role, is_active, profile_image_url, last_login, created_at, updated_at
         FROM users WHERE (username = ?1 OR email = ?1) AND is_active = 1",
    )
    .bind(&request.username)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(auth): query error: {}", e);
        format!("Database error: {}", e)
    })?;

    let row = match row {
        Some(r) => r,
        None => {
            println!("DEBUG(auth): user not found/inactive: {}", request.username);
            return Err("Invalid username or password".to_string());
        }
    };

    let stored_hash: String = row.try_get("password_hash").map_err(|e| {
        println!("DEBUG(auth): try_get password_hash error: {}", e);
        e.to_string()
    })?;

    if !verify(&request.password, &stored_hash).map_err(|e| {
        println!("DEBUG(auth): bcrypt verify error: {}", e);
        format!("Password verification error: {}", e)
    })? {
        println!("DEBUG(auth): bad password for {}", request.username);
        return Err("Invalid username or password".to_string());
    }

    let id: i64 = row.try_get("id").map_err(|e| e.to_string())?;
    
    // Update last_login (best-effort; non-fatal)
    if let Err(e) = sqlx::query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await
    {
        println!("DEBUG(auth): failed to update last_login: {}", e);
    }

    let user = User {
        id,
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

    let session_token = Uuid::new_v4().to_string();
    println!("DEBUG(auth): login successful id={}", user.id);

    Ok(LoginResponse { user, session_token })
}

#[command]
pub async fn register_user(pool: State<'_, SqlitePool>, request: CreateUserRequest) -> Result<User, String> {
    println!("DEBUG(auth): register_user username='{}' email='{}'", request.username, request.email);

    let pool_ref = pool.inner();

    // check existing
    let exists = sqlx::query("SELECT id FROM users WHERE username = ?1 OR email = ?2")
        .bind(&request.username)
        .bind(&request.email)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(auth): exists query error: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        println!("DEBUG(auth): user exists");
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST).map_err(|e| {
        println!("DEBUG(auth): bcrypt hash error: {}", e);
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
        println!("DEBUG(auth): insert error: {}", e);
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
        println!("DEBUG(auth): fetch created user error: {}", e);
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

    println!("DEBUG(auth): register_user succeeded id={}", user.id);
    Ok(user)
}

#[command]
pub async fn verify_session(_session_token: String) -> Result<bool, String> {
    println!("DEBUG(auth): verify_session token_len={}", _session_token.len());
    Ok(!_session_token.is_empty())
}