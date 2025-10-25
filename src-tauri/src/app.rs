// Shared application logic for both desktop and mobile

use crate::{commands, database, seeder_building_materials as seeder};
use bcrypt::{hash, verify, DEFAULT_COST};
use database::get_migrations;
use sqlx::{sqlite::SqlitePoolOptions, Executor, Row, SqlitePool};
use std::fs::OpenOptions;
use std::io::Write;
use tauri::Manager;

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
            let preview = if s.len() > 80 { &s[..80] } else { s };
            println!("DEBUG(main): executing statement (preview): {}", preview);
            pool.execute(s).await.map_err(|e| {
                format!(
                    "Migration failed (v{}): {} -- stmt: {}",
                    mig.version, e, preview
                )
            })?;
        }
    }
    println!("DEBUG(main): migrations applied successfully");
    Ok(())
}

/// Ensure admin user exists with default password
async fn ensure_admin(pool: &SqlitePool) -> Result<(), String> {
    let row_opt = sqlx::query("SELECT password_hash FROM users WHERE username = 'admin'")
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to query admin user: {}", e))?;

    if let Some(row) = row_opt {
        let stored_hash: String = row
            .try_get("password_hash")
            .map_err(|e| format!("Failed to get password_hash: {}", e))?;
        let desired_pass = "admin123";
        match verify(desired_pass, &stored_hash) {
            Ok(true) => {
                println!("DEBUG(main): admin password already matches desired default");
                return Ok(());
            }
            Ok(false) => {
                println!("DEBUG(main): admin password does NOT match; updating");
            }
            Err(e) => {
                return Err(format!("bcrypt verify error: {}", e));
            }
        }
        let new_hash =
            hash(desired_pass, DEFAULT_COST).map_err(|e| format!("hash error: {}", e))?;
        sqlx::query("UPDATE users SET password_hash = ?1, email = 'admin@ztadpos.com' WHERE username = 'admin'")
            .bind(&new_hash)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update admin password: {}", e))?;
        println!("DEBUG(main): admin password and email updated to default");
        Ok(())
    } else {
        let default_password = "admin123";
        let pass_hash =
            hash(default_password, DEFAULT_COST).map_err(|e| format!("hash error: {}", e))?;

        sqlx::query(
            "INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role, is_active, profile_image_url, created_at, updated_at)
             VALUES ('admin', 'admin@ztadpos.com', ?1, 'Admin', 'User', 'Admin', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        )
        .bind(&pass_hash)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert default admin: {}", e))?;

        println!("DEBUG(main): inserted default admin user");
        Ok(())
    }
}

/// Initialize database with proper cross-platform path handling
async fn initialize_database(
    app_handle: &tauri::AppHandle,
) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    // Use Tauri's path API for cross-platform compatibility
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    println!("DEBUG(main): resolved app_data_dir = {:?}", app_data_dir);

    // Ensure directory exists
    std::fs::create_dir_all(&app_data_dir).map_err(|e| {
        format!(
            "Failed to create app data directory {:?}: {}",
            app_data_dir, e
        )
    })?;

    let mut db_path = app_data_dir.clone();
    db_path.push("pos.db");

    // Create database file if it doesn't exist
    if !db_path.exists() {
        println!("DEBUG(main): creating new database file at {:?}", db_path);
        OpenOptions::new()
            .create(true)
            .write(true)
            .open(&db_path)
            .and_then(|mut f| f.write_all(b""))
            .map_err(|e| format!("Failed to create database file {:?}: {}", db_path, e))?;
    }

    // Get absolute path
    let abs_db = db_path.canonicalize().unwrap_or_else(|_| db_path.clone());
    let mut conn_path = abs_db.to_string_lossy().to_string();

    // Handle Windows verbatim prefix
    if cfg!(windows) {
        const VERBATIM_PREFIX: &str = r"\\?\";
        if conn_path.starts_with(VERBATIM_PREFIX) {
            conn_path = conn_path.trim_start_matches(VERBATIM_PREFIX).to_string();
        }
    }

    // Normalize path separators
    conn_path = conn_path.replace('\\', "/");

    let conn_str = format!("sqlite:///{}", conn_path);

    println!("DEBUG(main): final db absolute path = {:?}", abs_db);
    println!("DEBUG(main): sqlx connection string = {}", conn_str);

    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&conn_str)
        .await
        .map_err(|e| format!("Failed to create SqlitePool for '{}': {}", conn_str, e))?;

    // Apply migrations
    apply_migrations(&pool)
        .await
        .map_err(|e| format!("Migration error: {}", e))?;

    // Ensure admin user exists
    ensure_admin(&pool)
        .await
        .map_err(|e| format!("Failed to ensure admin user: {}", e))?;

    // Seed database
    if let Err(e) = seeder::seed_database(&pool).await {
        eprintln!("Warning: Failed to seed database: {}", e);
    }

    Ok(pool)
}

