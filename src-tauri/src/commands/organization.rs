// src-tauri/src/commands/organization.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_organization(pool: State<'_, SqlitePool>) -> Result<Organization, String> {
    // For single-org POS, get the first organization or create a default one
    let org_opt = sqlx::query_as::<_, Organization>(
        "SELECT * FROM organizations WHERE is_active = 1 ORDER BY id LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch organization: {}", e))?;

    if let Some(org) = org_opt {
        Ok(org)
    } else {
        // Create default organization
        let result = sqlx::query(
            "INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
             VALUES ('My Business', 'my-business', 'Free', 'Active')",
        )
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to create default organization: {}", e))?;

        let org_id = result.last_insert_rowid();

        sqlx::query_as::<_, Organization>("SELECT * FROM organizations WHERE id = ?")
            .bind(org_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| format!("Failed to fetch created organization: {}", e))
    }
}

#[tauri::command]
pub async fn update_organization(
    pool: State<'_, SqlitePool>,
    request: UpdateOrganizationRequest,
) -> Result<Organization, String> {
    // Get existing organization ID
    let org = get_organization(pool.clone()).await?;

    sqlx::query(
        "UPDATE organizations SET
            name = COALESCE(?, name),
            industry = COALESCE(?, industry),
            business_type = COALESCE(?, business_type),
            logo_url = COALESCE(?, logo_url),
            website = COALESCE(?, website),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            zip_code = COALESCE(?, zip_code),
            country = COALESCE(?, country),
            tax_id = COALESCE(?, tax_id),
            settings = COALESCE(?, settings),
            custom_fields = COALESCE(?, custom_fields),
            legal_name = COALESCE(?, legal_name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.name)
    .bind(&request.industry)
    .bind(&request.business_type)
    .bind(&request.logo_url)
    .bind(&request.website)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.address)
    .bind(&request.city)
    .bind(&request.state)
    .bind(&request.zip_code)
    .bind(&request.country)
    .bind(&request.tax_id)
    .bind(&request.settings)
    .bind(&request.custom_fields)
    .bind(&request.legal_name)
    .bind(&request.description)
    .bind(org.id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update organization: {}", e))?;

    get_organization(pool).await
}

#[tauri::command]
pub async fn get_locations(pool: State<'_, SqlitePool>) -> Result<Vec<Location>, String> {
    let locations = sqlx::query_as::<_, Location>(
        "SELECT * FROM locations WHERE is_active = 1 ORDER BY name",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch locations: {}", e))?;

    Ok(locations)
}

#[tauri::command]
pub async fn create_location(
    pool: State<'_, SqlitePool>,
    request: CreateLocationRequest,
) -> Result<Location, String> {
    let result = sqlx::query(
        "INSERT INTO locations (name, address, city, state, zip_code, country, phone, email, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.city)
    .bind(&request.state)
    .bind(&request.zip_code)
    .bind(&request.country)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.is_primary)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create location: {}", e))?;

    let location_id = result.last_insert_rowid();

    sqlx::query_as::<_, Location>("SELECT * FROM locations WHERE id = ?")
        .bind(location_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch created location: {}", e))
}

#[tauri::command]
pub async fn update_location(
    pool: State<'_, SqlitePool>,
    location_id: i64,
    request: UpdateLocationRequest,
) -> Result<Location, String> {
    sqlx::query(
        "UPDATE locations SET
            name = COALESCE(?, name),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            zip_code = COALESCE(?, zip_code),
            country = COALESCE(?, country),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            is_primary = COALESCE(?, is_primary),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.city)
    .bind(&request.state)
    .bind(&request.zip_code)
    .bind(&request.country)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.is_primary)
    .bind(&request.is_active)
    .bind(location_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update location: {}", e))?;

    sqlx::query_as::<_, Location>("SELECT * FROM locations WHERE id = ?")
        .bind(location_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch updated location: {}", e))
}

#[tauri::command]
pub async fn delete_location(
    pool: State<'_, SqlitePool>,
    location_id: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE locations SET is_active = 0 WHERE id = ?")
        .bind(location_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete location: {}", e))?;

    Ok(())
}
