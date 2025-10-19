// Tauri mobile entry point (lib.rs)
// This file is required for Android/iOS builds

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
            app::run().await.expect("error while running tauri application");
        });
}
