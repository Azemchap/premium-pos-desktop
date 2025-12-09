use tauri::{command, State};
use crate::models::{Supplier, CreateSupplierRequest, UpdateSupplierRequest};
use sqlx::{SqlitePool, Row};

// Generate unique supplier number
async fn generate_supplier_number(pool: &SqlitePool) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM suppliers")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(format!("SUP{:06}", count + 1))
}

#[command]
pub async fn get_suppliers(
    pool: State<'_, SqlitePool>,
    is_active: Option<bool>,
) -> Result<Vec<Supplier>, String> {
    println!("DEBUG(suppliers): get_suppliers called");
    let pool_ref = pool.inner();

    let mut query = "SELECT * FROM suppliers WHERE 1=1".to_string();

    if let Some(active) = is_active {
        query.push_str(&format!(" AND is_active = {}", if active { 1 } else { 0 }));
    }

    query.push_str(" ORDER BY company_name ASC");

    let rows = sqlx::query(&query)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): query error: {}", e);
            format!("Database error: {}", e)
        })?;

    let mut suppliers = Vec::with_capacity(rows.len());
    for row in rows {
        suppliers.push(Supplier {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            supplier_number: row.try_get("supplier_number").map_err(|e| e.to_string())?,
            company_name: row.try_get("company_name").map_err(|e| e.to_string())?,
            contact_name: row.try_get("contact_name").ok(),
            email: row.try_get("email").ok(),
            phone: row.try_get("phone").ok(),
            website: row.try_get("website").ok(),
            address: row.try_get("address").ok(),
            city: row.try_get("city").ok(),
            state: row.try_get("state").ok(),
            zip_code: row.try_get("zip_code").ok(),
            country: row.try_get("country").ok(),
            payment_terms: row.try_get("payment_terms").ok(),
            tax_id: row.try_get("tax_id").ok(),
            notes: row.try_get("notes").ok(),
            rating: row.try_get("rating").ok(),
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

    println!("DEBUG(suppliers): returning {} suppliers", suppliers.len());
    Ok(suppliers)
}

#[command]
pub async fn get_supplier(
    pool: State<'_, SqlitePool>,
    supplier_id: i64,
) -> Result<Supplier, String> {
    println!("DEBUG(suppliers): get_supplier id={}", supplier_id);
    let pool_ref = pool.inner();

    let row = sqlx::query("SELECT * FROM suppliers WHERE id = ?1")
        .bind(supplier_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): query error: {}", e);
            format!("Database error: {}", e)
        })?;

    match row {
        Some(row) => {
            Ok(Supplier {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                supplier_number: row.try_get("supplier_number").map_err(|e| e.to_string())?,
                company_name: row.try_get("company_name").map_err(|e| e.to_string())?,
                contact_name: row.try_get("contact_name").ok(),
                email: row.try_get("email").ok(),
                phone: row.try_get("phone").ok(),
                website: row.try_get("website").ok(),
                address: row.try_get("address").ok(),
                city: row.try_get("city").ok(),
                state: row.try_get("state").ok(),
                zip_code: row.try_get("zip_code").ok(),
                country: row.try_get("country").ok(),
                payment_terms: row.try_get("payment_terms").ok(),
                tax_id: row.try_get("tax_id").ok(),
                notes: row.try_get("notes").ok(),
                rating: row.try_get("rating").ok(),
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
            })
        }
        None => Err("Supplier not found".to_string()),
    }
}

#[command]
pub async fn create_supplier(
    pool: State<'_, SqlitePool>,
    request: CreateSupplierRequest,
) -> Result<Supplier, String> {
    println!("DEBUG(suppliers): create_supplier company='{}'", request.company_name);
    let pool_ref = pool.inner();

    // Generate supplier number
    let supplier_number = generate_supplier_number(pool_ref).await?;

    let result = sqlx::query(
        "INSERT INTO suppliers (
            supplier_number, company_name, contact_name, email, phone, website,
            address, city, state, zip_code, country, payment_terms, tax_id, notes, rating
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
    )
        .bind(&supplier_number)
        .bind(&request.company_name)
        .bind(&request.contact_name)
        .bind(&request.email)
        .bind(&request.phone)
        .bind(&request.website)
        .bind(&request.address)
        .bind(&request.city)
        .bind(&request.state)
        .bind(&request.zip_code)
        .bind(&request.country)
        .bind(&request.payment_terms)
        .bind(&request.tax_id)
        .bind(&request.notes)
        .bind(&request.rating)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): insert error: {}", e);
            format!("Database error: {}", e)
        })?;

    let supplier_id = result.last_insert_rowid();
    println!("DEBUG(suppliers): created supplier id={}", supplier_id);

    get_supplier(pool, supplier_id).await
}

