// src/main.rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::debug;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::PathBuf;

mod commands;
mod database;
mod models;

use commands::auth::{
    authenticate_user, authenticate_with_pin, change_password, reset_password, update_last_login,
};
use commands::sales::{
    create_sale, create_sale_new, get_products_for_sale, get_sale_by_id, get_sale_details,
    get_sales, get_sales_by_cashier, get_sales_by_date, get_sales_history, process_return,
    void_sale,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    debug!("Starting Premium POS application...");

    // Initialize database
    let db_path = initialize_database().await?;
    debug!("Database initialized at: {:?}", db_path);

    // Build a proper sqlite connection URL - fixed version
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());
    debug!("sqlx connection string = {}", db_url);

    // Create SQLite connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
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
            authenticate_user,
            authenticate_with_pin,
            change_password,
            reset_password,
            update_last_login,
            commands::users::get_users,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::products::get_products,
            commands::products::get_product_by_id,
            commands::products::check_product_unique,
            commands::products::get_categories,
            commands::products::get_brands,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::search_products,
            commands::inventory::get_inventory,
            commands::inventory::get_inventory_by_product_id,
            commands::inventory::update_stock,
            commands::inventory::create_stock_adjustment,
            commands::inventory::get_stock_movements,
            commands::inventory::update_inventory_settings,
            create_sale,
            create_sale_new,
            get_sales,
            get_sales_history,
            get_sale_by_id,
            get_sales_by_date,
            get_sales_by_cashier,
            get_sale_details,
            void_sale,
            process_return,
            get_products_for_sale,
            commands::shifts::start_shift,
            commands::shifts::end_shift,
            commands::shifts::get_active_shift,
            commands::shifts::get_shift_history,
            commands::receipts::get_receipt_templates,
            commands::receipts::create_receipt_template,
            commands::receipts::update_receipt_template,
            commands::store::get_store_config,
            commands::store::update_store_config,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_recent_activity,
            commands::dashboard::get_recent_sales,
            commands::dashboard::get_top_products
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

async fn initialize_database() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = directories::ProjectDirs::from("com", "premiumpos", "PremiumPOS")
        .ok_or("Failed to get app directory")?
        .data_dir()
        .to_path_buf();

    std::fs::create_dir_all(&app_dir)?;
    debug!("resolved app_dir = {:?}", app_dir);

    let db_path = app_dir.join("pos.db");
    debug!("database path = {:?}", db_path);

    // Create database file if it doesn't exist
    if !db_path.exists() {
        std::fs::File::create(&db_path)?;
        debug!("Created new database file at {:?}", db_path);
    }

    // Return the path without canonicalization to avoid Windows issues
    Ok(db_path)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    debug!("applying migrations");

    // Note: database::INITIAL_MIGRATION must contain CREATE TABLE for any tables that are
    // inserted into (e.g. receipt_templates). Make sure the migration SQL is correct.
    sqlx::query(database::INITIAL_MIGRATION)
        .execute(pool)
        .await?;

    debug!("migrations applied successfully");
    Ok(())
}

async fn ensure_admin_user(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check if admin user exists
    let admin_exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE username = 'admin'")
            .fetch_one(pool)
            .await?;

    if admin_exists == 0 {
        // Create default admin user
        let hashed_password = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)?;

        sqlx::query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role, pin_code, permissions, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("admin") // username
        .bind("admin@premiumpos.com") // email
        .bind(hashed_password) // password_hash
        .bind("Admin") // first_name
        .bind("User") // last_name
        .bind("Admin") // role
        .bind("1234") // pin_code
        .bind("all") // permissions
        .bind(true) // is_active
        .bind(chrono::Utc::now().naive_utc().to_string()) // created_at
        .bind(chrono::Utc::now().naive_utc().to_string()) // updated_at
        .execute(pool)
        .await?;

        debug!("inserted default admin user");
    }

    debug!("Admin user ensured");
    Ok(())
}
