use tauri::{command, AppHandle, State};
use tauri_plugin_sql::DbInstances;
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use crate::models::{LoginRequest, LoginResponse, User, CreateUserRequest};

#[command]
pub async fn login_user(
    app_handle: AppHandle,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .lock()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    let user_rows = db
        .select("SELECT id, username, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE username = $1 AND is_active = 1")
        .bind(&request.username)
        .fetch_all()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if user_rows.is_empty() {
        return Err("Invalid username or password".to_string());
    }

    let user_row = &user_rows[0];
    let stored_hash: String = user_row.get("password_hash").ok_or("Password hash not found")?;
    
    if !verify(&request.password, &stored_hash).map_err(|e| format!("Password verification error: {}", e))? {
        return Err("Invalid username or password".to_string());
    }

    // Update last login
    db.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1")
        .bind(user_row.get::<i64>("id").unwrap())
        .fetch_all()
        .await
        .map_err(|e| format!("Failed to update last login: {}", e))?;

    let user = User {
        id: user_row.get("id").unwrap(),
        username: user_row.get("username").unwrap(),
        email: user_row.get("email").unwrap(),
        first_name: user_row.get("first_name").unwrap(),
        last_name: user_row.get("last_name").unwrap(),
        role: user_row.get("role").unwrap(),
        is_active: user_row.get("is_active").unwrap(),
        last_login: user_row.get("last_login").unwrap(),
        created_at: user_row.get("created_at").unwrap(),
        updated_at: user_row.get("updated_at").unwrap(),
    };

    let session_token = Uuid::new_v4().to_string();

    Ok(LoginResponse {
        user,
        session_token,
    })
}

#[command]
pub async fn register_user(
    app_handle: AppHandle,
    request: CreateUserRequest,
) -> Result<User, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .lock()
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

    let result = db
        .execute(
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
pub async fn verify_session(session_token: String) -> Result<bool, String> {
    // In a real implementation, you'd validate against stored sessions
    // For now, just check if token is not empty
    Ok(!session_token.is_empty())
}