#[command]
pub async fn update_supplier(
    pool: State<'_, SqlitePool>,
    supplier_id: i64,
    request: UpdateSupplierRequest,
) -> Result<Supplier, String> {
    println!("DEBUG(suppliers): update_supplier id={}", supplier_id);
    let pool_ref = pool.inner();

    // Check if supplier exists
    let exists = sqlx::query("SELECT id FROM suppliers WHERE id = ?1")
        .bind(supplier_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): exists query error: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_none() {
        println!("DEBUG(suppliers): supplier not found");
        return Err("Supplier not found".to_string());
    }

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut query_builder = sqlx::query("SELECT 1"); // Dummy to start

    if request.company_name.is_some() {
        updates.push("company_name = ?");
    }
    if request.contact_name.is_some() {
        updates.push("contact_name = ?");
    }
    if request.email.is_some() {
        updates.push("email = ?");
    }
    if request.phone.is_some() {
        updates.push("phone = ?");
    }
    if request.website.is_some() {
        updates.push("website = ?");
    }
    if request.address.is_some() {
        updates.push("address = ?");
    }
    if request.city.is_some() {
        updates.push("city = ?");
    }
    if request.state.is_some() {
        updates.push("state = ?");
    }
    if request.zip_code.is_some() {
        updates.push("zip_code = ?");
    }
    if request.country.is_some() {
        updates.push("country = ?");
    }
    if request.payment_terms.is_some() {
        updates.push("payment_terms = ?");
    }
    if request.tax_id.is_some() {
        updates.push("tax_id = ?");
    }
    if request.notes.is_some() {
        updates.push("notes = ?");
    }
    if request.rating.is_some() {
        updates.push("rating = ?");
    }
    if request.is_active.is_some() {
        updates.push("is_active = ?");
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    let query_str = format!(
        "UPDATE suppliers SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut q = sqlx::query(&query_str);

    if let Some(v) = &request.company_name { q = q.bind(v); }
    if let Some(v) = &request.contact_name { q = q.bind(v); }
    if let Some(v) = &request.email { q = q.bind(v); }
    if let Some(v) = &request.phone { q = q.bind(v); }
    if let Some(v) = &request.website { q = q.bind(v); }
    if let Some(v) = &request.address { q = q.bind(v); }
    if let Some(v) = &request.city { q = q.bind(v); }
    if let Some(v) = &request.state { q = q.bind(v); }
    if let Some(v) = &request.zip_code { q = q.bind(v); }
    if let Some(v) = &request.country { q = q.bind(v); }
    if let Some(v) = &request.payment_terms { q = q.bind(v); }
    if let Some(v) = &request.tax_id { q = q.bind(v); }
    if let Some(v) = &request.notes { q = q.bind(v); }
    if let Some(v) = &request.rating { q = q.bind(v); }
    if let Some(v) = request.is_active { q = q.bind(v); }

    q = q.bind(supplier_id);

    q.execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): update error: {}", e);
            format!("Database error: {}", e)
        })?;

    println!("DEBUG(suppliers): updated supplier id={}", supplier_id);

    get_supplier(pool, supplier_id).await
}

#[command]
pub async fn delete_supplier(
    pool: State<'_, SqlitePool>,
    supplier_id: i64,
) -> Result<String, String> {
    println!("DEBUG(suppliers): delete_supplier id={}", supplier_id);
    let pool_ref = pool.inner();

    let result = sqlx::query("DELETE FROM suppliers WHERE id = ?1")
        .bind(supplier_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): delete error: {}", e);
            format!("Database error: {}", e)
        })?;

    if result.rows_affected() == 0 {
        return Err("Supplier not found".to_string());
    }

    println!("DEBUG(suppliers): deleted supplier id={}", supplier_id);
    Ok("Supplier deleted successfully".to_string())
}

#[command]
pub async fn search_suppliers(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<Vec<Supplier>, String> {
    println!("DEBUG(suppliers): search_suppliers query='{}'", query);
    let pool_ref = pool.inner();

    let search_pattern = format!("%{}%", query);

    let rows = sqlx::query(
        "SELECT * FROM suppliers
         WHERE company_name LIKE ?1
            OR contact_name LIKE ?1
            OR email LIKE ?1
            OR phone LIKE ?1
            OR supplier_number LIKE ?1
         ORDER BY company_name ASC
         LIMIT 50"
    )
        .bind(&search_pattern)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| {
            println!("DEBUG(suppliers): search error: {}", e);
            format!("Database error: {}", e)
        })?;

    let mut suppliers = Vec::with_capacity(rows.len());
    for row in rows {
        suppliers.push(Supplier {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            supplier_number: row.try_get("supplier_number").map_err(|e| e.to_string())?,
            company_name: row.try_get("company_name").map_err(|e| e.to_string())?,
            contact_name: row.try_get("contact_name").ok(),
            email: row.try_get("email").ok(),
            phone: row.try_get("phone").ok(),
            website: row.try_get("website").ok(),
            address: row.try_get("address").ok(),
            city: row.try_get("city").ok(),
            state: row.try_get("state").ok(),
            zip_code: row.try_get("zip_code").ok(),
            country: row.try_get("country").ok(),
            payment_terms: row.try_get("payment_terms").ok(),
            tax_id: row.try_get("tax_id").ok(),
            notes: row.try_get("notes").ok(),
            rating: row.try_get("rating").ok(),
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

    println!("DEBUG(suppliers): found {} suppliers", suppliers.len());
    Ok(suppliers)
}
