use tauri::{command, State};
use sqlx::{SqlitePool, Row};
<<<<<<< Updated upstream
use crate::models::{Product, CreateProductRequest, ProductSearchRequest};

#[command]
pub async fn get_products(pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    let pool_ref = pool.inner();
    
    let rows = sqlx::query(
        "SELECT id, sku, barcode, name, description, category, subcategory, brand,
                unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                is_active, is_taxable, weight, dimensions, supplier_info, reorder_point,
                created_at, updated_at
         FROM products
         WHERE is_active = 1
         ORDER BY name ASC"
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut products = Vec::new();
    for row in rows {
        let product = Product {
=======
use crate::models::{Product, CreateProductRequest};

#[command]
pub async fn get_products(pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    println!("DEBUG(products): get_products called");
    let pool_ref = pool.inner();

    let rows = sqlx::query(
        r#"
        SELECT id, sku, barcode, name, description, category, unit_of_measure,
               cost_price, selling_price, is_active, created_at, updated_at
        FROM products
        ORDER BY name COLLATE NOCASE
        "#,
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(products): query failed: {}", e);
        format!("Database error: {}", e)
    })?;

    let mut products = Vec::with_capacity(rows.len());
    for row in rows {
        products.push(Product {
>>>>>>> Stashed changes
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            barcode: row.try_get("barcode").ok().flatten(),
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").ok().flatten(),
<<<<<<< Updated upstream
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

=======
            unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
            is_active: {
                match row.try_get::<bool, _>("is_active") {
                    Ok(b) => b,
                    Err(_) => {
                        let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                        v != 0
                    }
                }
            },
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    println!("DEBUG(products): returning {} products", products.len());
>>>>>>> Stashed changes
    Ok(products)
}

#[command]
<<<<<<< Updated upstream
pub async fn search_products(
    pool: State<'_, SqlitePool>,
    request: ProductSearchRequest,
) -> Result<Vec<Product>, String> {
    let pool_ref = pool.inner();
    
    let mut query = String::from(
        "SELECT id, sku, barcode, name, description, category, subcategory, brand,
                unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                is_active, is_taxable, weight, dimensions, supplier_info, reorder_point,
                created_at, updated_at
         FROM products
         WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    let mut param_count = 0;

    if let Some(query_text) = request.query {
        if !query_text.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND (name LIKE ?{} OR sku LIKE ?{} OR barcode LIKE ?{})", 
                param_count, param_count, param_count));
            params.push(format!("%{}%", query_text));
        }
    }

    if let Some(category) = request.category {
        if !category.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND category = ?{}", param_count));
            params.push(category);
        }
    }

    if let Some(brand) = request.brand {
        if !brand.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND brand = ?{}", param_count));
            params.push(brand);
        }
    }

    if let Some(is_active) = request.is_active {
        param_count += 1;
        query.push_str(&format!(" AND is_active = ?{}", param_count));
        params.push(if is_active { "1" } else { "0" }.to_string());
    }

    query.push_str(" ORDER BY name ASC");

    if let Some(limit) = request.limit {
        param_count += 1;
        query.push_str(&format!(" LIMIT ?{}", param_count));
        params.push(limit.to_string());
    }

    if let Some(offset) = request.offset {
        param_count += 1;
        query.push_str(&format!(" OFFSET ?{}", param_count));
        params.push(offset.to_string());
    }

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

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

#[command]
pub async fn create_product(
    pool: State<'_, SqlitePool>,
    request: CreateProductRequest,
) -> Result<Product, String> {
    let pool_ref = pool.inner();
    
    // Check if SKU already exists
    let existing = sqlx::query("SELECT id FROM products WHERE sku = ?1")
        .bind(&request.sku)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_some() {
        return Err("SKU already exists".to_string());
    }

    // Check if barcode already exists (if provided)
    if let Some(barcode) = &request.barcode {
        if !barcode.is_empty() {
            let existing_barcode = sqlx::query("SELECT id FROM products WHERE barcode = ?1")
                .bind(barcode)
                .fetch_optional(pool_ref)
                .await
                .map_err(|e| format!("Database error: {}", e))?;

            if existing_barcode.is_some() {
                return Err("Barcode already exists".to_string());
            }
        }
    }

    // Create product
    let result = sqlx::query(
        "INSERT INTO products (sku, barcode, name, description, category, subcategory, brand,
                              unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                              is_active, is_taxable, weight, dimensions, supplier_info, reorder_point)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)"
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
    .bind(true) // is_active
    .bind(request.is_taxable)
    .bind(request.weight)
    .bind(&request.dimensions)
    .bind(&request.supplier_info)
    .bind(request.reorder_point)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create product: {}", e))?;

    let product_id = result.last_insert_rowid();

    // Create inventory record
    sqlx::query(
        "INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock, reserved_stock, available_stock)
         VALUES (?1, 0, ?2, 0, 0, 0)"
    )
    .bind(product_id)
    .bind(request.reorder_point)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create inventory record: {}", e))?;

    // Get the created product
    let row = sqlx::query(
        "SELECT id, sku, barcode, name, description, category, subcategory, brand,
                unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                is_active, is_taxable, weight, dimensions, supplier_info, reorder_point,
                created_at, updated_at
         FROM products WHERE id = ?1"
    )
    .bind(product_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created product: {}", e))?;
=======
pub async fn create_product(pool: State<'_, SqlitePool>, req: CreateProductRequest) -> Result<Product, String> {
    println!("DEBUG(products): create_product sku='{}' name='{}'", req.sku, req.name);
    let pool_ref = pool.inner();

    // Insert product
    let res = sqlx::query(
        r#"
        INSERT INTO products (sku, barcode, name, description, category, unit_of_measure, cost_price, selling_price, is_active, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(&req.sku)
    .bind(&req.barcode)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.unit_of_measure)
    .bind(req.cost_price)
    .bind(req.selling_price)
    .execute(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(products): insert failed: {}", e);
        // Unique constraint on sku/barcode -> provide clearer message
        if e.to_string().contains("UNIQUE") {
            "SKU or barcode already exists".to_string()
        } else {
            format!("Failed to create product: {}", e)
        }
    })?;

    let id = res.last_insert_rowid();

    // Fetch created product
    let row = sqlx::query(
        r#"
        SELECT id, sku, barcode, name, description, category, unit_of_measure,
               cost_price, selling_price, is_active, created_at, updated_at
        FROM products WHERE id = ?1
        "#,
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(products): fetch after insert failed: {}", e);
        format!("Failed to fetch created product: {}", e)
    })?;

    let product = Product {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        sku: row.try_get("sku").map_err(|e| e.to_string())?,
        barcode: row.try_get("barcode").ok().flatten(),
        name: row.try_get("name").map_err(|e| e.to_string())?,
        description: row.try_get("description").ok().flatten(),
        category: row.try_get("category").ok().flatten(),
        unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
        cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
        selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
        is_active: {
            match row.try_get::<bool, _>("is_active") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                    v != 0
                }
            }
        },
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    println!("DEBUG(products): created product id={}", product.id);
    Ok(product)
}

#[command]
pub async fn update_product(pool: State<'_, SqlitePool>, id: i64, req: CreateProductRequest) -> Result<Product, String> {
    println!("DEBUG(products): update_product id={} sku='{}'", id, req.sku);
    let pool_ref = pool.inner();

    sqlx::query(
        r#"
        UPDATE products
        SET sku = ?1, barcode = ?2, name = ?3, description = ?4, category = ?5,
            unit_of_measure = ?6, cost_price = ?7, selling_price = ?8, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?9
        "#,
    )
    .bind(&req.sku)
    .bind(&req.barcode)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.unit_of_measure)
    .bind(req.cost_price)
    .bind(req.selling_price)
    .bind(id)
    .execute(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(products): update failed: {}", e);
        if e.to_string().contains("UNIQUE") {
            "SKU or barcode already exists".to_string()
        } else {
            format!("Failed to update product: {}", e)
        }
    })?;

    // Fetch updated product
    let row = sqlx::query(
        r#"
        SELECT id, sku, barcode, name, description, category, unit_of_measure,
               cost_price, selling_price, is_active, created_at, updated_at
        FROM products WHERE id = ?1
        "#,
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| {
        println!("DEBUG(products): fetch after update failed: {}", e);
        format!("Failed to fetch updated product: {}", e)
    })?;
>>>>>>> Stashed changes

    let product = Product {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        sku: row.try_get("sku").map_err(|e| e.to_string())?,
        barcode: row.try_get("barcode").ok().flatten(),
        name: row.try_get("name").map_err(|e| e.to_string())?,
        description: row.try_get("description").ok().flatten(),
        category: row.try_get("category").ok().flatten(),
<<<<<<< Updated upstream
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
=======
        unit_of_measure: row.try_get("unit_of_measure").map_err(|e| e.to_string())?,
        cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
        selling_price: row.try_get("selling_price").map_err(|e| e.to_string())?,
        is_active: {
            match row.try_get::<bool, _>("is_active") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                    v != 0
                }
            }
        },
