use tauri::{command, State};
use bcrypt::{hash, verify, DEFAULT_COST};
use crate::models::{User, CreateUserRequest, UpdateProfileRequest, ChangePasswordRequest};
use sqlx::{SqlitePool, Row};

#[command]
pub async fn get_users(pool: State<'_, SqlitePool>) -> Result<Vec<User>, String> {
    println!("DEBUG(users): get_users called");
    let pool_ref = pool.inner();

    let rows = sqlx::query("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC")
        .fetch_all(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): query error: {}", e);
            format!("Database error: {}", e)
        })?;

    let mut users = Vec::with_capacity(rows.len());
    for row in rows {
        users.push(User {
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
            last_login: row.try_get("last_login").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    println!("DEBUG(users): returning {} users", users.len());
    Ok(users)
}

#[command]
pub async fn create_user(pool: State<'_, SqlitePool>, request: CreateUserRequest) -> Result<User, String> {
    println!("DEBUG(users): create_user username='{}'", request.username);
    let pool_ref = pool.inner();

    let exists = sqlx::query("SELECT id FROM users WHERE username = ?1 OR email = ?2")
        .bind(&request.username)
        .bind(&request.email)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): exists query error: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        println!("DEBUG(users): user exists");
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST).map_err(|e| {
        println!("DEBUG(users): hash error: {}", e);
        format!("Password hashing error: {}", e)
    })?;

    sqlx::query("INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
        .bind(&request.username)
        .bind(&request.email)
        .bind(&password_hash)
        .bind(&request.first_name)
        .bind(&request.last_name)
        .bind(&request.role)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): insert error: {}", e);
            format!("Failed to create user: {}", e)
        })?;

    let row = sqlx::query("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE username = ?1")
        .bind(&request.username)
        .fetch_one(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): fetch created user error: {}", e);
            format!("Failed to fetch created user: {}", e)
        })?;

    let user = User {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        username: row.try_get("username").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: row.try_get("role").map_err(|e| e.to_string())?,
        is_active: match row.try_get::<bool, _>("is_active") {
            Ok(b) => b,
            Err(_) => {
                let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                v != 0
            }
        },
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    println!("DEBUG(users): created user id={}", user.id);
    Ok(user)
}

#[command]
pub async fn update_user(pool: State<'_, SqlitePool>, user_id: i64, request: CreateUserRequest) -> Result<User, String> {
    println!("DEBUG(users): update_user id={}", user_id);
    let pool_ref = pool.inner();

    let exists = sqlx::query("SELECT id FROM users WHERE (username = ?1 OR email = ?2) AND id != ?3")
        .bind(&request.username)
        .bind(&request.email)
        .bind(user_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): exists query error: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        println!("DEBUG(users): username/email used by another");
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST).map_err(|e| {
        println!("DEBUG(users): hash error: {}", e);
        format!("Password hashing error: {}", e)
    })?;

    sqlx::query("UPDATE users SET username = ?1, email = ?2, password_hash = ?3, first_name = ?4, last_name = ?5, role = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?7")
        .bind(&request.username)
        .bind(&request.email)
        .bind(&password_hash)
        .bind(&request.first_name)
        .bind(&request.last_name)
        .bind(&request.role)
        .bind(user_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): update error: {}", e);
            format!("Failed to update user: {}", e)
        })?;

    let row = sqlx::query("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?1")
        .bind(user_id)
        .fetch_one(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): fetch updated user error: {}", e);
            format!("Failed to fetch updated user: {}", e)
        })?;

    let user = User {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        username: row.try_get("username").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: row.try_get("role").map_err(|e| e.to_string())?,
        is_active: match row.try_get::<bool, _>("is_active") {
            Ok(b) => b,
            Err(_) => {
                let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                v != 0
            }
        },
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    println!("DEBUG(users): updated user id={}", user.id);
    Ok(user)
}

#[command]
pub async fn delete_user(pool: State<'_, SqlitePool>, user_id: i64) -> Result<bool, String> {
    println!("DEBUG(users): delete_user id={}", user_id);
    let pool_ref = pool.inner();

    sqlx::query("UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1")
        .bind(user_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): deactivate error: {}", e);
            format!("Failed to deactivate user: {}", e)
        })?;

    println!("DEBUG(users): deactivated id={}", user_id);
    Ok(true)
}

#[command]
pub async fn update_user_profile(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    request: UpdateProfileRequest,
) -> Result<User, String> {
    println!("DEBUG(users): update_user_profile id={}", user_id);
    let pool_ref = pool.inner();

    // Check if email is already taken by another user
    let exists = sqlx::query("SELECT id FROM users WHERE email = ?1 AND id != ?2")
        .bind(&request.email)
        .bind(user_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): email check error: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        println!("DEBUG(users): email already in use");
        return Err("Email already in use by another account".to_string());
    }

    // Update user profile
    sqlx::query(
        "UPDATE users SET first_name = ?1, last_name = ?2, email = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4"
    )
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.email)
    .bind(user_id)
    .execute(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(users): update profile error: {}", e);
        format!("Failed to update profile: {}", e)
    })?;

    // Fetch and return updated user
    let row = sqlx::query(
        "SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?1"
    )
    .bind(user_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(users): fetch updated user error: {}", e);
        format!("Failed to fetch updated user: {}", e)
    })?;

    let user = User {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        username: row.try_get("username").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
        last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
        role: row.try_get("role").map_err(|e| e.to_string())?,
        is_active: match row.try_get::<bool, _>("is_active") {
            Ok(b) => b,
            Err(_) => {
                let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                v != 0
            }
        },
        last_login: row.try_get("last_login").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    println!("DEBUG(users): profile updated successfully");
    Ok(user)
}

#[command]
pub async fn change_user_password(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    request: ChangePasswordRequest,
) -> Result<bool, String> {
    println!("DEBUG(users): change_user_password id={}", user_id);
    let pool_ref = pool.inner();

    // Get current password hash
    let current_hash: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE id = ?1")
        .bind(user_id)
        .fetch_one(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): fetch password error: {}", e);
            format!("User not found: {}", e)
        })?;

    // Verify current password
    let is_valid = verify(&request.current_password, &current_hash).map_err(|e| {
        println!("DEBUG(users): password verification error: {}", e);
        format!("Password verification failed: {}", e)
    })?;

    if !is_valid {
        println!("DEBUG(users): current password incorrect");
        return Err("Current password is incorrect".to_string());
    }

    // Hash new password
    let new_hash = hash(&request.new_password, DEFAULT_COST).map_err(|e| {
        println!("DEBUG(users): hash error: {}", e);
        format!("Password hashing error: {}", e)
    })?;

    // Update password
    sqlx::query("UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
        .bind(&new_hash)
        .bind(user_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(users): update password error: {}", e);
            format!("Failed to update password: {}", e)
        })?;

    println!("DEBUG(users): password changed successfully");
    Ok(true)
}