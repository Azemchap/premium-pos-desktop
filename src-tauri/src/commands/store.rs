use tauri::{command, State};
use crate::models::{StoreConfig, UpdateStoreConfigRequest};
use sqlx::{SqlitePool, Row};

#[command]
pub async fn get_store_config(pool: State<'_, SqlitePool>) -> Result<StoreConfig, String> {
    println!("DEBUG(store): get_store_config called");
    let pool_ref = pool.inner();

    let row = sqlx::query("SELECT id, name, address, phone, email, tax_rate, currency, timezone, created_at, updated_at FROM locations WHERE id = 1")
        .fetch_one(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(store): fetch error: {}", e);
            format!("Database error: {}", e)
        })?;

    let config = StoreConfig {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        name: row.try_get("name").map_err(|e| e.to_string())?,
        address: row.try_get("address").ok().flatten(),
        phone: row.try_get("phone").ok().flatten(),
        email: row.try_get("email").ok().flatten(),
        tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
        currency: row.try_get("currency").map_err(|e| e.to_string())?,
        timezone: row.try_get("timezone").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    println!("DEBUG(store): returning id={}", config.id);
    Ok(config)
}

#[command]
pub async fn update_store_config(pool: State<'_, SqlitePool>, request: UpdateStoreConfigRequest) -> Result<StoreConfig, String> {
    println!("DEBUG(store): update_store_config called name='{}'", request.name);
    let pool_ref = pool.inner();

    sqlx::query("UPDATE locations SET name = ?1, address = ?2, phone = ?3, email = ?4, tax_rate = ?5, currency = ?6, timezone = ?7, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .bind(&request.name)
        .bind(&request.address)
        .bind(&request.phone)
        .bind(&request.email)
        .bind(request.tax_rate)
        .bind(&request.currency)
        .bind(&request.timezone)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(store): update failed: {}", e);
            format!("Failed to update store config: {}", e)
        })?;

    println!("DEBUG(store): update done; fetching config");
    get_store_config(pool).await
}