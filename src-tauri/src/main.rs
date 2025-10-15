// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod seeder;

use bcrypt::{hash, verify, DEFAULT_COST};
use database::get_migrations;
use directories::ProjectDirs;
use sqlx::{sqlite::SqlitePoolOptions, Executor, Row, SqlitePool};
use std::fs::OpenOptions;
use std::io::Write;

/// Apply migrations (simple runner splitting statements by ';')
async fn apply_migrations(pool: &SqlitePool) -> Result<(), String> {
    let migrations = get_migrations();
    println!("DEBUG(main): applying {} migration(s)", migrations.len());
    for mig in migrations {
        println!(
            "DEBUG(main): applying migration version {}: {}",
            mig.version, mig.description
        );

        for stmt in mig.sql.split(';') {
            let s = stmt.trim();
            if s.is_empty() {
                continue;
            }
            println!(
                "DEBUG(main): executing statement (preview): {}",
                &s.chars().take(80).collect::<String>()
            );
            pool.execute(s).await.map_err(|e| {
                format!("Migration failed (v{}): {} -- stmt: {}", mig.version, e, s)
            })?;
        }
    }
    println!("DEBUG(main): migrations applied successfully");
    Ok(())
}

async fn ensure_admin(pool: &SqlitePool) -> Result<(), String> {
    // default admin credentials (development only)
    let admin_username = "admin";
    let admin_email = "admin@premiumpos.com";
    let admin_password = "admin123";
    let admin_first = "Store";
    let admin_last = "Admin";
    let admin_role = "Admin";

    // Check if admin exists
    match sqlx::query("SELECT id, password_hash FROM users WHERE username = ?1")
        .bind(admin_username)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to query admin user: {}", e))?
    {
        None => {
            // Insert admin with bcrypt hash
            let pwd_hash = hash(admin_password, DEFAULT_COST)
                .map_err(|e| format!("bcrypt hash error: {}", e))?;
            sqlx::query(
                "INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(admin_username)
            .bind(admin_email)
            .bind(&pwd_hash)
            .bind(admin_first)
            .bind(admin_last)
            .bind(admin_role)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to insert admin user: {}", e))?;
            println!("DEBUG(main): inserted default admin user");
        }
        Some(row) => {
            // Admin exists; verify password and update if it doesn't match
            let stored_hash: String = row.try_get("password_hash").map_err(|e| format!("{}", e))?;
            match verify(admin_password, &stored_hash) {
                Ok(true) => {
                    println!("DEBUG(main): admin password already matches desired default");
                }
                _ => {
                    let new_hash = hash(admin_password, DEFAULT_COST)
                        .map_err(|e| format!("bcrypt hash error: {}", e))?;
                    sqlx::query("UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE username = ?2")
                        .bind(&new_hash)
                        .bind(admin_username)
                        .execute(pool)
                        .await
                        .map_err(|e| format!("Failed to update admin password: {}", e))?;
                    println!("DEBUG(main): updated admin password to default");
                }
            }
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    // Prefer OS app data directory for app data (not the watched src-tauri folder).
    // Use directories::ProjectDirs to compute a suitable per-user folder.
    let app_dir = ProjectDirs::from("com", "premiumpos", "Premium POS")
        .map(|pd| pd.data_dir().to_path_buf())
        .or_else(|| {
            // fallback: use current working directory
            println!("DEBUG(main): ProjectDirs not available; falling back to cwd");
            std::env::current_dir().ok()
        })
        .expect("Failed to determine an application directory");

    println!("DEBUG(main): resolved app_dir = {:?}", app_dir);

    // Ensure directory exists
    if let Err(e) = std::fs::create_dir_all(&app_dir) {
        panic!("Failed to ensure app dir exists {:?}: {}", app_dir, e);
    }

    // DB file path: <app_dir>/pos.db
    let mut db_path = app_dir.clone();
    db_path.push("pos.db");

    // Create the file if it does not exist (so SQLite can open it).
    if !db_path.exists() {
        match OpenOptions::new().create(true).write(true).open(&db_path) {
            Ok(mut f) => {
                if let Err(e) = f.write_all(b"") {
                    eprintln!(
                        "WARN: failed to write to newly created db file {:?}: {}",
                        db_path, e
                    );
                }
            }
            Err(e) => {
                panic!("Failed to create database file {:?}: {}", db_path, e);
            }
        }
    }

    // canonicalize and normalize path (strip Windows verbatim prefix if present)
    let abs_db = db_path.canonicalize().unwrap_or_else(|_| db_path.clone());
    let mut conn_path = abs_db.to_string_lossy().to_string();

    if cfg!(windows) {
        const VERBATIM_PREFIX: &str = r"\\?\";
        if conn_path.starts_with(VERBATIM_PREFIX) {
            conn_path = conn_path.trim_start_matches(VERBATIM_PREFIX).to_string();
        }
    }
    conn_path = conn_path.replace('\\', "/");

    // triple-slash required for absolute Windows paths: sqlite:///C:/...
    let conn_str = format!("sqlite:///{}", conn_path);

    println!("DEBUG(main): final db absolute path = {:?}", abs_db);
    println!("DEBUG(main): sqlx connection string = {}", conn_str);

    // Create pool with optimized settings for POS operations
    let pool: SqlitePool = SqlitePoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&conn_str)
        .await
        .unwrap_or_else(|e| {
            panic!("Failed to create SqlitePool for '{}': {}", conn_str, e);
        });

    // Apply migrations so tables exist
    if let Err(e) = apply_migrations(&pool).await {
        panic!("Migration error: {}", e);
    }

    // Ensure admin user exists and has a correct default password (dev only)
    if let Err(e) = ensure_admin(&pool).await {
        panic!("Failed to ensure admin user: {}", e);
    }

    // Seed database with sample data (only runs once)
    if let Err(e) = seeder::seed_database(&pool).await {
        eprintln!("Warning: Failed to seed database: {}", e);
    }

    // Initialize tauri and manage the pool in state
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&conn_str, get_migrations())
                .build(),
        )
        .manage(pool)
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            // Authentication commands
            commands::auth::login_user,
            commands::auth::register_user,
            commands::auth::verify_session,
            // User management commands
            commands::users::get_users,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            // Product management commands
            commands::products::get_products,
            commands::products::get_products_with_stock,
            commands::products::get_product_by_id,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::search_products,
            commands::products::get_product_by_barcode,
            // Inventory management commands
            commands::inventory::get_inventory,
            commands::inventory::update_stock,
            commands::inventory::get_inventory_movements,
            commands::inventory::create_stock_adjustment,
            commands::inventory::get_low_stock_items,
            // Sales commands
            commands::sales::create_sale,
            commands::sales::get_sales,
            commands::sales::get_sales_with_details,
            commands::sales::get_sales_stats,
            commands::sales::void_sale,
            commands::sales::get_sale_details,
            commands::sales::search_sales,
            // Store configuration commands
            commands::store::get_store_config,
            commands::store::update_store_config,
            // Shift management commands
            commands::shifts::create_shift,
            commands::shifts::close_shift,
            commands::shifts::get_current_shift,
            commands::shifts::get_shift_history,
            // Cash drawer commands
            commands::cash_drawer::create_transaction,
            commands::cash_drawer::get_transactions,
            commands::cash_drawer::get_cash_drawer_balance,
            // Receipt template commands
            commands::receipts::get_templates,
            commands::receipts::create_template,
            commands::receipts::update_template,
            commands::receipts::delete_template,
            commands::receipts::get_default_template,
            // Dashboard commands
            commands::dashboard::get_stats,
            commands::dashboard::get_recent_activity,
            // Report commands
            commands::reports::get_sales_report,
            commands::reports::get_product_performance,
            commands::reports::get_daily_sales,
            commands::reports::get_category_performance,
            commands::reports::get_financial_metrics,
            commands::reports::get_cash_flow_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
