use crate::models::StoreConfig;
use sqlx::{SqlitePool, Row};

pub async fn get_store_config(
    pool: &SqlitePool,
) -> Result<StoreConfig, String> {
    let row = sqlx::query("SELECT * FROM store_config LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let config = StoreConfig {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            address: row.try_get("address").ok().flatten(),
            phone: row.try_get("phone").ok().flatten(),
            email: row.try_get("email").ok().flatten(),
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
    } else {
        // Return default config if none exists
        Ok(StoreConfig {
            id: 1,
            name: "My Store".to_string(),
            address: None,
            phone: None,
            email: None,
            tax_rate: 0.0,
            currency: "USD".to_string(),
            timezone: "UTC".to_string(),
            logo_path: None,
            receipt_header: None,
            receipt_footer: None,
            created_at: chrono::Utc::now().naive_utc().to_string(),
            updated_at: chrono::Utc::now().naive_utc().to_string(),
        })
    }
}

pub async fn update_store_config(
    pool: &SqlitePool,
    config: StoreConfig,
) -> Result<StoreConfig, String> {
    sqlx::query(
        "UPDATE store_config SET name = ?, address = ?, phone = ?, email = ?, tax_rate = ?, currency = ?, timezone = ?, logo_path = ?, receipt_header = ?, receipt_footer = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&config.name)
    .bind(&config.address)
    .bind(&config.phone)
    .bind(&config.email)
    .bind(config.tax_rate)
    .bind(&config.currency)
    .bind(&config.timezone)
    .bind(&config.logo_path)
    .bind(&config.receipt_header)
    .bind(&config.receipt_footer)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(config.id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(config)
}
