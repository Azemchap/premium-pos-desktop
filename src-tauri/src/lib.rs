// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod database;
pub mod models;
pub mod seeder_building_materials;
pub mod app;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            if let Err(e) = app::run().await {
                eprintln!("Application error: {}", e);
            }
        });
}