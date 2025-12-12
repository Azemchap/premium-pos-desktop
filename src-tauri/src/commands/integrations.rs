// src-tauri/src/commands/integrations.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_integrations(pool: State<'_, SqlitePool>) -> Result<Vec<Integration>, String> {
    let integrations =
        sqlx::query_as::<_, Integration>("SELECT * FROM integrations ORDER BY created_at DESC")
            .fetch_all(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch integrations: {}", e))?;

    Ok(integrations)
}

#[tauri::command]
pub async fn get_integration(
    pool: State<'_, SqlitePool>,
    integration_id: i64,
) -> Result<Integration, String> {
    let integration = sqlx::query_as::<_, Integration>("SELECT * FROM integrations WHERE id = ?")
        .bind(integration_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch integration: {}", e))?;

    Ok(integration)
}

#[tauri::command]
pub async fn create_integration(
    pool: State<'_, SqlitePool>,
    request: CreateIntegrationRequest,
) -> Result<Integration, String> {
    let result = sqlx::query(
        "INSERT INTO integrations (
            name, provider, api_key, api_secret, webhook_url, config, is_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&request.name)
    .bind(&request.provider)
    .bind(&request.api_key)
    .bind(&request.api_secret)
    .bind(&request.webhook_url)
    .bind(&request.config)
    .bind(request.is_enabled)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create integration: {}", e))?;

    let integration_id = result.last_insert_rowid();
    get_integration(pool, integration_id).await
}

#[tauri::command]
pub async fn update_integration(
    pool: State<'_, SqlitePool>,
    integration_id: i64,
    request: UpdateIntegrationRequest,
) -> Result<Integration, String> {
    sqlx::query(
        "UPDATE integrations SET
            name = COALESCE(?, name),
            provider = COALESCE(?, provider),
            api_key = COALESCE(?, api_key),
            api_secret = COALESCE(?, api_secret),
            webhook_url = COALESCE(?, webhook_url),
            config = COALESCE(?, config),
            is_enabled = COALESCE(?, is_enabled),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.name)
    .bind(&request.provider)
    .bind(&request.api_key)
    .bind(&request.api_secret)
    .bind(&request.webhook_url)
    .bind(&request.config)
    .bind(request.is_enabled)
    .bind(integration_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update integration: {}", e))?;

    get_integration(pool, integration_id).await
}

#[tauri::command]
pub async fn delete_integration(
    pool: State<'_, SqlitePool>,
    integration_id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM integrations WHERE id = ?")
        .bind(integration_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete integration: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn test_integration(
    pool: State<'_, SqlitePool>,
    integration_id: i64,
) -> Result<(), String> {
    // Fetch the integration
    let _integration = get_integration(pool, integration_id).await?;

    // For now, just return success
    // In a real implementation, you would test the connection to the integration
    Ok(())
}
