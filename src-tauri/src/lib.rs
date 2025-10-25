// Tauri mobile entry point (lib.rs)
// This file is required for Android/iOS builds

pub mod app;
pub mod commands;
pub mod database;
pub mod models;
pub mod seeder_building_materials;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Debug)
            .build())
            app::run().expect("error while running tauri application");
    Ok(())
}
