// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod database;
mod db_utils;
mod error;
mod models;
mod seeder_building_materials;
mod session;
mod validation;

fn main() {
    // Call the same app run function synchronously
    app::run().expect("error while running tauri application");
}
