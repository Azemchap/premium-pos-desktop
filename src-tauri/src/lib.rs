// src-tauri/src/lib.rs

pub mod app;
pub mod commands;
pub mod database;
pub mod db_utils;
pub mod error;
pub mod models;
pub mod seeder_building_materials;
pub mod session;
pub mod validation;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Call the async-aware app main run function and handle the result
    if let Err(e) = app::run() {
        eprintln!("Error running application: {}", e);
        std::process::exit(1);
    }
}
