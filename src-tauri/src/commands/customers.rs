use tauri::{command, State};
use crate::models::{Customer, CreateCustomerRequest, UpdateCustomerRequest};
use sqlx::{SqlitePool, Row};

// Generate unique customer number
async fn generate_customer_number(pool: &SqlitePool) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(format!("CUST{:06}", count + 1))
}

#[command]
pub async fn get_customers(
    pool: State<'_, SqlitePool>,
    status: Option<String>,
    customer_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Customer>, String> {
    let pool_ref = pool.inner();

    // Build query with parameterized conditions
    let mut query = String::from("SELECT * FROM customers WHERE 1=1");
    let mut conditions = Vec::new();

    if status.is_some() {
        query.push_str(" AND status = ?");
        conditions.push(status.as_ref().unwrap());
    }

    if customer_type.is_some() {
        query.push_str(" AND customer_type = ?");
        conditions.push(customer_type.as_ref().unwrap());
    }

    query.push_str(" ORDER BY created_at DESC");

    if let Some(l) = limit {
        query.push_str(&format!(" LIMIT {}", l)); // Safe: limit is i64, not user string
    }

    // Build query with bind parameters
    let mut sql_query = sqlx::query(&query);
    for condition in conditions {
        sql_query = sql_query.bind(condition);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut customers = Vec::with_capacity(rows.len());
    for row in rows {
        customers.push(Customer {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            customer_number: row.try_get("customer_number").map_err(|e| e.to_string())?,
            first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
            last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
            email: row.try_get("email").ok(),
            phone: row.try_get("phone").ok(),
            company: row.try_get("company").ok(),
            address: row.try_get("address").ok(),
            city: row.try_get("city").ok(),
            state: row.try_get("state").ok(),
            zip_code: row.try_get("zip_code").ok(),
            country: row.try_get("country").ok(),
            date_of_birth: row.try_get("date_of_birth").ok(),
            customer_type: row.try_get("customer_type").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            loyalty_points: row.try_get::<i32, _>("loyalty_points").unwrap_or(0),
            total_spent: row.try_get::<f64, _>("total_spent").unwrap_or(0.0),
            total_orders: row.try_get::<i32, _>("total_orders").unwrap_or(0),
            average_order_value: row.try_get::<f64, _>("average_order_value").unwrap_or(0.0),
            last_purchase_date: row.try_get("last_purchase_date").ok(),
            notes: row.try_get("notes").ok(),
            tags: row.try_get("tags").ok(),
            created_by: row.try_get("created_by").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    Ok(customers)
}

#[command]
pub async fn get_customer(
    pool: State<'_, SqlitePool>,
    customer_id: i64,
) -> Result<Customer, String> {
    let pool_ref = pool.inner();

    let row = sqlx::query("SELECT * FROM customers WHERE id = ?1")
        .bind(customer_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    match row {
        Some(row) => {
            Ok(Customer {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                customer_number: row.try_get("customer_number").map_err(|e| e.to_string())?,
                first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
                last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
                email: row.try_get("email").ok(),
                phone: row.try_get("phone").ok(),
                company: row.try_get("company").ok(),
                address: row.try_get("address").ok(),
                city: row.try_get("city").ok(),
                state: row.try_get("state").ok(),
                zip_code: row.try_get("zip_code").ok(),
                country: row.try_get("country").ok(),
                date_of_birth: row.try_get("date_of_birth").ok(),
                customer_type: row.try_get("customer_type").map_err(|e| e.to_string())?,
                status: row.try_get("status").map_err(|e| e.to_string())?,
                loyalty_points: row.try_get::<i32, _>("loyalty_points").unwrap_or(0),
                total_spent: row.try_get::<f64, _>("total_spent").unwrap_or(0.0),
                total_orders: row.try_get::<i32, _>("total_orders").unwrap_or(0),
                average_order_value: row.try_get::<f64, _>("average_order_value").unwrap_or(0.0),
                last_purchase_date: row.try_get("last_purchase_date").ok(),
                notes: row.try_get("notes").ok(),
                tags: row.try_get("tags").ok(),
                created_by: row.try_get("created_by").ok(),
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            })
        }
        None => Err("Customer not found".to_string()),
    }
}

#[command]
pub async fn create_customer(
    pool: State<'_, SqlitePool>,
    request: CreateCustomerRequest,
    user_id: i64,
) -> Result<Customer, String> {
    let pool_ref = pool.inner();

    // Check if email already exists (if provided)
    if let Some(ref email) = request.email {
        let exists = sqlx::query("SELECT id FROM customers WHERE email = ?1")
            .bind(email)
            .fetch_optional(pool_ref)
            .await
            .map_err(|e| {
                format!("Database error: {}", e)
            })?;

        if exists.is_some() {
            return Err("Email already exists".to_string());
        }
    }

    // Generate customer number
    let customer_number = generate_customer_number(pool_ref).await?;

    // Set default customer type if not provided
    let customer_type = request.customer_type.unwrap_or_else(|| "Retail".to_string());

    let result = sqlx::query(
        "INSERT INTO customers (
            customer_number, first_name, last_name, email, phone, company,
            address, city, state, zip_code, country, date_of_birth,
            customer_type, notes, tags, created_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)"
    )
        .bind(&customer_number)
        .bind(&request.first_name)
        .bind(&request.last_name)
        .bind(&request.email)
        .bind(&request.phone)
        .bind(&request.company)
        .bind(&request.address)
        .bind(&request.city)
        .bind(&request.state)
        .bind(&request.zip_code)
        .bind(&request.country)
        .bind(&request.date_of_birth)
        .bind(&customer_type)
        .bind(&request.notes)
        .bind(&request.tags)
        .bind(user_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    let customer_id = result.last_insert_rowid();

    // Fetch and return the created customer
    get_customer(pool, customer_id).await
}

#[command]
pub async fn update_customer(
    pool: State<'_, SqlitePool>,
    customer_id: i64,
    request: UpdateCustomerRequest,
) -> Result<Customer, String> {
    let pool_ref = pool.inner();

    // Check if customer exists
    let exists = sqlx::query("SELECT id FROM customers WHERE id = ?1")
        .bind(customer_id)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    if exists.is_none() {
        return Err("Customer not found".to_string());
    }

    // Check email uniqueness if being updated
    if let Some(ref email) = request.email {
        let email_exists = sqlx::query("SELECT id FROM customers WHERE email = ?1 AND id != ?2")
            .bind(email)
            .bind(customer_id)
            .fetch_optional(pool_ref)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        if email_exists.is_some() {
            return Err("Email already exists".to_string());
        }
    }

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut params: Vec<&str> = Vec::new();

    if let Some(ref first_name) = request.first_name {
        updates.push("first_name = ?");
        params.push(first_name);
    }
    if let Some(ref last_name) = request.last_name {
        updates.push("last_name = ?");
        params.push(last_name);
    }
    if let Some(ref email) = request.email {
        updates.push("email = ?");
        params.push(email);
    }
    if let Some(ref phone) = request.phone {
        updates.push("phone = ?");
        params.push(phone);
    }
    if let Some(ref company) = request.company {
        updates.push("company = ?");
        params.push(company);
    }
    if let Some(ref address) = request.address {
        updates.push("address = ?");
        params.push(address);
    }
    if let Some(ref city) = request.city {
        updates.push("city = ?");
        params.push(city);
    }
    if let Some(ref state) = request.state {
        updates.push("state = ?");
        params.push(state);
    }
    if let Some(ref zip_code) = request.zip_code {
        updates.push("zip_code = ?");
        params.push(zip_code);
    }
    if let Some(ref country) = request.country {
        updates.push("country = ?");
        params.push(country);
    }
    if let Some(ref date_of_birth) = request.date_of_birth {
        updates.push("date_of_birth = ?");
        params.push(date_of_birth);
    }
    if let Some(ref customer_type) = request.customer_type {
        updates.push("customer_type = ?");
        params.push(customer_type);
    }
    if let Some(ref status) = request.status {
        updates.push("status = ?");
        params.push(status);
    }
    if let Some(ref notes) = request.notes {
        updates.push("notes = ?");
        params.push(notes);
    }
    if let Some(ref tags) = request.tags {
        updates.push("tags = ?");
        params.push(tags);
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    let query = format!(
        "UPDATE customers SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut q = sqlx::query(&query);
    for param in params {
        q = q.bind(param);
    }
    q = q.bind(customer_id);

    q.execute(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;


    // Fetch and return the updated customer
    get_customer(pool, customer_id).await
}

#[command]
pub async fn delete_customer(
    pool: State<'_, SqlitePool>,
    customer_id: i64,
) -> Result<String, String> {
    let pool_ref = pool.inner();

    let result = sqlx::query("DELETE FROM customers WHERE id = ?1")
        .bind(customer_id)
        .execute(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    if result.rows_affected() == 0 {
        return Err("Customer not found".to_string());
    }

    Ok("Customer deleted successfully".to_string())
}

#[command]
pub async fn search_customers(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<Vec<Customer>, String> {
    let pool_ref = pool.inner();

    let search_pattern = format!("%{}%", query);

    let rows = sqlx::query(
        "SELECT * FROM customers
         WHERE first_name LIKE ?1
            OR last_name LIKE ?1
            OR email LIKE ?1
            OR phone LIKE ?1
            OR company LIKE ?1
            OR customer_number LIKE ?1
         ORDER BY created_at DESC
         LIMIT 50"
    )
        .bind(&search_pattern)
        .fetch_all(pool_ref)
        .await
        .map_err(|e| {
            format!("Database error: {}", e)
        })?;

    let mut customers = Vec::with_capacity(rows.len());
    for row in rows {
        customers.push(Customer {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            customer_number: row.try_get("customer_number").map_err(|e| e.to_string())?,
            first_name: row.try_get("first_name").map_err(|e| e.to_string())?,
            last_name: row.try_get("last_name").map_err(|e| e.to_string())?,
            email: row.try_get("email").ok(),
            phone: row.try_get("phone").ok(),
            company: row.try_get("company").ok(),
            address: row.try_get("address").ok(),
            city: row.try_get("city").ok(),
            state: row.try_get("state").ok(),
            zip_code: row.try_get("zip_code").ok(),
            country: row.try_get("country").ok(),
            date_of_birth: row.try_get("date_of_birth").ok(),
            customer_type: row.try_get("customer_type").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            loyalty_points: row.try_get::<i32, _>("loyalty_points").unwrap_or(0),
            total_spent: row.try_get::<f64, _>("total_spent").unwrap_or(0.0),
            total_orders: row.try_get::<i32, _>("total_orders").unwrap_or(0),
            average_order_value: row.try_get::<f64, _>("average_order_value").unwrap_or(0.0),
            last_purchase_date: row.try_get("last_purchase_date").ok(),
            notes: row.try_get("notes").ok(),
            tags: row.try_get("tags").ok(),
            created_by: row.try_get("created_by").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    Ok(customers)
}
