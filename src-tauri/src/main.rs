// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod seeder_building_materials;
mod app;

use seeder_building_materials as seeder;

#[tokio::main]
async fn main() {
    app::run().await.expect("error while running tauri application");
}
