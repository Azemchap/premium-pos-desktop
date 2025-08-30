use tauri::{command, State};
<<<<<<< Updated upstream
use sqlx::{SqlitePool, Row};
use crate::models::{Sale, CreateSaleRequest, SaleItem, SaleItemRequest};
=======
use sqlx::{SqlitePool, Row, Acquire, Executor}; // Add Acquire and Executor
use crate::models::{Sale, CreateSaleRequest, SaleWithItems};
>>>>>>> Stashed changes
use uuid::Uuid;

/// Fetch sales with optional date filtering
#[command]
<<<<<<< Updated upstream
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
    cashier_id: i64,
    shift_id: Option<i64>,
) -> Result<Sale, String> {
    let pool_ref = pool.inner();
    
    // Generate unique sale number
    let sale_number = format!("SALE-{}", Uuid::new_v4().to_string().split('-').next().unwrap());
    
    // Start transaction
    let mut tx = pool_ref.begin().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    // Create sale record
    let sale_result = sqlx::query(
        "INSERT INTO sales (sale_number, subtotal, tax_amount, discount_amount, total_amount,
                           payment_method, payment_status, cashier_id, customer_name, customer_phone,
                           customer_email, notes, shift_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
    )
    .bind(&sale_number)
    .bind(request.subtotal)
    .bind(request.tax_amount)
    .bind(request.discount_amount)
    .bind(request.total_amount)
    .bind(&request.payment_method)
    .bind("completed")
    .bind(cashier_id)
    .bind(&request.customer_name)
    .bind(&request.customer_phone)
    .bind(&request.customer_email)
    .bind(&request.notes)
    .bind(shift_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create sale: {}", e))?;

    let sale_id = sale_result.last_insert_rowid();

    // Create sale items and update inventory
    for item in &request.items {
        // Get product cost price for profit calculation
        let product = sqlx::query(
            "SELECT cost_price, is_taxable, tax_rate FROM products WHERE id = ?1"
        )
        .bind(item.product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to get product: {}", e))?;

        let cost_price: f64 = product.try_get("cost_price").map_err(|e| e.to_string())?;
        let is_taxable: bool = product.try_get("is_taxable").map_err(|e| e.to_string())?;
        let product_tax_rate: f64 = product.try_get("tax_rate").map_err(|e| e.to_string())?;

        // Calculate item tax if product is taxable
        let item_tax = if is_taxable { item.line_total * product_tax_rate } else { 0.0 };

        // Create sale item
        sqlx::query(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount,
                                    line_total, tax_amount, cost_price)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
        )
        .bind(sale_id)
        .bind(item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.discount_amount)
        .bind(item.line_total)
        .bind(item_tax)
        .bind(cost_price)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create sale item: {}", e))?;

        // Update inventory (decrease stock)
        let inventory_update = sqlx::query(
            "UPDATE inventory SET 
                current_stock = current_stock - ?1,
                available_stock = available_stock - ?1,
                last_updated = CURRENT_TIMESTAMP
             WHERE product_id = ?2"
        )
        .bind(item.quantity)
        .bind(item.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update inventory: {}", e))?;

        if inventory_update.rows_affected() == 0 {
            return Err(format!("Product {} not found in inventory", item.product_id));
        }

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, movement_type, quantity_change, previous_stock,
                                             new_stock, reference_id, reference_type, notes, user_id)
             VALUES (?1, 'sale', ?2, 
                     (SELECT current_stock + ?2 FROM inventory WHERE product_id = ?1),
                     (SELECT current_stock FROM inventory WHERE product_id = ?1),
                     ?3, 'sale', 'Sale transaction', ?4)"
        )
        .bind(item.product_id)
        .bind(-item.quantity)
        .bind(item.quantity)
        .bind(sale_id)
        .bind(cashier_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to record inventory movement: {}", e))?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // Get the created sale
    let row = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales WHERE id = ?1"
    )
    .bind(sale_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created sale: {}", e))?;

    let sale = Sale {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
        subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
        discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
        payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
        cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
        customer_name: row.try_get("customer_name").ok().flatten(),
        customer_phone: row.try_get("customer_phone").ok().flatten(),
        customer_email: row.try_get("customer_email").ok().flatten(),
        notes: row.try_get("notes").ok().flatten(),
        is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
        voided_by: row.try_get("voided_by").ok().flatten(),
        voided_at: row.try_get("voided_at").ok().flatten(),
        void_reason: row.try_get("void_reason").ok().flatten(),
        shift_id: row.try_get("shift_id").ok().flatten(),
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    Ok(sale)
=======
pub async fn get_sales(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<Sale>, String> {
    println!("DEBUG(sales): get_sales called with range {:?}..{:?}", start_date, end_date);
    let pool_ref = pool.inner();

    let query = if start_date.is_some() || end_date.is_some() {
        let q = r#"
            SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                   payment_method, payment_status, cashier_id, customer_name, notes,
                   is_voided, voided_by, voided_at, void_reason, created_at
            FROM sales 
            WHERE created_at BETWEEN COALESCE(?1, '1970-01-01') AND COALESCE(?2, CURRENT_TIMESTAMP)
            ORDER BY created_at DESC
        "#;
        sqlx::query(q)
            .bind(start_date)
            .bind(end_date)
    } else {
        let q = r#"
            SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                   payment_method, payment_status, cashier_id, customer_name, notes,
                   is_voided, voided_by, voided_at, void_reason, created_at
            FROM sales 
            ORDER BY created_at DESC
        "#;
        sqlx::query(q)
    };

    let rows = query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Failed to query sales: {}", e))?;

    let mut sales = Vec::with_capacity(rows.len());
    for row in rows {
        sales.push(Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            is_voided: match row.try_get::<bool, _>("is_voided") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = row.try_get("is_voided").map_err(|e| e.to_string())?;
                    v != 0
                }
            },
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        });
    }

    println!("DEBUG(sales): returning {} sales", sales.len());
    Ok(sales)
>>>>>>> Stashed changes
}

/// Create a new sale with proper transaction management
#[command]
<<<<<<< Updated upstream
pub async fn get_sales(
    pool: State<'_, SqlitePool>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Sale>, String> {
    let pool_ref = pool.inner();
    
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    
    let mut query = String::from(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales
         WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    let mut param_count = 0;

    if let Some(start) = start_date {
        if !start.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(created_at) >= ?{}", param_count));
            params.push(start);
        }
    }

    if let Some(end) = end_date {
        if !end.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(created_at) <= ?{}", param_count));
            params.push(end);
        }
    }

    query.push_str(" ORDER BY created_at DESC");
    query.push_str(&format!(" LIMIT ?{}", param_count + 1));
    query.push_str(&format!(" OFFSET ?{}", param_count + 2));
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut sql_query = sqlx::query(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query
        .fetch_all(pool_ref)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut sales = Vec::new();
    for row in rows {
        let sale = Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            customer_phone: row.try_get("customer_phone").ok().flatten(),
            customer_email: row.try_get("customer_email").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        sales.push(sale);
    }

    Ok(sales)
=======
pub async fn create_sale(
    pool: State<'_, SqlitePool>,
    request: CreateSaleRequest,
) -> Result<Sale, String> {
    // Acquire a connection for transaction
    let mut conn = pool
        .inner()
        .acquire()
        .await
        .map_err(|e| format!("Failed to acquire database connection: {}", e))?;

    // Start transaction
    conn.execute("BEGIN IMMEDIATE")
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    let result: Result<Sale, String> = async {
        // Generate unique sale number
        let sale_number = format!("S-{}", Uuid::new_v4().to_string().replace('-', "").get(0..8).unwrap_or("00000000"));
        
        // Insert sale record
        let sale_result = sqlx::query(
            r#"
            INSERT INTO sales (
                sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, notes, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'completed', ?7, ?8, ?9, CURRENT_TIMESTAMP)
            "#,
        )
        .bind(&sale_number)
        .bind(request.subtotal)
        .bind(request.tax_amount)
        .bind(request.discount_amount)
        .bind(request.total_amount)
        .bind(&request.payment_method)
        .bind(request.cashier_id) // Use provided cashier_id
        .bind(&request.customer_name)
        .bind(&request.notes)
        .execute(&mut conn)
        .await
        .map_err(|e| format!("Failed to insert sale: {}", e))?;

        let sale_id = sale_result.last_insert_rowid();

        // Process each sale item
        for item in &request.items {
            // Check if product exists and is active
            let product = sqlx::query(
                "SELECT id, name, is_active FROM products WHERE id = ?1"
            )
            .bind(item.product_id)
            .fetch_optional(&mut conn)
            .await
            .map_err(|e| format!("Failed to query product: {}", e))?;

            let (product_id, product_name) = match product {
                Some(row) => {
                    let is_active: bool = match row.try_get::<bool, _>("is_active") {
                        Ok(b) => b,
                        Err(_) => {
                            let v: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
                            v != 0
                        }
                    };
                    
                    if !is_active {
                        return Err(format!("Product '{}' is not active", row.try_get::<String, _>("name").map_err(|e| e.to_string())?));
                    }
                    
                    (row.try_get("id").map_err(|e| e.to_string())?, 
                     row.try_get("name").map_err(|e| e.to_string())?)
                },
                None => return Err(format!("Product ID {} not found", item.product_id))
            };

            // Check inventory
            let inventory = sqlx::query(
                "SELECT current_stock FROM inventory WHERE product_id = ?1"
            )
            .bind(product_id)
            .fetch_optional(&mut conn)
            .await
            .map_err(|e| format!("Failed to query inventory: {}", e))?;

            let current_stock = match inventory {
                Some(row) => row.try_get("current_stock").map_err(|e| e.to_string())?,
                None => 0
            };

            // Check stock availability
            if current_stock < item.quantity {
                return Err(format!("Insufficient stock for '{}': have {}, need {}", 
                    product_name, current_stock, item.quantity));
            }

            // Update inventory
            let new_stock = current_stock - item.quantity;
            sqlx::query(
                "UPDATE inventory SET current_stock = ?1, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?2"
            )
            .bind(new_stock)
            .bind(product_id)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("Failed to update inventory: {}", e))?;

            // Insert sale item
            sqlx::query(
                r#"
                INSERT INTO sale_items (
                    sale_id, product_id, quantity, unit_price, discount_amount, line_total, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(sale_id)
            .bind(product_id)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(item.discount_amount)
            .bind(item.line_total)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("Failed to insert sale item: {}", e))?;

            // Log inventory movement
            sqlx::query(
                r#"
                INSERT INTO inventory_movements (
                    product_id, movement_type, quantity_change, previous_stock, new_stock,
                    reference_id, reference_type, notes, user_id, created_at
                ) VALUES (?1, 'sale', ?2, ?3, ?4, ?5, 'sale', NULL, NULL, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(product_id)
            .bind(-item.quantity) // Negative for sale
            .bind(current_stock)
            .bind(new_stock)
            .bind(sale_id)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("Failed to log inventory movement: {}", e))?;
        }

        // Commit transaction
        conn.execute("COMMIT")
            .await
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;

        // Return created sale - use pool for this query since transaction is committed
        let sale_row = sqlx::query(
            r#"
            SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                   payment_method, payment_status, cashier_id, customer_name, notes,
                   is_voided, voided_by, voided_at, void_reason, created_at
            FROM sales WHERE id = ?1
            "#,
        )
        .bind(sale_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch created sale: {}", e))?;

        Ok(Sale {
            id: sale_row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: sale_row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: sale_row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: sale_row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: sale_row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: sale_row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: sale_row.try_get("payment_method").map_err(|e| e.to_string())?,
            payment_status: sale_row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: sale_row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: sale_row.try_get("customer_name").ok().flatten(),
            notes: sale_row.try_get("notes").ok().flatten(),
            is_voided: match sale_row.try_get::<bool, _>("is_voided") {
                Ok(b) => b,
                Err(_) => {
                    let v: i64 = sale_row.try_get("is_voided").map_err(|e| e.to_string())?;
                    v != 0
                }
            },
            voided_by: sale_row.try_get("voided_by").ok().flatten(),
            voided_at: sale_row.try_get("voided_at").ok().flatten(),
            void_reason: sale_row.try_get("void_reason").ok().flatten(),
            created_at: sale_row.try_get("created_at").map_err(|e| e.to_string())?,
        })
    }.await;

    // Handle transaction rollback on error
    if let Err(e) = &result {
        let _ = conn.execute("ROLLBACK").await;
        return Err(e.clone());
    }

    result
>>>>>>> Stashed changes
}

/// Void a sale and restore inventory
#[command]
<<<<<<< Updated upstream
pub async fn get_sale_details(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
) -> Result<(Sale, Vec<SaleItem>), String> {
    let pool_ref = pool.inner();
    
    // Get sale
    let sale_row = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales WHERE id = ?1"
=======
pub async fn void_sale(
    pool: State<'_, SqlitePool>, 
    sale_id: i64, 
    reason: String,
    voided_by: i64 // Add user who voided the sale
) -> Result<bool, String> {
    let mut conn = pool
        .inner()
        .acquire()
        .await
        .map_err(|e| format!("Failed to acquire database connection: {}", e))?;

    conn.execute("BEGIN IMMEDIATE")
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    let result: Result<bool, String> = async {
        // Check if sale exists and is not already voided
        let sale_row = sqlx::query(
            "SELECT id, is_voided FROM sales WHERE id = ?1"
        )
        .bind(sale_id)
        .fetch_optional(&mut conn)
        .await
        .map_err(|e| format!("Failed to query sale: {}", e))?;

        let is_voided = match sale_row {
            Some(row) => {
                match row.try_get::<bool, _>("is_voided") {
                    Ok(b) => b,
                    Err(_) => {
                        let v: i64 = row.try_get("is_voided").map_err(|e| e.to_string())?;
                        v != 0
                    }
                }
            },
            None => return Err(format!("Sale ID {} not found", sale_id))
        };

        if is_voided {
            return Err(format!("Sale ID {} is already voided", sale_id));
        }

        // Mark sale as voided
        sqlx::query(
            "UPDATE sales SET is_voided = 1, voided_by = ?1, voided_at = CURRENT_TIMESTAMP, void_reason = ?2 WHERE id = ?3"
        )
        .bind(voided_by)
        .bind(&reason)
        .bind(sale_id)
        .execute(&mut conn)
        .await
        .map_err(|e| format!("Failed to mark sale as voided: {}", e))?;

        // Get sale items and restore inventory
        let sale_items = sqlx::query(
            "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1"
        )
        .bind(sale_id)
        .fetch_all(&mut conn)
        .await
        .map_err(|e| format!("Failed to fetch sale items: {}", e))?;

        for item in sale_items {
            let product_id: i64 = item.try_get("product_id").map_err(|e| e.to_string())?;
            let quantity: i32 = item.try_get("quantity").map_err(|e| e.to_string())?;

            // Get current inventory
            let inventory = sqlx::query(
                "SELECT current_stock FROM inventory WHERE product_id = ?1"
            )
            .bind(product_id)
            .fetch_optional(&mut conn)
            .await
            .map_err(|e| format!("Failed to query inventory: {}", e))?;

            let current_stock = match inventory {
                Some(row) => row.try_get("current_stock").map_err(|e| e.to_string())?,
                None => 0
            };

            // Update inventory
            let new_stock = current_stock + quantity;
            sqlx::query(
                "UPDATE inventory SET current_stock = ?1, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?2"
            )
            .bind(new_stock)
            .bind(product_id)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("Failed to update inventory: {}", e))?;

            // Log inventory movement
            sqlx::query(
                r#"
                INSERT INTO inventory_movements (
                    product_id, movement_type, quantity_change, previous_stock, new_stock,
                    reference_id, reference_type, notes, user_id, created_at
                ) VALUES (?1, 'void', ?2, ?3, ?4, ?5, 'void', NULL, NULL, CURRENT_TIMESTAMP)
                "#,
            )
            .bind(product_id)
            .bind(quantity) // Positive for void
            .bind(current_stock)
            .bind(new_stock)
            .bind(sale_id)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("Failed to log inventory movement: {}", e))?;
        }

        // Commit transaction
        conn.execute("COMMIT")
            .await
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;

        Ok(true)
    }.await;

    // Handle transaction rollback on error
    if let Err(e) = &result {
        let _ = conn.execute("ROLLBACK").await;
        return Err(e.clone());
    }

    result
}

/// Get sale details with items
#[command]
pub async fn get_sale_with_items(
    pool: State<'_, SqlitePool>,
    sale_id: i64
) -> Result<SaleWithItems, String> {
    println!("DEBUG(sales): get_sale_with_items called for sale_id={}", sale_id);
    let pool_ref = pool.inner();

    // Fetch sale
    let sale_row = sqlx::query(
        r#"
        SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
               payment_method, payment_status, cashier_id, customer_name, notes,
               is_voided, voided_by, voided_at, void_reason, created_at
        FROM sales WHERE id = ?1
        "#,
>>>>>>> Stashed changes
    )
    .bind(sale_id)
    .fetch_one(pool_ref)
    .await
<<<<<<< Updated upstream
    .map_err(|e| format!("Sale not found: {}", e))?;
=======
    .map_err(|e| format!("Failed to fetch sale: {}", e))?;
>>>>>>> Stashed changes

    let sale = Sale {
        id: sale_row.try_get("id").map_err(|e| e.to_string())?,
        sale_number: sale_row.try_get("sale_number").map_err(|e| e.to_string())?,
        subtotal: sale_row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: sale_row.try_get("tax_amount").map_err(|e| e.to_string())?,
        discount_amount: sale_row.try_get("discount_amount").map_err(|e| e.to_string())?,
        total_amount: sale_row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_method: sale_row.try_get("payment_method").map_err(|e| e.to_string())?,
        payment_status: sale_row.try_get("payment_status").map_err(|e| e.to_string())?,
        cashier_id: sale_row.try_get("cashier_id").map_err(|e| e.to_string())?,
        customer_name: sale_row.try_get("customer_name").ok().flatten(),
<<<<<<< Updated upstream
        customer_phone: sale_row.try_get("customer_phone").ok().flatten(),
        customer_email: sale_row.try_get("customer_email").ok().flatten(),
        notes: sale_row.try_get("notes").ok().flatten(),
        is_voided: sale_row.try_get("is_voided").map_err(|e| e.to_string())?,
        voided_by: sale_row.try_get("voided_by").ok().flatten(),
        voided_at: sale_row.try_get("voided_at").ok().flatten(),
        void_reason: sale_row.try_get("void_reason").ok().flatten(),
        shift_id: sale_row.try_get("shift_id").ok().flatten(),
        created_at: sale_row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    // Get sale items
    let items_rows = sqlx::query(
        "SELECT id, sale_id, product_id, quantity, unit_price, discount_amount,
                line_total, tax_amount, cost_price, created_at
         FROM sale_items WHERE sale_id = ?1"
=======
        notes: sale_row.try_get("notes").ok().flatten(),
        is_voided: match sale_row.try_get::<bool, _>("is_voided") {
            Ok(b) => b,
            Err(_) => {
                let v: i64 = sale_row.try_get("is_voided").map_err(|e| e.to_string())?;
                v != 0
            }
        },
        voided_by: sale_row.try_get("voided_by").ok().flatten(),
        voided_at: sale_row.try_get("voided_at").ok().flatten(),
        void_reason: sale_row.try_get("void_reason").ok().flatten(),
        created_at: sale_row.try_get("created_at").map_err(|e| e.to_string())?,
    };

    // Fetch sale items with product details
    let item_rows = sqlx::query(
        r#"
        SELECT si.id, si.sale_id, si.product_id, si.quantity, si.unit_price, 
               si.discount_amount, si.line_total, si.created_at,
               p.name as product_name, p.sku as product_sku
        FROM sale_items si
        LEFT JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = ?1
        ORDER BY si.id
        "#,
>>>>>>> Stashed changes
    )
    .bind(sale_id)
    .fetch_all(pool_ref)
    .await
<<<<<<< Updated upstream
    .map_err(|e| format!("Failed to get sale items: {}", e))?;

    let mut items = Vec::new();
    for row in items_rows {
        let item = SaleItem {
=======
    .map_err(|e| format!("Failed to fetch sale items: {}", e))?;

    let mut items = Vec::with_capacity(item_rows.len());
    for row in item_rows {
        items.push(crate::models::SaleItem {
>>>>>>> Stashed changes
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_id: row.try_get("sale_id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
            unit_price: row.try_get("unit_price").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            line_total: row.try_get("line_total").map_err(|e| e.to_string())?,
<<<<<<< Updated upstream
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            cost_price: row.try_get("cost_price").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            product: None, // Could be populated if needed
        };
        items.push(item);
    }

    Ok((sale, items))
}

#[command]
pub async fn void_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
    reason: String,
    user_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();
    
    // Check if sale exists and is not already voided
    let sale_check = sqlx::query(
        "SELECT is_voided FROM sales WHERE id = ?1"
    )
    .bind(sale_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let sale_check = match sale_check {
        Some(s) => s,
        None => return Err("Sale not found".to_string()),
    };

    let is_voided: bool = sale_check.try_get("is_voided").map_err(|e| e.to_string())?;
    if is_voided {
        return Err("Sale is already voided".to_string());
    }

    // Start transaction
    let mut tx = pool_ref.begin().await.map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Mark sale as voided
    sqlx::query(
        "UPDATE sales SET 
            is_voided = 1,
            voided_by = ?1,
            voided_at = CURRENT_TIMESTAMP,
            void_reason = ?2
         WHERE id = ?3"
    )
    .bind(user_id)
    .bind(&reason)
    .bind(sale_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to void sale: {}", e))?;

    // Get sale items to restore inventory
    let items = sqlx::query(
        "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1"
    )
    .bind(sale_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Failed to get sale items: {}", e))?;

    // Restore inventory for each item
    for item in items {
        let product_id: i64 = item.try_get("product_id").map_err(|e| e.to_string())?;
        let quantity: i32 = item.try_get("quantity").map_err(|e| e.to_string())?;

        // Update inventory (increase stock)
        sqlx::query(
            "UPDATE inventory SET 
                current_stock = current_stock + ?1,
                available_stock = available_stock + ?1,
                last_updated = CURRENT_TIMESTAMP
             WHERE product_id = ?2"
        )
        .bind(quantity)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to restore inventory: {}", e))?;

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, movement_type, quantity_change, previous_stock,
                                             new_stock, reference_id, reference_type, notes, user_id)
             VALUES (?1, 'void', ?2, 
                     (SELECT current_stock - ?2 FROM inventory WHERE product_id = ?1),
                     (SELECT current_stock FROM inventory WHERE product_id = ?1),
                     ?3, 'void', 'Sale voided', ?4)"
        )
        .bind(product_id)
        .bind(quantity)
        .bind(quantity)
        .bind(sale_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to record inventory movement: {}", e))?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(true)
}

#[command]
pub async fn search_sales(
    pool: State<'_, SqlitePool>,
    query: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Sale>, String> {
    let pool_ref = pool.inner();
    
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    
    let rows = sqlx::query(
        "SELECT id, sale_number, subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, cashier_id, customer_name, customer_phone,
                customer_email, notes, is_voided, voided_by, voided_at, void_reason,
                shift_id, created_at
         FROM sales
         WHERE sale_number LIKE ?1 OR customer_name LIKE ?1 OR customer_phone LIKE ?1
         ORDER BY created_at DESC
         LIMIT ?2 OFFSET ?3"
    )
    .bind(format!("%{}%", query))
    .bind(limit)
    .bind(offset)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut sales = Vec::new();
    for row in rows {
        let sale = Sale {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            sale_number: row.try_get("sale_number").map_err(|e| e.to_string())?,
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            discount_amount: row.try_get("discount_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
            payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
            cashier_id: row.try_get("cashier_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").ok().flatten(),
            customer_phone: row.try_get("customer_phone").ok().flatten(),
            customer_email: row.try_get("customer_email").ok().flatten(),
            notes: row.try_get("notes").ok().flatten(),
            is_voided: row.try_get("is_voided").map_err(|e| e.to_string())?,
            voided_by: row.try_get("voided_by").ok().flatten(),
            voided_at: row.try_get("voided_at").ok().flatten(),
            void_reason: row.try_get("void_reason").ok().flatten(),
            shift_id: row.try_get("shift_id").ok().flatten(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        sales.push(sale);
    }

    Ok(sales)
=======
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            product: Some(crate::models::Product {
                id: row.try_get("product_id").map_err(|e| e.to_string())?,
                sku: row.try_get("product_sku").map_err(|e| e.to_string())?,
                barcode: None, // Not included in this query
                name: row.try_get("product_name").map_err(|e| e.to_string())?,
                description: None,
                category: None,
                unit_of_measure: "each".to_string(), // Default
                cost_price: 0.0, // Not included in this query
                selling_price: row.try_get("unit_price").map_err(|e| e.to_string())?,
                is_active: true, // Not included in this query
                created_at: "".to_string(), // Not included
                updated_at: "".to_string(), // Not included
            }),
        });
    }

    println!("DEBUG(sales): returning sale with {} items", items.len());
    Ok(SaleWithItems { sale, items })
>>>>>>> Stashed changes
}