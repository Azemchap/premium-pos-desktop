// Tauri mobile entry point (lib.rs)
// This file is required for Android/iOS builds

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(async {
            crate::main_entry().await
        })
        .expect("error while running tauri application");
}
