// src-tauri/src/lib.rs

pub mod app;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    // Call the async-aware app main run function
    app::run()
}
