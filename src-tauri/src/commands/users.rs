use tauri::{command, AppHandle, Manager, State};
use tauri_plugin_sql::DbInstances;
use bcrypt::{hash, DEFAULT_COST};
use crate::models::{User, CreateUserRequest};

#[command]
pub async fn get_users(app_handle: AppHandle) -> Result<Vec<User>, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    let rows = db
        .select("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC")
        .fetch_all()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let users = rows.into_iter().map(|row| User {
        id: row.get("id").unwrap(),
        username: row.get("username").unwrap(),
        email: row.get("email").unwrap(),
        first_name: row.get("first_name").unwrap(),
        last_name: row.get("last_name").unwrap(),
        role: row.get("role").unwrap(),
        is_active: row.get("is_active").unwrap(),
        last_login: row.get("last_login"),
        created_at: row.get("created_at").unwrap(),
        updated_at: row.get("updated_at").unwrap(),
    }).collect();

    Ok(users)
}

#[command]
pub async fn create_user(
    app_handle: AppHandle,
    request: CreateUserRequest,
) -> Result<User, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    // Check if username or email already exists
    let existing_user = db
        .select("SELECT id FROM users WHERE username = $1 OR email = $2")
        .bind(&request.username)
        .bind(&request.email)
        .fetch_all()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if !existing_user.is_empty() {
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST)
        .map_err(|e| format!("Password hashing error: {}", e))?;

    let _result = db.execute(
        "INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&password_hash)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.role)
    .fetch_all()
    .await
    .map_err(|e| format!("Failed to create user: {}", e))?;

    // Get the created user
    let user_rows = db
        .select("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE username = $1")
        .bind(&request.username)
        .fetch_all()
        .await
        .map_err(|e| format!("Failed to fetch created user: {}", e))?;

    let user_row = &user_rows[0];

    Ok(User {
        id: user_row.get("id").unwrap(),
        username: user_row.get("username").unwrap(),
        email: user_row.get("email").unwrap(),
        first_name: user_row.get("first_name").unwrap(),
        last_name: user_row.get("last_name").unwrap(),
        role: user_row.get("role").unwrap(),
        is_active: user_row.get("is_active").unwrap(),
        last_login: user_row.get("last_login"),
        created_at: user_row.get("created_at").unwrap(),
        updated_at: user_row.get("updated_at").unwrap(),
    })
}

#[command]
pub async fn update_user(
    app_handle: AppHandle,
    user_id: i64,
    request: CreateUserRequest,
) -> Result<User, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    // Check if username or email already exists for other users
    let existing_user = db
        .select("SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3")
        .bind(&request.username)
        .bind(&request.email)
        .bind(&user_id)
        .fetch_all()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if !existing_user.is_empty() {
        return Err("Username or email already exists".to_string());
    }

    let password_hash = hash(request.password, DEFAULT_COST)
        .map_err(|e| format!("Password hashing error: {}", e))?;

    let _result = db.execute(
        "UPDATE users SET username = $1, email = $2, password_hash = $3, first_name = $4, last_name = $5, role = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&password_hash)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&request.role)
    .bind(&user_id)
    .fetch_all()
    .await
    .map_err(|e| format!("Failed to update user: {}", e))?;

    // Get the updated user
    let user_rows = db
        .select("SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1")
        .bind(&user_id)
        .fetch_all()
        .await
        .map_err(|e| format!("Failed to fetch updated user: {}", e))?;

    let user_row = &user_rows[0];

    Ok(User {
        id: user_row.get("id").unwrap(),
        username: user_row.get("username").unwrap(),
        email: user_row.get("email").unwrap(),
        first_name: user_row.get("first_name").unwrap(),
        last_name: user_row.get("last_name").unwrap(),
        role: user_row.get("role").unwrap(),
        is_active: user_row.get("is_active").unwrap(),
        last_login: user_row.get("last_login"),
        created_at: user_row.get("created_at").unwrap(),
        updated_at: user_row.get("updated_at").unwrap(),
    })
}

#[command]
pub async fn delete_user(app_handle: AppHandle, user_id: i64) -> Result<bool, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    let _result = db.execute("UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1")
        .bind(&user_id)
        .fetch_all()
        .await
        .map_err(|e| format!("Failed to deactivate user: {}", e))?;

    Ok(true)
}