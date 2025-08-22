use tauri::{command, AppHandle, Manager, State};
use tauri_plugin_sql::DbInstances;
use crate::models::{StoreConfig, UpdateStoreConfigRequest};

#[command]
pub async fn get_store_config(app_handle: AppHandle) -> Result<StoreConfig, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    let rows = db
        .select("SELECT * FROM locations WHERE id = 1")
        .fetch_all()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if rows.is_empty() {
        return Err("Store configuration not found".to_string());
    }

    let row = &rows[0];
    Ok(StoreConfig {
        id: row.get("id").unwrap(),
        name: row.get("name").unwrap(),
        address: row.get("address"),
        phone: row.get("phone"),
        email: row.get("email"),
        tax_rate: row.get("tax_rate").unwrap(),
        currency: row.get("currency").unwrap(),
        timezone: row.get("timezone").unwrap(),
        created_at: row.get("created_at").unwrap(),
        updated_at: row.get("updated_at").unwrap(),
    })
}

#[command]
pub async fn update_store_config(
    app_handle: AppHandle,
    request: UpdateStoreConfigRequest,
) -> Result<StoreConfig, String> {
    let db_instances: State<DbInstances> = app_handle.state();
    let db = db_instances
        .0
        .read()
        .await
        .get("sqlite:pos.db")
        .ok_or("Database connection failed")?;

    let _result = db.execute(
        "UPDATE locations SET name = $1, address = $2, phone = $3, email = $4, tax_rate = $5, currency = $6, timezone = $7, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.tax_rate)
    .bind(&request.currency)
    .bind(&request.timezone)
    .fetch_all()
    .await
    .map_err(|e| format!("Failed to update store config: {}", e))?;

    get_store_config(app_handle).await
}