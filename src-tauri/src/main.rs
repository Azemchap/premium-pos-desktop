// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;
mod models;

use database::get_migrations;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool, Executor, Row};
use std::fs::OpenOptions;
use std::io::Write;
use directories::ProjectDirs;
use bcrypt::{hash, verify, DEFAULT_COST};

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
            pool.execute(s)
                .await
                .map_err(|e| format!("Migration failed (v{}): {} -- stmt: {}", mig.version, e, s))?;
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
                "INSERT INTO users (username, email, password_hash, first_name, last_name, role, pin_code) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            )
            .bind(admin_username)
            .bind(admin_email)
            .bind(&pwd_hash)
            .bind(admin_first)
            .bind(admin_last)
            .bind(admin_role)
            .bind("1234") // Default PIN code
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
                    eprintln!("WARN: failed to write to newly created db file {:?}: {}", db_path, e);
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

    println!("DEBUG(main): Application initialized successfully!");
    println!("DEBUG(main): Database connection established and migrations applied");
    println!("DEBUG(main): Admin user ensured");
    
    // Keep the application running for a moment to see the output
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
}