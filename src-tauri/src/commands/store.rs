use tauri::{command, State};
use crate::models::{StoreConfig, UpdateStoreConfigRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn get_store_config(pool: State<'_, SqlitePool>) -> Result<StoreConfig, String> {
    let row = sqlx::query(
        "SELECT id, name, address, phone, email, tax_rate, currency, timezone, logo_path, receipt_header, receipt_footer, created_at, updated_at FROM locations WHERE id = 1"
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let config = StoreConfig {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        name: row.try_get("name").map_err(|e| e.to_string())?,
        address: row.try_get("address").map_err(|e| e.to_string())?,
        phone: row.try_get("phone").map_err(|e| e.to_string())?,
        email: row.try_get("email").map_err(|e| e.to_string())?,
        tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
        currency: row.try_get("currency").map_err(|e| e.to_string())?,
        timezone: row.try_get("timezone").map_err(|e| e.to_string())?,
        logo_path: row.try_get("logo_path").ok().flatten(),
        receipt_header: row.try_get("receipt_header").ok().flatten(),
        receipt_footer: row.try_get("receipt_footer").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    Ok(config)
}

#[tauri::command]
pub async fn update_store_config(
    pool: State<'_, SqlitePool>,
    request: UpdateStoreConfigRequest,
) -> Result<StoreConfig, String> {
    sqlx::query(
        "UPDATE locations SET name = ?, address = ?, phone = ?, email = ?, tax_rate = ?, currency = ?, timezone = ?, logo_path = ?, receipt_header = ?, receipt_footer = ?, updated_at = ? WHERE id = 1"
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(request.tax_rate)
    .bind(&request.currency)
    .bind(&request.timezone)
    .bind(&request.logo_path)
    .bind(&request.receipt_header)
    .bind(&request.receipt_footer)
    .bind(chrono::Utc::now().naive_utc())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_store_config(pool).await
}