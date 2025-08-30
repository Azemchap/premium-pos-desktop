// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::debug;
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use std::path::PathBuf;

mod commands;
mod database;
mod models;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    debug!("Starting Premium POS application...");

    // Initialize database
    let db_path = initialize_database().await?;
    debug!("Database initialized at: {:?}", db_path);

    // Create SQLite connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&format!("sqlite://{}", db_path.display()))
        .await?;
    debug!("Database connection pool created");

    // Run migrations
    run_migrations(&pool).await?;
    debug!("Database migrations completed");

    // Ensure admin user exists
    ensure_admin_user(&pool).await?;
    debug!("Admin user ensured");

    // Build Tauri application
    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            commands::users::get_users,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::products::get_products,
            commands::products::get_product_by_id,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::search_products,
            commands::inventory::get_inventory,
            commands::inventory::get_inventory_by_product_id,
            commands::inventory::update_stock,
            commands::inventory::create_stock_adjustment,
            commands::inventory::get_stock_movements,
            commands::sales::create_sale,
            commands::sales::get_sales,
            commands::sales::get_sale_by_id,
            commands::sales::process_return,
            commands::shifts::open_shift,
            commands::shifts::close_shift,
            commands::shifts::get_current_shift,
            commands::shifts::get_shift_history,
            commands::cash_drawer::add_cash_transaction,
            commands::cash_drawer::get_cash_drawer_balance,
            commands::cash_drawer::get_transaction_history,
            commands::receipts::get_receipt_templates,
            commands::receipts::create_receipt_template,
            commands::receipts::update_receipt_template,
            commands::receipts::delete_receipt_template,
            commands::receipts::get_default_template,
            commands::store::get_store_config,
            commands::store::update_store_config,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_recent_sales,
            commands::dashboard::get_top_products,
            commands::auth::authenticate_user,
            commands::auth::authenticate_with_pin,
            commands::auth::update_last_login,
            commands::auth::change_password,
            commands::auth::reset_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

async fn initialize_database() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = directories::ProjectDirs::from("com", "premiumpos", "premiumpos")
        .ok_or("Failed to determine app directory")?
        .data_local_dir()
        .to_path_buf();

    std::fs::create_dir_all(&app_dir)?;
    debug!("resolved app_dir = {:?}", app_dir);

    let db_path = app_dir.join("pos.db");
    let db_path_absolute = db_path.canonicalize().unwrap_or(db_path.clone());
    debug!("final db absolute path = {:?}", db_path_absolute);

    // Create database file if it doesn't exist
    if !db_path.exists() {
        std::fs::File::create(&db_path)?;
        debug!("Created new database file at {:?}", db_path);
    }

    debug!("sqlx connection string = sqlite://{}", db_path_absolute.display());
    Ok(db_path_absolute)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    debug!("applying 1 migration(s)");
    
    // Create tables
    sqlx::query(database::INITIAL_MIGRATION)
        .execute(pool)
        .await?;
    
    debug!("migrations applied successfully");
    Ok(())
}

async fn ensure_admin_user(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check if admin user exists
    let admin_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE username = 'admin'"
    )
    .fetch_one(pool)
    .await?;

    if admin_exists == 0 {
        // Create default admin user
        let hashed_password = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)?;
        
        sqlx::query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role, pin_code, permissions, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("admin")
        .bind("admin@premiumpos.com")
        .bind(hashed_password)
        .bind("Admin")
        .bind("User")
        .bind("admin")
        .bind("1234")
        .bind("all")
        .bind(true)
        .bind(chrono::Utc::now().naive_utc().to_string())
        .bind(chrono::Utc::now().naive_utc().to_string())
        .execute(pool)
        .await?;
        
        debug!("inserted default admin user");
    }
    
    debug!("Admin user ensured");
    Ok(())
}