/// Main application entry point shared by desktop and mobile
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_haptics::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Initialize database in a separate thread to avoid blocking
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async move {
                    match initialize_database(&app_handle).await {
                        Ok(pool) => {
                            app_handle.manage(pool);
                            println!("DEBUG(main): Database initialized successfully");
                        }
                        Err(e) => {
                            eprintln!("FATAL: Failed to initialize database: {}", e);
                            std::process::exit(1);
                        }
                    }
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::login_user,
            commands::auth::register_user,
            commands::auth::verify_session,
            commands::users::get_users,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::update_user_profile,
            commands::users::change_user_password,
            commands::products::get_products,
            commands::products::get_products_with_stock,
            commands::products::get_product_by_id,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::reactivate_product,
            commands::products::search_products,
            commands::products::get_product_by_barcode,
            commands::inventory::sync_inventory,
            commands::inventory::get_inventory,
            commands::inventory::update_stock,
            commands::inventory::get_inventory_movements,
            commands::inventory::create_stock_adjustment,
            commands::inventory::get_low_stock_items,
            commands::sales::create_sale,
            commands::sales::get_sales,
            commands::sales::get_sales_with_details,
            commands::sales::get_sales_stats,
            commands::sales::void_sale,
            commands::sales::get_sale_details,
            commands::sales::search_sales,
            commands::store::get_store_config,
            commands::store::update_store_config,
            commands::store::upload_store_logo,
            commands::store::remove_store_logo,
            commands::shifts::create_shift,
            commands::shifts::close_shift,
            commands::shifts::get_current_shift,
            commands::shifts::get_shift_history,
            commands::cash_drawer::create_transaction,
            commands::cash_drawer::get_transactions,
            commands::cash_drawer::get_cash_drawer_balance,
            commands::receipts::get_templates,
            commands::receipts::create_template,
            commands::receipts::update_template,
            commands::receipts::delete_template,
            commands::receipts::get_default_template,
            commands::dashboard::get_stats,
            commands::dashboard::get_recent_activity,
            commands::reports::get_sales_report,
            commands::reports::get_product_performance,
            commands::reports::get_daily_sales,
            commands::reports::get_category_performance,
            commands::reports::get_financial_metrics,
            commands::reports::get_cash_flow_summary,
            commands::notifications::get_notifications,
            commands::notifications::get_notification_stats,
            commands::notifications::mark_notification_read,
            commands::notifications::mark_all_notifications_read,
            commands::notifications::create_notification,
            commands::notifications::check_low_stock_alerts,
            commands::notifications::delete_notification,
            commands::master_data::get_categories,
            commands::master_data::get_all_categories,
            commands::master_data::create_category,
            commands::master_data::update_category,
            commands::master_data::delete_category,
            commands::master_data::get_brands,
            commands::master_data::get_all_brands,
            commands::master_data::create_brand,
            commands::master_data::update_brand,
            commands::master_data::delete_brand,
            commands::master_data::get_units,
            commands::master_data::get_all_units,
            commands::master_data::create_unit,
            commands::master_data::update_unit,
            commands::master_data::delete_unit,
            commands::stock::receive_stock,
            commands::stock::adjust_stock,
            commands::stock::reserve_stock,
            commands::stock::release_reserved_stock,
            commands::stock::stock_take,
            commands::variants::get_all_variant_types,
            commands::variants::get_variant_type,
            commands::variants::create_variant_type,
            commands::variants::update_variant_type,
            commands::variants::delete_variant_type,
            commands::variants::get_variant_values_by_type,
            commands::variants::get_all_variant_values,
            commands::variants::get_variant_value,
            commands::variants::create_variant_value,
            commands::variants::update_variant_value,
            commands::variants::delete_variant_value,
            commands::variants::get_product_variants,
            commands::variants::create_product_variant,
            commands::variants::update_product_variant,
            commands::variants::get_product_variant,
            commands::variants::delete_product_variant,
            commands::variants::update_variant_inventory,
            commands::variants::get_variant_inventory,
        ])
        .run(tauri::generate_context!())?;

    Ok(())
}
