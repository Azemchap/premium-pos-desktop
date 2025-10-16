// src-tauri/src/commands/master_data.rs - Master Data Management Commands
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, serde::Serialize, serde::Deserialize, FromRow)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, FromRow)]
pub struct Brand {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, FromRow)]
pub struct Unit {
    pub id: i64,
    pub name: String,
    pub abbreviation: Option<String>,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct CategoryRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct BrandRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct UnitRequest {
    pub name: String,
    pub abbreviation: Option<String>,
    pub description: Option<String>,
}

// ============ CATEGORIES ============

#[tauri::command]
pub async fn get_categories(pool: State<'_, SqlitePool>) -> Result<Vec<Category>, String> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(categories)
}

#[tauri::command]
pub async fn get_all_categories(pool: State<'_, SqlitePool>) -> Result<Vec<Category>, String> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(categories)
}

#[tauri::command]
pub async fn create_category(
    pool: State<'_, SqlitePool>,
    request: CategoryRequest,
) -> Result<Category, String> {
    let result = sqlx::query(
        "INSERT INTO categories (name, description) VALUES (?, ?)"
    )
    .bind(&request.name)
    .bind(&request.description)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create category: {}", e))?;

    let category = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch created category: {}", e))?;

    Ok(category)
}

#[tauri::command]
pub async fn update_category(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: CategoryRequest,
) -> Result<Category, String> {
    sqlx::query(
        "UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update category: {}", e))?;

    let category = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch updated category: {}", e))?;

    Ok(category)
}

#[tauri::command]
pub async fn delete_category(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE categories SET is_active = 0 WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete category: {}", e))?;

    Ok(())
}

// ============ BRANDS ============

#[tauri::command]
pub async fn get_brands(pool: State<'_, SqlitePool>) -> Result<Vec<Brand>, String> {
    let brands = sqlx::query_as::<_, Brand>(
        "SELECT * FROM brands WHERE is_active = 1 ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(brands)
}

#[tauri::command]
pub async fn get_all_brands(pool: State<'_, SqlitePool>) -> Result<Vec<Brand>, String> {
    let brands = sqlx::query_as::<_, Brand>(
        "SELECT * FROM brands ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(brands)
}

#[tauri::command]
pub async fn create_brand(
    pool: State<'_, SqlitePool>,
    request: BrandRequest,
) -> Result<Brand, String> {
    let result = sqlx::query(
        "INSERT INTO brands (name, description) VALUES (?, ?)"
    )
    .bind(&request.name)
    .bind(&request.description)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create brand: {}", e))?;

    let brand = sqlx::query_as::<_, Brand>(
        "SELECT * FROM brands WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch created brand: {}", e))?;

    Ok(brand)
}

#[tauri::command]
pub async fn update_brand(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: BrandRequest,
) -> Result<Brand, String> {
    sqlx::query(
        "UPDATE brands SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update brand: {}", e))?;

    let brand = sqlx::query_as::<_, Brand>(
        "SELECT * FROM brands WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch updated brand: {}", e))?;

    Ok(brand)
}

#[tauri::command]
pub async fn delete_brand(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE brands SET is_active = 0 WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete brand: {}", e))?;

    Ok(())
}

// ============ UNITS ============

#[tauri::command]
pub async fn get_units(pool: State<'_, SqlitePool>) -> Result<Vec<Unit>, String> {
    let units = sqlx::query_as::<_, Unit>(
        "SELECT * FROM units WHERE is_active = 1 ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(units)
}

#[tauri::command]
pub async fn get_all_units(pool: State<'_, SqlitePool>) -> Result<Vec<Unit>, String> {
    let units = sqlx::query_as::<_, Unit>(
        "SELECT * FROM units ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(units)
}

#[tauri::command]
pub async fn create_unit(
    pool: State<'_, SqlitePool>,
    request: UnitRequest,
) -> Result<Unit, String> {
    let result = sqlx::query(
        "INSERT INTO units (name, abbreviation, description) VALUES (?, ?, ?)"
    )
    .bind(&request.name)
    .bind(&request.abbreviation)
    .bind(&request.description)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create unit: {}", e))?;

    let unit = sqlx::query_as::<_, Unit>(
        "SELECT * FROM units WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch created unit: {}", e))?;

    Ok(unit)
}

#[tauri::command]
pub async fn update_unit(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: UnitRequest,
) -> Result<Unit, String> {
    sqlx::query(
        "UPDATE units SET name = ?, abbreviation = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(&request.name)
    .bind(&request.abbreviation)
    .bind(&request.description)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update unit: {}", e))?;

    let unit = sqlx::query_as::<_, Unit>(
        "SELECT * FROM units WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to fetch updated unit: {}", e))?;

    Ok(unit)
}

#[tauri::command]
pub async fn delete_unit(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE units SET is_active = 0 WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete unit: {}", e))?;

    Ok(())
}
