// Tauri mobile entry point (lib.rs)
// This file is required for Android/iOS builds

pub mod app;
pub mod commands;
pub mod database;
pub mod models;
pub mod seeder_building_materials;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Call the synchronous app::run() directly
    app::run().expect("error while running tauri application");
}
