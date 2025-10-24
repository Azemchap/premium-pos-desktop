use tauri::{command, State, AppHandle, Manager};
use crate::models::{StoreConfig, UpdateStoreConfigRequest};
use sqlx::{SqlitePool, Row};
use std::fs;
use std::path::PathBuf;

#[command]
pub async fn get_store_config(pool: State<'_, SqlitePool>) -> Result<StoreConfig, String> {
    println!("DEBUG(store): get_store_config called");
    let pool_ref = pool.inner();

    let row = sqlx::query("SELECT id, name, address, city, state, zip_code, phone, email, tax_rate, currency, logo_url, created_at, updated_at FROM locations WHERE id = 1")
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
        city: row.try_get("city").ok().flatten(),
        state: row.try_get("state").ok().flatten(),
        zip_code: row.try_get("zip_code").ok().flatten(),
        phone: row.try_get("phone").ok().flatten(),
        email: row.try_get("email").ok().flatten(),
        tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
        currency: row.try_get("currency").map_err(|e| e.to_string())?,
        logo_url: row.try_get("logo_url").ok().flatten(),
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

    sqlx::query("UPDATE locations SET name = ?1, address = ?2, city = ?3, state = ?4, zip_code = ?5, phone = ?6, email = ?7, tax_rate = ?8, currency = ?9, logo_url = ?10, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .bind(&request.name)
        .bind(&request.address)
        .bind(&request.city)
        .bind(&request.state)
        .bind(&request.zip_code)
        .bind(&request.phone)
        .bind(&request.email)
        .bind(request.tax_rate)
        .bind(&request.currency)
        .bind(&request.logo_url)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(store): update failed: {}", e);
            format!("Failed to update store config: {}", e)
        })?;

    println!("DEBUG(store): update done; fetching config");
    get_store_config(pool).await
}

#[command]
pub async fn upload_store_logo(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    println!("DEBUG(store): upload_store_logo called, file_name={}", file_name);
    
    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create logos directory if it doesn't exist
    let logos_dir = app_data_dir.join("logos");
    fs::create_dir_all(&logos_dir)
        .map_err(|e| format!("Failed to create logos directory: {}", e))?;
    
    // Generate unique filename based on timestamp
    let extension = PathBuf::from(&file_name)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "png".to_string());
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let new_file_name = format!("store_logo_{}.{}", timestamp, extension);
    let file_path = logos_dir.join(&new_file_name);
    
    // Save the file
    fs::write(&file_path, file_data)
        .map_err(|e| format!("Failed to save logo file: {}", e))?;
    
    // Convert to string path for database
    let logo_url = file_path
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())?
        .to_string();
    
    // Update database with new logo URL
    let pool_ref = pool.inner();
    sqlx::query("UPDATE locations SET logo_url = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .bind(&logo_url)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to update logo URL in database: {}", e))?;
    
    println!("DEBUG(store): logo saved to {}", logo_url);
    Ok(logo_url)
}

#[command]
pub async fn remove_store_logo(pool: State<'_, SqlitePool>) -> Result<(), String> {
    println!("DEBUG(store): remove_store_logo called");
    let pool_ref = pool.inner();
    
    // Get current logo URL to delete the file
    let row = sqlx::query("SELECT logo_url FROM locations WHERE id = 1")
        .fetch_one(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;
    
    let logo_url: Option<String> = row.try_get("logo_url").ok().flatten();
    
    // Delete the file if it exists
    if let Some(path) = logo_url {
        if let Err(e) = fs::remove_file(&path) {
            println!("DEBUG(store): Failed to delete logo file: {}", e);
            // Don't fail the operation if file deletion fails
        }
    }
    
    // Remove logo URL from database
    sqlx::query("UPDATE locations SET logo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to remove logo URL: {}", e))?;
    
    println!("DEBUG(store): logo removed");
    Ok(())
}