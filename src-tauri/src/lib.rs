// src-tauri/src/lib.rs

pub mod app;
pub mod commands;
pub mod database;
pub mod models;
pub mod seeder_building_materials;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    // Call the async-aware app main run function
    app::run()
}
