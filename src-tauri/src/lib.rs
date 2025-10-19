// Tauri mobile entry point (lib.rs)
// This file is required for Android/iOS builds

mod commands;
mod database;
mod models;
mod seeder_building_materials;
mod app;

use seeder_building_materials as seeder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(async {
            app::run().await
        })
        .expect("error while running tauri application");
}
