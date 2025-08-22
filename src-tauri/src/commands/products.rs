use tauri::{command, State};
use sqlx::SqlitePool;
use crate::models::{Product, CreateProductRequest};

#[command]
pub async fn get_products(_pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    // Implementation placeholder - will be completed in Phase 2
    Ok(vec![])
}

#[command]
pub async fn create_product(_pool: State<'_, SqlitePool>, _request: CreateProductRequest) -> Result<Product, String> {
    // Implementation placeholder - will be completed in Phase 2
    Err("Not implemented".to_string())
}

#[command]
pub async fn update_product(_pool: State<'_, SqlitePool>, _id: i64, _request: CreateProductRequest) -> Result<Product, String> {
    // Implementation placeholder - will be completed in Phase 2
    Err("Not implemented".to_string())
}

#[command]
pub async fn delete_product(_pool: State<'_, SqlitePool>, _id: i64) -> Result<bool, String> {
    // Implementation placeholder - will be completed in Phase 2
    Ok(false)
}