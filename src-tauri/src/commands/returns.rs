use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::{command, State};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub enum ReturnType {
    SalesReturn,     // Customer returns items they purchased
    PurchaseReturn,  // Return items to suppliers
    InventoryReturn, // Return items to warehouse/branch
    TransferReturn,  // Return items from another location
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ReturnReason {
    Defective,
    WrongItem,
    Damaged,
    Expired,
    Overstock,
    Recall,
    CustomerDissatisfaction,
    WrongShipment,
    QualityIssue,
    Other,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ReturnCondition {
    New,
    Opened,
    Used,
    Damaged,
    Defective,
    Sealed,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum DispositionAction {
    Restock,           // Put back into inventory
    Dispose,           // Throw away/destroy
    ReturnToSupplier,  // Send back to supplier
    Transfer,          // Send to another location
    Repair,            // Fix and restock
    WriteOff,          // Financial write-off
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnItem {
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
    pub reason: ReturnReason,
    pub condition: ReturnCondition,
    pub disposition: DispositionAction,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveReturn {
    pub id: i64,
    pub return_number: String,
    pub return_type: String,
    pub reference_id: Option<i64>,
    pub reference_number: Option<String>,
    pub supplier_id: Option<i64>,
    pub supplier_name: Option<String>,
    pub from_location_id: Option<i64>,
    pub from_location_name: Option<String>,
    pub to_location_id: Option<i64>,
    pub to_location_name: Option<String>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub refund_method: Option<String>,
    pub credit_method: Option<String>,
    pub expected_credit_date: Option<String>,
    pub status: String, // Pending, Approved, Processing, Completed, Rejected
    pub processed_by: i64,
    pub processed_by_name: Option<String>,
    pub approved_by: Option<i64>,
    pub approved_by_name: Option<String>,
    pub approved_at: Option<String>,
    pub completed_at: Option<String>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub items_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
    pub reason: ReturnReason,
    pub condition: ReturnCondition,
    pub disposition: DispositionAction,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[command]
pub async fn create_return(
    pool: State<'_, SqlitePool>,
    return_type: ReturnType,
    reference_id: Option<i64>,
    reference_number: Option<String>,
    supplier_id: Option<i64>,
    from_location_id: Option<i64>,
    to_location_id: Option<i64>,
    items: Vec<ReturnItem>,
    subtotal: f64,
    tax_amount: f64,
    total_amount: f64,
    refund_method: Option<String>,
    credit_method: Option<String>,
    expected_credit_date: Option<String>,
    reason: Option<String>,
    notes: Option<String>,
    attachments: Option<Vec<String>>,
    user_id: i64,
    shift_id: Option<i64>,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    // Generate unique return number based on type
    let prefix = match return_type {
        ReturnType::SalesReturn => "SR",
        ReturnType::PurchaseReturn => "PR",
        ReturnType::InventoryReturn => "IR",
        ReturnType::TransferReturn => "TR",
    };
    
    let uuid_str = Uuid::new_v4().to_string();
    let return_number = format!(
        "{}-{}",
        prefix,
        uuid_str.split('-').next().unwrap_or(&uuid_str[..8])
    );

    // Start transaction
    let mut tx = pool_ref
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Create comprehensive return record
    let return_result = sqlx::query(
        r#"
        INSERT INTO comprehensive_returns (
            return_number, return_type, reference_id, reference_number, supplier_id,
            from_location_id, to_location_id, subtotal, tax_amount, total_amount,
            refund_method, credit_method, expected_credit_date, status, processed_by,
            reason, notes, shift_id
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
        "#
    )
    .bind(&return_number)
    .bind(format!("{:?}", return_type))
    .bind(reference_id)
    .bind(&reference_number)
    .bind(supplier_id)
    .bind(from_location_id)
    .bind(to_location_id)
    .bind(subtotal)
    .bind(tax_amount)
    .bind(total_amount)
    .bind(&refund_method)
    .bind(&credit_method)
    .bind(&expected_credit_date)
    .bind("Pending")
    .bind(user_id)
    .bind(&reason)
    .bind(&notes)
    .bind(shift_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create return: {}", e))?;

    let return_id = return_result.last_insert_rowid();

    // Create return items
    for item in &items {
        let item_result = sqlx::query(
            r#"
            INSERT INTO comprehensive_return_items (
                return_id, product_id, quantity, unit_price, line_total,
                reason, condition, disposition, batch_number, expiry_date, notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#
        )
        .bind(return_id)
        .bind(item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.line_total)
        .bind(format!("{:?}", item.reason))
        .bind(format!("{:?}", item.condition))
        .bind(format!("{:?}", item.disposition))
        .bind(&item.batch_number)
        .bind(&item.expiry_date)
        .bind(&item.notes)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to create return item: {}", e))?;

        // Update inventory based on disposition
        match item.disposition {
            DispositionAction::Restock => {
                // Add back to inventory
                sqlx::query(
                    "UPDATE products SET current_stock = current_stock + ?1 WHERE id = ?2"
                )
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to restock item: {}", e))?;

                // Create inventory movement record
                sqlx::query(
                    r#"
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity, reference_type, reference_id,
                        notes, created_by
                    )
                    VALUES (?1, 'return', ?2, 'comprehensive_return', ?3, ?4, ?5)
                    "#
                )
                .bind(item.product_id)
                .bind(item.quantity)
                .bind(return_id)
                .bind(format!("Return restocked: {:?}", item.reason))
                .bind(user_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to create inventory movement: {}", e))?;
            }
            DispositionAction::Dispose | DispositionAction::WriteOff => {
                // Remove from inventory
                sqlx::query(
                    "UPDATE products SET current_stock = current_stock - ?1 WHERE id = ?2"
                )
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to remove disposed item: {}", e))?;

                // Create inventory movement record
                sqlx::query(
                    r#"
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity, reference_type, reference_id,
                        notes, created_by
                    )
                    VALUES (?1, 'damage', ?2, 'comprehensive_return', ?3, ?4, ?5)
                    "#
                )
                .bind(item.product_id)
                .bind(-item.quantity)
                .bind(return_id)
                .bind(format!("Item disposed: {:?}", item.disposition))
                .bind(user_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to create inventory movement: {}", e))?;
            }
            DispositionAction::Transfer => {
                // Handle transfer between locations
                if let (Some(from_loc), Some(to_loc)) = (from_location_id, to_location_id) {
                    // Remove from source location
                    sqlx::query(
                        "UPDATE products SET current_stock = current_stock - ?1 WHERE id = ?2"
                    )
                    .bind(item.quantity)
                    .bind(item.product_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| format!("Failed to remove from source location: {}", e))?;

                    // Add to destination location (would need location-specific inventory)
                    // For now, just create movement record
                    sqlx::query(
                        r#"
                        INSERT INTO inventory_movements (
                            product_id, movement_type, quantity, reference_type, reference_id,
                            notes, created_by
                        )
                        VALUES (?1, 'transfer', ?2, 'comprehensive_return', ?3, ?4, ?5)
                        "#
                    )
                    .bind(item.product_id)
                    .bind(item.quantity)
                    .bind(return_id)
                    .bind(format!("Transfer from location {} to {}", from_loc, to_loc))
                    .bind(user_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| format!("Failed to create transfer movement: {}", e))?;
                }
            }
            DispositionAction::ReturnToSupplier => {
                // Create supplier return record or update purchase order
                // For now, just create movement record
                sqlx::query(
                    r#"
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity, reference_type, reference_id,
                        notes, created_by
                    )
                    VALUES (?1, 'return', ?2, 'comprehensive_return', ?3, ?4, ?5)
                    "#
                )
                .bind(item.product_id)
                .bind(-item.quantity)
                .bind(return_id)
                .bind(format!("Return to supplier: {:?}", item.reason))
                .bind(user_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to create supplier return movement: {}", e))?;
            }
            DispositionAction::Repair => {
                // Move to repair status
                sqlx::query(
                    "UPDATE products SET current_stock = current_stock - ?1 WHERE id = ?2"
                )
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to move item to repair: {}", e))?;

                sqlx::query(
                    r#"
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity, reference_type, reference_id,
                        notes, created_by
                    )
                    VALUES (?1, 'adjustment', ?2, 'comprehensive_return', ?3, ?4, ?5)
                    "#
                )
                .bind(item.product_id)
                .bind(-item.quantity)
                .bind(return_id)
                .bind(format!("Item sent for repair: {:?}", item.reason))
                .bind(user_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to create repair movement: {}", e))?;
            }
        }
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(return_id)
}

#[command]
pub async fn get_returns(
    pool: State<'_, SqlitePool>,
    return_type: Option<String>,
    status: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<ComprehensiveReturn>, String> {
    let pool_ref = pool.inner();

    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut query = String::from(
        r#"
        SELECT 
            cr.id, cr.return_number, cr.return_type, cr.reference_id, cr.reference_number,
            cr.supplier_id, cr.from_location_id, cr.to_location_id, cr.subtotal, cr.tax_amount,
            cr.total_amount, cr.refund_method, cr.credit_method, cr.expected_credit_date,
            cr.status, cr.processed_by, cr.approved_by, cr.approved_at, cr.completed_at,
            cr.reason, cr.notes, cr.created_at, cr.updated_at,
            u.first_name || ' ' || u.last_name as processed_by_name,
            u2.first_name || ' ' || u2.last_name as approved_by_name,
            s.company_name as supplier_name,
            l1.name as from_location_name,
            l2.name as to_location_name,
            (SELECT COUNT(*) FROM comprehensive_return_items cri WHERE cri.return_id = cr.id) as items_count
        FROM comprehensive_returns cr
        LEFT JOIN users u ON cr.processed_by = u.id
        LEFT JOIN users u2 ON cr.approved_by = u2.id
        LEFT JOIN suppliers s ON cr.supplier_id = s.id
        LEFT JOIN locations l1 ON cr.from_location_id = l1.id
        LEFT JOIN locations l2 ON cr.to_location_id = l2.id
        WHERE 1=1
        "#
    );

    let mut params: Vec<String> = Vec::new();
    let mut param_count = 0;

    if let Some(rt) = return_type {
        if !rt.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND cr.return_type = ?{}", param_count));
            params.push(rt);
        }
    }

    if let Some(st) = status {
        if !st.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND cr.status = ?{}", param_count));
            params.push(st);
        }
    }

    if let Some(ref start) = start_date {
        if !start.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(cr.created_at) >= ?{}", param_count));
            params.push(start.clone());
        }
    }

    if let Some(ref end) = end_date {
        if !end.is_empty() {
            param_count += 1;
            query.push_str(&format!(" AND DATE(cr.created_at) <= ?{}", param_count));
            params.push(end.clone());
        }
    }

    query.push_str(" ORDER BY cr.created_at DESC");
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
        .map_err(|e| format!("Failed to fetch returns: {}", e))?;

    let mut returns = Vec::new();
    for row in rows {
        let return_record = ComprehensiveReturn {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            return_number: row.try_get("return_number").map_err(|e| e.to_string())?,
            return_type: row.try_get::<String, _>("return_type").unwrap_or_default(),
            reference_id: row.try_get("reference_id").ok(),
            reference_number: row.try_get("reference_number").ok(),
            supplier_id: row.try_get("supplier_id").ok(),
            supplier_name: row.try_get("supplier_name").ok(),
            from_location_id: row.try_get("from_location_id").ok(),
            from_location_name: row.try_get("from_location_name").ok(),
            to_location_id: row.try_get("to_location_id").ok(),
            to_location_name: row.try_get("to_location_name").ok(),
            subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
            tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            refund_method: row.try_get("refund_method").ok(),
            credit_method: row.try_get("credit_method").ok(),
            expected_credit_date: row.try_get("expected_credit_date").ok(),
            status: row.try_get("status").map_err(|e| e.to_string())?,
            processed_by: row.try_get("processed_by").map_err(|e| e.to_string())?,
            processed_by_name: row.try_get("processed_by_name").ok(),
            approved_by: row.try_get("approved_by").ok(),
            approved_by_name: row.try_get("approved_by_name").ok(),
            approved_at: row.try_get("approved_at").ok(),
            completed_at: row.try_get("completed_at").ok(),
            reason: row.try_get("reason").ok(),
            notes: row.try_get("notes").ok(),
            items_count: row.try_get("items_count").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        returns.push(return_record);
    }

    Ok(returns)
}

#[command]
pub async fn get_return_items(
    pool: State<'_, SqlitePool>,
    return_id: i64,
) -> Result<Vec<ComprehensiveReturnItem>, String> {
    let pool_ref = pool.inner();

    let rows = sqlx::query(
        r#"
        SELECT 
            cri.id, cri.return_id, cri.product_id, cri.quantity, cri.unit_price, cri.line_total,
            cri.reason, cri.condition, cri.disposition, cri.batch_number, cri.expiry_date,
            cri.notes, cri.created_at,
            p.name as product_name, p.sku as product_sku
        FROM comprehensive_return_items cri
        JOIN products p ON cri.product_id = p.id
        WHERE cri.return_id = ?1
        ORDER BY cri.created_at
        "#
    )
    .bind(return_id)
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch return items: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        let item = ComprehensiveReturnItem {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            return_id: row.try_get("return_id").map_err(|e| e.to_string())?,
            product_id: row.try_get("product_id").map_err(|e| e.to_string())?,
            product_name: row.try_get("product_name").map_err(|e| e.to_string())?,
            product_sku: row.try_get("product_sku").map_err(|e| e.to_string())?,
            quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
            unit_price: row.try_get("unit_price").map_err(|e| e.to_string())?,
            line_total: row.try_get("line_total").map_err(|e| e.to_string())?,
            reason: match row.try_get::<String, _>("reason").unwrap_or_default().as_str() {
                "Defective" => ReturnReason::Defective,
                "WrongItem" => ReturnReason::WrongItem,
                "Damaged" => ReturnReason::Damaged,
                "Expired" => ReturnReason::Expired,
                "Overstock" => ReturnReason::Overstock,
                "Recall" => ReturnReason::Recall,
                "CustomerDissatisfaction" => ReturnReason::CustomerDissatisfaction,
                "WrongShipment" => ReturnReason::WrongShipment,
                "QualityIssue" => ReturnReason::QualityIssue,
                other => ReturnReason::Other,
            },
            condition: match row.try_get::<String, _>("condition").unwrap_or_default().as_str() {
                "New" => ReturnCondition::New,
                "Opened" => ReturnCondition::Opened,
                "Used" => ReturnCondition::Used,
                "Damaged" => ReturnCondition::Damaged,
                "Defective" => ReturnCondition::Defective,
                "Sealed" => ReturnCondition::Sealed,
                _ => ReturnCondition::New,
            },
            disposition: match row.try_get::<String, _>("disposition").unwrap_or_default().as_str() {
                "Restock" => DispositionAction::Restock,
                "Dispose" => DispositionAction::Dispose,
                "ReturnToSupplier" => DispositionAction::ReturnToSupplier,
                "Transfer" => DispositionAction::Transfer,
                "Repair" => DispositionAction::Repair,
                "WriteOff" => DispositionAction::WriteOff,
                _ => DispositionAction::Restock,
            },
            batch_number: row.try_get("batch_number").ok(),
            expiry_date: row.try_get("expiry_date").ok(),
            notes: row.try_get("notes").ok(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        };
        items.push(item);
    }

    Ok(items)
}

#[command]
pub async fn approve_return(
    pool: State<'_, SqlitePool>,
    return_id: i64,
    approved_by: i64,
    notes: Option<String>,
) -> Result<(), String> {
    let pool_ref = pool.inner();

    sqlx::query(
        r#"
        UPDATE comprehensive_returns 
        SET status = 'Approved', approved_by = ?1, approved_at = CURRENT_TIMESTAMP, notes = COALESCE(?2, notes)
        WHERE id = ?3
        "#
    )
    .bind(approved_by)
    .bind(notes)
    .bind(return_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to approve return: {}", e))?;

    Ok(())
}

#[command]
pub async fn get_return_by_id(
    pool: State<'_, SqlitePool>,
    return_id: i64,
) -> Result<ComprehensiveReturn, String> {
    let pool_ref = pool.inner();

    let row = sqlx::query(
        r#"
        SELECT 
            cr.id, cr.return_number, cr.return_type, cr.reference_id, cr.reference_number,
            cr.supplier_id, s.name as supplier_name, cr.from_location_id, fl.name as from_location_name,
            cr.to_location_id, tl.name as to_location_name, cr.subtotal, cr.tax_amount, cr.total_amount,
            cr.refund_method, cr.credit_method, cr.expected_credit_date, cr.status, cr.processed_by,
            u.name as processed_by_name, cr.approved_by, au.name as approved_by_name, cr.approved_at,
            cr.completed_at, cr.reason, cr.notes, cr.created_at, cr.updated_at,
            (SELECT COUNT(*) FROM comprehensive_return_items cri WHERE cri.return_id = cr.id) as items_count
        FROM comprehensive_returns cr
        LEFT JOIN suppliers s ON cr.supplier_id = s.id
        LEFT JOIN locations fl ON cr.from_location_id = fl.id
        LEFT JOIN locations tl ON cr.to_location_id = tl.id
        LEFT JOIN users u ON cr.processed_by = u.id
        LEFT JOIN users au ON cr.approved_by = au.id
        WHERE cr.id = ?1
        "#
    )
    .bind(return_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch return: {}", e))?;

    let return_record = ComprehensiveReturn {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        return_number: row.try_get("return_number").map_err(|e| e.to_string())?,
        return_type: row.try_get::<String, _>("return_type").map_err(|e| e.to_string())?,
        reference_id: row.try_get("reference_id").ok(),
        reference_number: row.try_get("reference_number").ok(),
        supplier_id: row.try_get("supplier_id").ok(),
        supplier_name: row.try_get("supplier_name").ok(),
        from_location_id: row.try_get("from_location_id").ok(),
        from_location_name: row.try_get("from_location_name").ok(),
        to_location_id: row.try_get("to_location_id").ok(),
        to_location_name: row.try_get("to_location_name").ok(),
        subtotal: row.try_get("subtotal").map_err(|e| e.to_string())?,
        tax_amount: row.try_get("tax_amount").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        refund_method: row.try_get("refund_method").ok(),
        credit_method: row.try_get("credit_method").ok(),
        expected_credit_date: row.try_get("expected_credit_date").ok(),
        status: row.try_get("status").map_err(|e| e.to_string())?,
        processed_by: row.try_get("processed_by").map_err(|e| e.to_string())?,
        processed_by_name: row.try_get("processed_by_name").ok(),
        approved_by: row.try_get("approved_by").ok(),
        approved_by_name: row.try_get("approved_by_name").ok(),
        approved_at: row.try_get("approved_at").ok(),
        completed_at: row.try_get("completed_at").ok(),
        reason: row.try_get("reason").ok(),
        notes: row.try_get("notes").ok(),
        items_count: row.try_get("items_count").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    Ok(return_record)
}

#[command]
pub async fn get_sale_for_return(
    pool: State<'_, SqlitePool>,
    sale_id: i64,
) -> Result<serde_json::Value, String> {
    let pool_ref = pool.inner();

    let row = sqlx::query(
        r#"
        SELECT 
            s.id, s.sale_number, s.customer_id, c.name as customer_name,
            s.subtotal, s.tax_amount, s.total_amount, s.payment_method, s.status,
            s.created_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?1
        "#
    )
    .bind(sale_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch sale: {}", e))?;

    let sale = serde_json::json!({
        "id": row.try_get::<i64, _>("id").map_err(|e| e.to_string())?,
        "sale_number": row.try_get::<String, _>("sale_number").map_err(|e| e.to_string())?,
        "customer_id": row.try_get::<Option<i64>, _>("customer_id").ok(),
        "customer_name": row.try_get::<Option<String>, _>("customer_name").ok(),
        "subtotal": row.try_get::<f64, _>("subtotal").map_err(|e| e.to_string())?,
        "tax_amount": row.try_get::<f64, _>("tax_amount").map_err(|e| e.to_string())?,
        "total_amount": row.try_get::<f64, _>("total_amount").map_err(|e| e.to_string())?,
        "payment_method": row.try_get::<String, _>("payment_method").map_err(|e| e.to_string())?,
        "status": row.try_get::<String, _>("status").map_err(|e| e.to_string())?,
        "created_at": row.try_get::<String, _>("created_at").map_err(|e| e.to_string())?,
    });

    Ok(sale)
}

#[command]
pub async fn get_returns_count(
    pool: State<'_, SqlitePool>,
    status: Option<String>,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    let count = if let Some(status_filter) = status {
        sqlx::query_scalar("SELECT COUNT(*) FROM comprehensive_returns WHERE status = ?1")
            .bind(status_filter)
            .fetch_one(pool_ref)
            .await
            .map_err(|e| format!("Failed to count returns: {}", e))?
    } else {
        sqlx::query_scalar("SELECT COUNT(*) FROM comprehensive_returns")
            .fetch_one(pool_ref)
            .await
            .map_err(|e| format!("Failed to count returns: {}", e))?
    };

    Ok(count)
}

#[command]
pub async fn complete_return(
    pool: State<'_, SqlitePool>,
    return_id: i64,
    completed_by: i64,
    notes: Option<String>,
) -> Result<(), String> {
    let pool_ref = pool.inner();

    sqlx::query(
        r#"
        UPDATE comprehensive_returns 
        SET status = 'Completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?1
        "#
    )
    .bind(return_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to complete return: {}", e))?;

    Ok(())
}

#[command]
pub async fn create_return_offline(
    pool: State<'_, SqlitePool>,
    return_data: serde_json::Value,
) -> Result<i64, String> {
    let pool_ref = pool.inner();

    // Generate return number
    let return_number = format!("RET-{}{:04}", chrono::Utc::now().format("%Y%m%d"), 
                                generate_random_number(1, 9999));

    let mut tx = pool_ref.begin().await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Insert return
    let return_id = sqlx::query_scalar(
        r#"
        INSERT INTO comprehensive_returns (
            return_number, return_type, reference_id, reference_number,
            supplier_id, from_location_id, to_location_id, subtotal,
            tax_amount, total_amount, refund_method, credit_method,
            expected_credit_date, status, processed_by, reason, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
        RETURNING id
        "#
    )
    .bind(&return_number)
    .bind(return_data.get("return_type").and_then(|v| v.as_str()).unwrap_or("SalesReturn"))
    .bind(return_data.get("reference_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("reference_number").and_then(|v| v.as_str()))
    .bind(return_data.get("supplier_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("from_location_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("to_location_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(return_data.get("tax_amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(return_data.get("total_amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(return_data.get("refund_method").and_then(|v| v.as_str()))
    .bind(return_data.get("credit_method").and_then(|v| v.as_str()))
    .bind(return_data.get("expected_credit_date").and_then(|v| v.as_str()))
    .bind(return_data.get("status").and_then(|v| v.as_str()).unwrap_or("Pending"))
    .bind(return_data.get("processed_by").and_then(|v| v.as_i64()).unwrap_or(1))
    .bind(return_data.get("reason").and_then(|v| v.as_str()))
    .bind(return_data.get("notes").and_then(|v| v.as_str()))
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create return: {}", e))?;

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(return_id)
}

#[command]
pub async fn sync_return_from_supabase(
    pool: State<'_, SqlitePool>,
    return_data: serde_json::Value,
) -> Result<(), String> {
    let pool_ref = pool.inner();

    sqlx::query(
        r#"
        INSERT OR REPLACE INTO comprehensive_returns (
            id, return_number, return_type, reference_id, reference_number,
            supplier_id, from_location_id, to_location_id, subtotal,
            tax_amount, total_amount, refund_method, credit_method,
            expected_credit_date, status, processed_by, approved_by,
            approved_at, completed_at, reason, notes, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
        "#
    )
    .bind(return_data.get("id").and_then(|v| v.as_i64()))
    .bind(return_data.get("return_number").and_then(|v| v.as_str()))
    .bind(return_data.get("return_type").and_then(|v| v.as_str()))
    .bind(return_data.get("reference_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("reference_number").and_then(|v| v.as_str()))
    .bind(return_data.get("supplier_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("from_location_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("to_location_id").and_then(|v| v.as_i64()))
    .bind(return_data.get("subtotal").and_then(|v| v.as_f64()))
    .bind(return_data.get("tax_amount").and_then(|v| v.as_f64()))
    .bind(return_data.get("total_amount").and_then(|v| v.as_f64()))
    .bind(return_data.get("refund_method").and_then(|v| v.as_str()))
    .bind(return_data.get("credit_method").and_then(|v| v.as_str()))
    .bind(return_data.get("expected_credit_date").and_then(|v| v.as_str()))
    .bind(return_data.get("status").and_then(|v| v.as_str()))
    .bind(return_data.get("processed_by").and_then(|v| v.as_i64()))
    .bind(return_data.get("approved_by").and_then(|v| v.as_i64()))
    .bind(return_data.get("approved_at").and_then(|v| v.as_str()))
    .bind(return_data.get("completed_at").and_then(|v| v.as_str()))
    .bind(return_data.get("reason").and_then(|v| v.as_str()))
    .bind(return_data.get("notes").and_then(|v| v.as_str()))
    .bind(return_data.get("created_at").and_then(|v| v.as_str()))
    .bind(return_data.get("updated_at").and_then(|v| v.as_str()))
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to sync return: {}", e))?;

    Ok(())
}

#[command]
pub async fn get_pending_returns(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<serde_json::Value>, String> {
    let pool_ref = pool.inner();

    let rows = sqlx::query(
        r#"
        SELECT * FROM comprehensive_returns 
        WHERE sync_status = 'pending' OR sync_status = 'error'
        ORDER BY created_at ASC
        "#
    )
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Failed to get pending returns: {}", e))?;

    let mut returns = Vec::new();
    for row in rows {
        let return_data = serde_json::json!({
            "id": row.try_get::<i64, _>("id").ok(),
            "return_number": row.try_get::<String, _>("return_number").ok(),
            "return_type": row.try_get::<String, _>("return_type").ok(),
            "reference_id": row.try_get::<Option<i64>, _>("reference_id").ok(),
            "reference_number": row.try_get::<Option<String>, _>("reference_number").ok(),
            "supplier_id": row.try_get::<Option<i64>, _>("supplier_id").ok(),
            "from_location_id": row.try_get::<Option<i64>, _>("from_location_id").ok(),
            "to_location_id": row.try_get::<Option<i64>, _>("to_location_id").ok(),
            "subtotal": row.try_get::<f64, _>("subtotal").ok(),
            "tax_amount": row.try_get::<f64, _>("tax_amount").ok(),
            "total_amount": row.try_get::<f64, _>("total_amount").ok(),
            "refund_method": row.try_get::<Option<String>, _>("refund_method").ok(),
            "credit_method": row.try_get::<Option<String>, _>("credit_method").ok(),
            "expected_credit_date": row.try_get::<Option<String>, _>("expected_credit_date").ok(),
            "status": row.try_get::<String, _>("status").ok(),
            "processed_by": row.try_get::<i64, _>("processed_by").ok(),
            "approved_by": row.try_get::<Option<i64>, _>("approved_by").ok(),
            "approved_at": row.try_get::<Option<String>, _>("approved_at").ok(),
            "completed_at": row.try_get::<Option<String>, _>("completed_at").ok(),
            "reason": row.try_get::<Option<String>, _>("reason").ok(),
            "notes": row.try_get::<Option<String>, _>("notes").ok(),
            "created_at": row.try_get::<String, _>("created_at").ok(),
            "updated_at": row.try_get::<String, _>("updated_at").ok(),
        });
        returns.push(return_data);
    }

    Ok(returns)
}

#[command]
pub async fn mark_return_as_synced(
    pool: State<'_, SqlitePool>,
    return_id: i64,
) -> Result<(), String> {
    let pool_ref = pool.inner();

    sqlx::query(
        "UPDATE comprehensive_returns SET sync_status = 'synced', last_sync_at = CURRENT_TIMESTAMP WHERE id = ?1"
    )
    .bind(return_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to mark return as synced: {}", e))?;

    Ok(())
}

#[command]
pub async fn mark_return_as_error(
    pool: State<'_, SqlitePool>,
    return_id: i64,
    error: String,
) -> Result<(), String> {
    let pool_ref = pool.inner();

    sqlx::query(
        "UPDATE comprehensive_returns SET sync_status = 'error', notes = COALESCE(notes || ' | ', '') || 'Sync Error: ' || ?1 WHERE id = ?2"
    )
    .bind(error)
    .bind(return_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to mark return as error: {}", e))?;

    Ok(())
}

fn generate_random_number(min: i32, max: i32) -> i32 {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    rng.gen_range(min..=max)
}