>>>>>>> Stashed changes
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

<<<<<<< Updated upstream
=======
    println!("DEBUG(products): updated product id={}", product.id);
>>>>>>> Stashed changes
    Ok(product)
}

#[command]
<<<<<<< Updated upstream
pub async fn update_product(
    pool: State<'_, SqlitePool>,
    id: i64,
    request: CreateProductRequest,
) -> Result<Product, String> {
    let pool_ref = pool.inner();
    
    // Check if product exists
    let existing = sqlx::query("SELECT id FROM products WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_none() {
        return Err("Product not found".to_string());
    }

    // Check if SKU already exists for different product
    let existing_sku = sqlx::query("SELECT id FROM products WHERE sku = ?1 AND id != ?2")
        .bind(&request.sku)
        .bind(id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if existing_sku.is_some() {
        return Err("SKU already exists for another product".to_string());
    }

    // Check if barcode already exists for different product (if provided)
    if let Some(barcode) = &request.barcode {
        if !barcode.is_empty() {
            let existing_barcode = sqlx::query("SELECT id FROM products WHERE barcode = ?1 AND id != ?2")
                .bind(barcode)
                .bind(id)
                .fetch_optional(pool_ref)
                .await
                .map_err(|e| format!("Database error: {}", e))?;

            if existing_barcode.is_some() {
                return Err("Barcode already exists for another product".to_string());
            }
        }
    }

    // Update product
    sqlx::query(
        "UPDATE products SET 
            sku = ?1, barcode = ?2, name = ?3, description = ?4, category = ?5, subcategory = ?6,
            brand = ?7, unit_of_measure = ?8, cost_price = ?9, selling_price = ?10, wholesale_price = ?11,
            tax_rate = ?12, is_taxable = ?13, weight = ?14, dimensions = ?15, supplier_info = ?16,
            reorder_point = ?17, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?18"
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
    .bind(id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to update product: {}", e))?;

    // Update inventory minimum stock
    sqlx::query(
        "UPDATE inventory SET minimum_stock = ?1 WHERE product_id = ?2"
    )
    .bind(request.reorder_point)
    .bind(id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // Get the updated product
    let row = sqlx::query(
        "SELECT id, sku, barcode, name, description, category, subcategory, brand,
                unit_of_measure, cost_price, selling_price, wholesale_price, tax_rate,
                is_active, is_taxable, weight, dimensions, supplier_info, reorder_point,
                created_at, updated_at
         FROM products WHERE id = ?1"
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch updated product: {}", e))?;

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

    Ok(product)
}

#[command]
pub async fn delete_product(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();
    
    // Check if product exists and has no active sales
    let product_check = sqlx::query(
        "SELECT p.id, COUNT(si.id) as sale_count
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         WHERE p.id = ?1
         GROUP BY p.id"
    )
    .bind(id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let sale_count: i64 = product_check.try_get("sale_count").map_err(|e| e.to_string())?;
    
    if sale_count > 0 {
        return Err("Cannot delete product with existing sales history".to_string());
    }

    // Soft delete by setting is_active to false
=======
pub async fn delete_product(pool: State<'_, SqlitePool>, id: i64) -> Result<bool, String> {
    println!("DEBUG(products): delete_product id={}", id);
    let pool_ref = pool.inner();

>>>>>>> Stashed changes
    sqlx::query("UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1")
        .bind(id)
        .execute(pool_ref)
        .await
<<<<<<< Updated upstream
        .map_err(|e| format!("Failed to delete product: {}", e))?;

=======
        .map_err(|e| {
            println!("DEBUG(products): delete (deactivate) failed: {}", e);
            format!("Failed to deactivate product: {}", e)
        })?;

    println!("DEBUG(products): deactivated product id={}", id);
>>>>>>> Stashed changes
    Ok(true)
}