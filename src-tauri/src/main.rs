// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;
mod models;

use database::init_database;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                init_database(&app_handle).await.expect("Failed to initialize database");
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
            commands::products::get_products,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::inventory::get_inventory,
            commands::inventory::update_stock,
            commands::inventory::get_inventory_movements,
            commands::sales::create_sale,
            commands::sales::get_sales,
            commands::sales::void_sale,
            commands::store::get_store_config,
            commands::store::update_store_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}