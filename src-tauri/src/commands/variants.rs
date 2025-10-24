use tauri::{command, State};
use crate::models::*;
use sqlx::{SqlitePool, Row};

// ==================== VARIANT TYPES ====================

#[command]
pub async fn get_all_variant_types(pool: State<'_, SqlitePool>) -> Result<Vec<VariantType>, String> {
    let pool_ref = pool.inner();
    
    let rows = sqlx::query(
        "SELECT id, name, description, display_order, is_active, created_at, updated_at 
         FROM variant_types 
         ORDER BY display_order, name"
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    let variant_types: Vec<VariantType> = rows.iter().map(|row| VariantType {
        id: row.get("id"),
        name: row.get("name"),
        description: row.try_get("description").ok().flatten(),
        display_order: row.get("display_order"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    Ok(variant_types)
}

#[command]
pub async fn get_variant_type(pool: State<'_, SqlitePool>, id: i64) -> Result<VariantType, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, name, description, display_order, is_active, created_at, updated_at 
         FROM variant_types 
         WHERE id = ?1"
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    Ok(VariantType {
        id: row.get("id"),
        name: row.get("name"),
        description: row.try_get("description").ok().flatten(),
        display_order: row.get("display_order"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn create_variant_type(
    pool: State<'_, SqlitePool>,
    request: CreateVariantTypeRequest
) -> Result<VariantType, String> {
    let pool_ref = pool.inner();
    
    let display_order = request.display_order.unwrap_or(0);
    
    let result = sqlx::query(
        "INSERT INTO variant_types (name, description, display_order) 
         VALUES (?1, ?2, ?3)"
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(display_order)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_variant_type(pool, result.last_insert_rowid()).await
}

#[command]
pub async fn update_variant_type(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: UpdateVariantTypeRequest
) -> Result<VariantType, String> {
    let pool_ref = pool.inner();
    
    let display_order = request.display_order.unwrap_or(0);
    
    sqlx::query(
        "UPDATE variant_types 
         SET name = ?1, description = ?2, display_order = ?3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?4"
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(display_order)
    .bind(id)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_variant_type(pool, id).await
}

#[command]
pub async fn delete_variant_type(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let pool_ref = pool.inner();
    
    sqlx::query("DELETE FROM variant_types WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== VARIANT VALUES ====================

#[command]
pub async fn get_variant_values_by_type(
    pool: State<'_, SqlitePool>,
    variant_type_id: i64
) -> Result<Vec<VariantValue>, String> {
    let pool_ref = pool.inner();
    
    let rows = sqlx::query(
        "SELECT id, variant_type_id, value, code, display_order, hex_color, is_active, created_at, updated_at 
         FROM variant_values 
         WHERE variant_type_id = ?1 
         ORDER BY display_order, value"
    )
    .bind(variant_type_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    let variant_values: Vec<VariantValue> = rows.iter().map(|row| VariantValue {
        id: row.get("id"),
        variant_type_id: row.get("variant_type_id"),
        value: row.get("value"),
        code: row.try_get("code").ok().flatten(),
        display_order: row.get("display_order"),
        hex_color: row.try_get("hex_color").ok().flatten(),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    Ok(variant_values)
}

#[command]
pub async fn get_all_variant_values(pool: State<'_, SqlitePool>) -> Result<Vec<VariantValue>, String> {
    let pool_ref = pool.inner();
    
    let rows = sqlx::query(
        "SELECT id, variant_type_id, value, code, display_order, hex_color, is_active, created_at, updated_at 
         FROM variant_values 
         ORDER BY variant_type_id, display_order, value"
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    let variant_values: Vec<VariantValue> = rows.iter().map(|row| VariantValue {
        id: row.get("id"),
        variant_type_id: row.get("variant_type_id"),
        value: row.get("value"),
        code: row.try_get("code").ok().flatten(),
        display_order: row.get("display_order"),
        hex_color: row.try_get("hex_color").ok().flatten(),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    Ok(variant_values)
}

#[command]
pub async fn get_variant_value(pool: State<'_, SqlitePool>, id: i64) -> Result<VariantValue, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, variant_type_id, value, code, display_order, hex_color, is_active, created_at, updated_at 
         FROM variant_values 
         WHERE id = ?1"
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    Ok(VariantValue {
        id: row.get("id"),
        variant_type_id: row.get("variant_type_id"),
        value: row.get("value"),
        code: row.try_get("code").ok().flatten(),
        display_order: row.get("display_order"),
        hex_color: row.try_get("hex_color").ok().flatten(),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn create_variant_value(
    pool: State<'_, SqlitePool>,
    request: CreateVariantValueRequest
) -> Result<VariantValue, String> {
    let pool_ref = pool.inner();
    
    let display_order = request.display_order.unwrap_or(0);
    
    let result = sqlx::query(
        "INSERT INTO variant_values (variant_type_id, value, code, display_order, hex_color) 
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(request.variant_type_id)
    .bind(&request.value)
    .bind(&request.code)
    .bind(display_order)
    .bind(&request.hex_color)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_variant_value(pool, result.last_insert_rowid()).await
}

#[command]
pub async fn update_variant_value(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: UpdateVariantValueRequest
) -> Result<VariantValue, String> {
    let pool_ref = pool.inner();
    
    let display_order = request.display_order.unwrap_or(0);
    
    sqlx::query(
        "UPDATE variant_values 
         SET value = ?1, code = ?2, display_order = ?3, hex_color = ?4, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?5"
    )
    .bind(&request.value)
    .bind(&request.code)
    .bind(display_order)
    .bind(&request.hex_color)
    .bind(id)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_variant_value(pool, id).await
}

#[command]
pub async fn delete_variant_value(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let pool_ref = pool.inner();
    
    sqlx::query("DELETE FROM variant_values WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== PRODUCT VARIANTS ====================

#[command]
pub async fn get_product_variants(
    pool: State<'_, SqlitePool>,
    product_id: i64
) -> Result<Vec<ProductVariantWithValues>, String> {
    let pool_ref = pool.inner();
    
    // Get all variants for the product
    let variant_rows = sqlx::query(
        "SELECT id, product_id, sku, barcode, variant_name, cost_price, selling_price, 
         wholesale_price, is_active, created_at, updated_at 
         FROM product_variants 
         WHERE product_id = ?1 
         ORDER BY variant_name"
    )
    .bind(product_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    let mut variants = Vec::new();

    for variant_row in variant_rows {
        let variant_id: i64 = variant_row.get("id");
        
        // Get variant values for this variant
        let value_rows = sqlx::query(
            "SELECT vv.id, vv.variant_type_id, vv.value, vv.code, vv.display_order, 
             vv.hex_color, vv.is_active, vv.created_at, vv.updated_at
             FROM variant_values vv
             INNER JOIN product_variant_values pvv ON pvv.variant_value_id = vv.id
             WHERE pvv.product_variant_id = ?1
             ORDER BY vv.display_order"
        )
        .bind(variant_id)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| e.to_string())?;

        let variant_values: Vec<VariantValue> = value_rows.iter().map(|row| VariantValue {
            id: row.get("id"),
            variant_type_id: row.get("variant_type_id"),
            value: row.get("value"),
            code: row.try_get("code").ok().flatten(),
            display_order: row.get("display_order"),
            hex_color: row.try_get("hex_color").ok().flatten(),
            is_active: row.get("is_active"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        // Get inventory for this variant
        let inventory_row = sqlx::query(
            "SELECT id, product_variant_id, current_stock, minimum_stock, maximum_stock, 
             reserved_stock, available_stock, last_updated
             FROM variant_inventory
             WHERE product_variant_id = ?1"
        )
        .bind(variant_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| e.to_string())?;

        let inventory = inventory_row.map(|row| VariantInventory {
            id: row.get("id"),
            product_variant_id: row.get("product_variant_id"),
            current_stock: row.get("current_stock"),
            minimum_stock: row.get("minimum_stock"),
            maximum_stock: row.get("maximum_stock"),
            reserved_stock: row.get("reserved_stock"),
            available_stock: row.get("available_stock"),
            last_updated: row.get("last_updated"),
        });

        variants.push(ProductVariantWithValues {
            id: variant_row.get("id"),
            product_id: variant_row.get("product_id"),
            sku: variant_row.get("sku"),
            barcode: variant_row.try_get("barcode").ok().flatten(),
            variant_name: variant_row.try_get("variant_name").ok().flatten(),
            cost_price: variant_row.get("cost_price"),
            selling_price: variant_row.try_get("selling_price").ok().flatten(),
            wholesale_price: variant_row.try_get("wholesale_price").ok().flatten(),
            is_active: variant_row.get("is_active"),
            created_at: variant_row.get("created_at"),
            updated_at: variant_row.get("updated_at"),
            variant_values,
            inventory,
        });
    }

    Ok(variants)
}

#[command]
pub async fn create_product_variant(
    pool: State<'_, SqlitePool>,
    request: CreateProductVariantRequest
) -> Result<ProductVariantWithValues, String> {
    let pool_ref = pool.inner();
    
    // Create the variant
    let result = sqlx::query(
        "INSERT INTO product_variants 
         (product_id, sku, barcode, variant_name, cost_price, selling_price, wholesale_price) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(request.product_id)
    .bind(&request.sku)
    .bind(&request.barcode)
    .bind(&request.variant_name)
    .bind(request.cost_price)
    .bind(&request.selling_price)
    .bind(&request.wholesale_price)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    let variant_id = result.last_insert_rowid();

    // Link variant values
    for value_id in &request.variant_value_ids {
        sqlx::query(
            "INSERT INTO product_variant_values (product_variant_id, variant_value_id) 
             VALUES (?1, ?2)"
        )
        .bind(variant_id)
        .bind(value_id)
        .execute(pool_ref)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Create initial inventory record
    sqlx::query(
        "INSERT INTO variant_inventory (product_variant_id, current_stock, minimum_stock, maximum_stock, available_stock) 
         VALUES (?1, 0, 0, 0, 0)"
    )
    .bind(variant_id)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    // Fetch and return the complete variant
    let variants = get_product_variants(pool, request.product_id).await?;
    variants.into_iter()
        .find(|v| v.id == variant_id)
        .ok_or_else(|| "Failed to retrieve created variant".to_string())
}

#[command]
pub async fn update_product_variant(
    pool: State<'_, SqlitePool>,
    variant_id: i64,
    request: UpdateProductVariantRequest
) -> Result<ProductVariant, String> {
    let pool_ref = pool.inner();
    
    sqlx::query(
        "UPDATE product_variants 
         SET sku = ?1, barcode = ?2, variant_name = ?3, cost_price = ?4, 
         selling_price = ?5, wholesale_price = ?6, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?7"
    )
    .bind(&request.sku)
    .bind(&request.barcode)
    .bind(&request.variant_name)
    .bind(request.cost_price)
    .bind(&request.selling_price)
    .bind(&request.wholesale_price)
    .bind(variant_id)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_product_variant(pool, variant_id).await
}

#[command]
pub async fn get_product_variant(pool: State<'_, SqlitePool>, variant_id: i64) -> Result<ProductVariant, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, product_id, sku, barcode, variant_name, cost_price, selling_price, 
         wholesale_price, is_active, created_at, updated_at 
         FROM product_variants 
         WHERE id = ?1"
    )
    .bind(variant_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ProductVariant {
        id: row.get("id"),
        product_id: row.get("product_id"),
        sku: row.get("sku"),
        barcode: row.try_get("barcode").ok().flatten(),
        variant_name: row.try_get("variant_name").ok().flatten(),
        cost_price: row.get("cost_price"),
        selling_price: row.try_get("selling_price").ok().flatten(),
        wholesale_price: row.try_get("wholesale_price").ok().flatten(),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn delete_product_variant(pool: State<'_, SqlitePool>, variant_id: i64) -> Result<(), String> {
    let pool_ref = pool.inner();
    
    sqlx::query("DELETE FROM product_variants WHERE id = ?1")
        .bind(variant_id)
        .execute(pool_ref)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== VARIANT INVENTORY ====================

#[command]
pub async fn update_variant_inventory(
    pool: State<'_, SqlitePool>,
    variant_id: i64,
    current_stock: i32,
    minimum_stock: i32,
    maximum_stock: i32
) -> Result<VariantInventory, String> {
    let pool_ref = pool.inner();
    
    let available_stock = current_stock; // Can be enhanced with reserved stock logic
    
    sqlx::query(
        "UPDATE variant_inventory 
         SET current_stock = ?1, minimum_stock = ?2, maximum_stock = ?3, 
         available_stock = ?4, last_updated = CURRENT_TIMESTAMP 
         WHERE product_variant_id = ?5"
    )
    .bind(current_stock)
    .bind(minimum_stock)
    .bind(maximum_stock)
    .bind(available_stock)
    .bind(variant_id)
    .execute(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    get_variant_inventory(pool, variant_id).await
}

#[command]
pub async fn get_variant_inventory(
    pool: State<'_, SqlitePool>,
    variant_id: i64
) -> Result<VariantInventory, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, product_variant_id, current_stock, minimum_stock, maximum_stock, 
         reserved_stock, available_stock, last_updated
         FROM variant_inventory
         WHERE product_variant_id = ?1"
    )
    .bind(variant_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| e.to_string())?;

    Ok(VariantInventory {
        id: row.get("id"),
        product_variant_id: row.get("product_variant_id"),
        current_stock: row.get("current_stock"),
        minimum_stock: row.get("minimum_stock"),
        maximum_stock: row.get("maximum_stock"),
        reserved_stock: row.get("reserved_stock"),
        available_stock: row.get("available_stock"),
        last_updated: row.get("last_updated"),
    })
}
