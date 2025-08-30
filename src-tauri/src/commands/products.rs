use tauri::{command, State};
use crate::models::{Product, CreateProductRequest, ProductSearchRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn get_products(pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    let rows = sqlx::query("SELECT * FROM products WHERE is_active = 1 ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").map_err(|e| e.to_string())?,
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            price: row.try_get("price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").ok().flatten(),
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").ok().flatten(),
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").ok().flatten(),
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").ok().flatten(),
            barcode: row.try_get("barcode").ok().flatten(),
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
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
    let row = sqlx::query("SELECT * FROM products WHERE id = ? AND is_active = 1")
        .bind(product_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").map_err(|e| e.to_string())?,
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            price: row.try_get("price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").ok().flatten(),
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").ok().flatten(),
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").ok().flatten(),
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").ok().flatten(),
            barcode: row.try_get("barcode").ok().flatten(),
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
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
        "INSERT INTO products (sku, name, description, category, subcategory, brand, price, wholesale_price, cost_price, tax_rate, is_taxable, weight, dimensions, supplier_info, reorder_point, barcode, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
    )
    .bind(&request.sku)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.category)
    .bind(&request.subcategory)
    .bind(&request.brand)
    .bind(request.price)
    .bind(&request.wholesale_price)
    .bind(request.cost_price)
    .bind(&request.tax_rate)
    .bind(request.is_taxable)
    .bind(&request.weight)
    .bind(&request.dimensions)
    .bind(&request.supplier_info)
    .bind(&request.reorder_point)
    .bind(&request.barcode)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let product = Product {
        id: product_id,
        sku: request.sku,
        name: request.name,
        description: request.description,
        category: request.category,
        subcategory: request.subcategory,
        brand: request.brand,
        price: request.price,
        wholesale_price: request.wholesale_price,
        cost_price: request.cost_price,
        tax_rate: request.tax_rate,
        is_taxable: request.is_taxable,
        weight: request.weight,
        dimensions: request.dimensions,
        supplier_info: request.supplier_info,
        reorder_point: request.reorder_point,
        barcode: request.barcode,
        is_active: true,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
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
        "UPDATE products SET sku = ?, name = ?, description = ?, category = ?, subcategory = ?, brand = ?, price = ?, wholesale_price = ?, cost_price = ?, tax_rate = ?, is_taxable = ?, weight = ?, dimensions = ?, supplier_info = ?, reorder_point = ?, barcode = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&request.sku)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.category)
    .bind(&request.subcategory)
    .bind(&request.brand)
    .bind(request.price)
    .bind(&request.wholesale_price)
    .bind(request.cost_price)
    .bind(&request.tax_rate)
    .bind(request.is_taxable)
    .bind(&request.weight)
    .bind(&request.dimensions)
    .bind(&request.supplier_info)
    .bind(&request.reorder_point)
    .bind(&request.barcode)
    .bind(chrono::Utc::now().naive_utc())
    .bind(product_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let product = Product {
        id: product_id,
        sku: request.sku,
        name: request.name,
        description: request.description,
        category: request.category,
        subcategory: request.subcategory,
        brand: request.brand,
        price: request.price,
        wholesale_price: request.wholesale_price,
        cost_price: request.cost_price,
        tax_rate: request.tax_rate,
        is_taxable: request.is_taxable,
        weight: request.weight,
        dimensions: request.dimensions,
        supplier_info: request.supplier_info,
        reorder_point: request.reorder_point,
        barcode: request.barcode,
        is_active: true,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(product)
}

#[tauri::command]
pub async fn delete_product(
    pool: State<'_, SqlitePool>,
    product_id: i64,
) -> Result<bool, String> {
    let result = sqlx::query("UPDATE products SET is_active = 0 WHERE id = ?")
        .bind(product_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

#[tauri::command]
pub async fn search_products(
    pool: State<'_, SqlitePool>,
    request: ProductSearchRequest,
) -> Result<Vec<Product>, String> {
    let mut query = String::from("SELECT * FROM products WHERE is_active = 1");
    let mut params: Vec<String> = Vec::new();

    if let Some(search_term) = &request.search_term {
        if !search_term.is_empty() {
            query.push_str(" AND (name LIKE ? OR sku LIKE ? OR description LIKE ? OR category LIKE ?)");
            let like_term = format!("%{}%", search_term);
            params.extend(vec![like_term.clone(), like_term.clone(), like_term.clone(), like_term]);
        }
    }

    if let Some(category) = &request.category {
        if !category.is_empty() {
            query.push_str(" AND category = ?");
            params.push(category.clone());
        }
    }

    if let Some(brand) = &request.brand {
        if !brand.is_empty() {
            query.push_str(" AND brand = ?");
            params.push(brand.clone());
        }
    }

    if let Some(min_price) = request.min_price {
        query.push_str(" AND price >= ?");
        params.push(min_price.to_string());
    }

    if let Some(max_price) = request.max_price {
        query.push_str(" AND price <= ?");
        params.push(max_price.to_string());
    }

    query.push_str(" ORDER BY name");

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        let product = Product {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sku: row.try_get("sku").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok().flatten(),
            category: row.try_get("category").map_err(|e| e.to_string())?,
            subcategory: row.try_get("subcategory").ok().flatten(),
            category: row.try_get("category").map_err(|e| e.to_string())?,
            subcategory: row.try_get("subcategory").ok().flatten(),
            brand: row.try_get("brand").ok().flatten(),
            price: row.try_get("price").map_err(|e| e.to_string())?,
            wholesale_price: row.try_get("wholesale_price").ok().flatten(),
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            tax_rate: row.try_get("tax_rate").ok().flatten(),
            is_taxable: row.try_get("is_taxable").map_err(|e| e.to_string())?,
            weight: row.try_get("weight").ok().flatten(),
            dimensions: row.try_get("dimensions").ok().flatten(),
            supplier_info: row.try_get("supplier_info").ok().flatten(),
            reorder_point: row.try_get("reorder_point").ok().flatten(),
            barcode: row.try_get("barcode").ok().flatten(),
            is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        products.push(product);
    }

    Ok(products)
}
2. Fix All Other Command Files
Let me provide the corrected versions of other command files that might have similar issues:

src-tauri/src/commands/auth.rs:

use tauri::{command, State};
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use crate::models::{LoginRequest, LoginResponse, User, CreateUserRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn register_user(
    pool: State<'_, SqlitePool>,
    request: CreateUserRequest,
) -> Result<User, String> {
    // Check if username already exists
    let existing_user = sqlx::query("SELECT id FROM users WHERE username = ?")
        .bind(&request.username)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if existing_user.is_some() {
        return Err("Username already exists".to_string());
    }

    // Hash password
    let hashed_password = hash(&request.password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    // Create user
    let user_id = sqlx::query(
        "INSERT INTO users (username, email, password_hash, pin_code, permissions, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    )
    .bind(&request.username)
    .bind(&request.email)
    .bind(&hashed_password)
    .bind(&request.pin_code)
    .bind(&request.permissions)
    .bind(&request.role)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let user = User {
        id: user_id,
        username: request.username,
        email: request.email,
        password_hash: hashed_password,
        pin_code: request.pin_code,
        permissions: request.permissions,
        role: request.role,
        is_active: true,
        last_login: None,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Ok(user)
}

#[tauri::command]
pub async fn login_user(
    pool: State<'_, SqlitePool>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    let row = sqlx::query("SELECT * FROM users WHERE username = ? AND is_active = 1")
        .bind(&request.username)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let stored_hash: String = row.try_get("password_hash").map_err(|e| e.to_string())?;
        
        if verify(&request.password, &stored_hash).map_err(|e| e.to_string())? {
            let user = User {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                username: row.try_get("username").map_err(|e| e.to_string())?,
                email: row.try_get("email").map_err(|e| e.to_string())?,
                password_hash: stored_hash,
                pin_code: row.try_get("pin_code").ok().flatten(),
                permissions: row.try_get("permissions").ok().flatten(),
                role: row.try_get("role").map_err(|e| e.to_string())?,
                is_active: row.try_get("is_active").map_err(|e| e.to_string())?,
                last_login: row.try_get("last_login").ok().flatten(),
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            };

            // Generate session token
            let session_token = Uuid::new_v4().to_string();

            // Update last login
            sqlx::query("UPDATE users SET last_login = ? WHERE id = ?")
                .bind(chrono::Utc::now().naive_utc())
                .bind(user.id)
                .execute(pool.inner())
                .await
                .map_err(|e| e.to_string())?;

            Ok(LoginResponse {
                user,
                session_token,
            })
        } else {
            Err("Invalid password".to_string())
        }
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
pub async fn verify_session(
    pool: State<'_, SqlitePool>,
    session_token: String,
) -> Result<Option<User>, String> {
    // In a real application, you would store and validate session tokens
    // For now, we'll just return None to indicate invalid session
    Ok(None)
}