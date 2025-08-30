use tauri::{command, State};
use crate::models::{Product, CreateProductRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn get_products(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Product>, String> {
    let rows = sqlx::query("SELECT * FROM products ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        products.push(product);
    }

    Ok(products)
}

#[tauri::command]
pub async fn get_product_by_id(
    pool: State<'_, SqlitePool>,
    product_id: i64,
) -> Result<Option<Product>, String> {
    let row = sqlx::query("SELECT * FROM products WHERE id = ?")
        .bind(product_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        Ok(Some(product))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn create_product(
    pool: State<'_, SqlitePool>,
    request: CreateProductRequest,
) -> Result<Product, String> {
    let product_id = sqlx::query(
        "INSERT INTO products (sku, barcode, name, description, category, subcategory, brand, unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate, is_active, is_taxable, weight, dimensions, supplier_info, reorder_point, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.sku)
    .bind(&request.barcode)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.category)
    .bind(&request.subcategory)
    .bind(&request.brand)
    .bind(&request.unit_of_measure)
    .bind(request.cost_price)
    .bind(request.selling_price)
    .bind(request.wholesale_price)
    .bind(request.tax_rate)
    .bind(request.is_taxable)
    .bind(request.weight)
    .bind(&request.dimensions)
    .bind(&request.supplier_info)
    .bind(request.reorder_point)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let product = Product {
        id: product_id,
        sku: request.sku,
        barcode: request.barcode,
        name: request.name,
        description: request.description,
        category: request.category,
        subcategory: request.subcategory,
        brand: request.brand,
        unit_of_measure: request.unit_of_measure,
        cost_price: request.cost_price,
        selling_price: request.selling_price,
        wholesale_price: request.wholesale_price,
        tax_rate: request.tax_rate,
        is_active: true,
        is_taxable: request.is_taxable,
        weight: request.weight,
        dimensions: request.dimensions,
        supplier_info: request.supplier_info,
        reorder_point: request.reorder_point,
        created_at: chrono::Utc::now().naive_utc().to_string(),
        updated_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(product)
}

#[tauri::command]
pub async fn update_product(
    pool: State<'_, SqlitePool>,
    product_id: i64,
    request: CreateProductRequest,
) -> Result<Product, String> {
    sqlx::query(
        "UPDATE products SET sku = ?, barcode = ?, name = ?, description = ?, category = ?, subcategory = ?, brand = ?, unit_of_measure = ?, cost_price = ?, selling_price = ?, wholesale_price = ?, tax_rate = ?, is_taxable = ?, weight = ?, dimensions = ?, supplier_info = ?, reorder_point = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&request.sku)
    .bind(&request.barcode)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.category)
    .bind(&request.subcategory)
    .bind(&request.brand)
    .bind(&request.unit_of_measure)
    .bind(request.cost_price)
    .bind(request.selling_price)
    .bind(request.wholesale_price)
    .bind(request.tax_rate)
    .bind(request.is_taxable)
    .bind(request.weight)
    .bind(&request.dimensions)
    .bind(&request.supplier_info)
    .bind(request.reorder_point)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(product_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let product = Product {
        id: product_id,
        sku: request.sku,
        barcode: request.barcode,
        name: request.name,
        description: request.description,
        category: request.category,
        subcategory: request.subcategory,
        brand: request.brand,
        unit_of_measure: request.unit_of_measure,
        cost_price: request.cost_price,
        selling_price: request.selling_price,
        wholesale_price: request.wholesale_price,
        tax_rate: request.tax_rate,
        is_active: true,
        is_taxable: request.is_taxable,
        weight: request.weight,
        dimensions: request.dimensions,
        supplier_info: request.supplier_info,
        reorder_point: request.reorder_point,
        created_at: chrono::Utc::now().naive_utc().to_string(),
        updated_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(product)
}

#[tauri::command]
pub async fn delete_product(
    pool: State<'_, SqlitePool>,
    product_id: i64,
) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(product_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

#[tauri::command]
pub async fn search_products(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<Vec<Product>, String> {
    let search_pattern = format!("%{}%", query);
    let rows = sqlx::query(
        "SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? OR barcode LIKE ? ORDER BY name"
    )
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").map_err(|e| e.to_string())?,
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").map_err(|e| e.to_string())?,
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        products.push(product);
    }

    Ok(products)
}
