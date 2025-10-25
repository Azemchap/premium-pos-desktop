// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;

fn main() {
    // Call the same app run function synchronously
    app::run().expect("error while running tauri application");
}
