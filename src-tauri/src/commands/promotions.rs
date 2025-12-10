// src-tauri/src/commands/promotions.rs
use crate::models::*;
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_promotions(
    pool: State<'_, SqlitePool>,
    is_active: Option<bool>,
) -> Result<Vec<Promotion>, String> {
    let query = if let Some(active) = is_active {
        format!(
            "SELECT * FROM promotions WHERE is_active = {} ORDER BY created_at DESC",
            if active { 1 } else { 0 }
        )
    } else {
        "SELECT * FROM promotions ORDER BY created_at DESC".to_string()
    };

    let promotions = sqlx::query_as::<_, Promotion>(&query)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch promotions: {}", e))?;

    Ok(promotions)
}

#[tauri::command]
pub async fn get_promotion(
    pool: State<'_, SqlitePool>,
    promotion_id: i64,
) -> Result<Promotion, String> {
    let promotion = sqlx::query_as::<_, Promotion>("SELECT * FROM promotions WHERE id = ?")
        .bind(promotion_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to fetch promotion: {}", e))?;

    Ok(promotion)
}

#[tauri::command]
pub async fn get_promotion_by_code(
    pool: State<'_, SqlitePool>,
    code: String,
) -> Result<Promotion, String> {
    let promotion = sqlx::query_as::<_, Promotion>(
        "SELECT * FROM promotions WHERE code = ? AND is_active = 1",
    )
    .bind(&code)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Promotion not found: {}", e))?;

    Ok(promotion)
}

#[tauri::command]
pub async fn create_promotion(
    pool: State<'_, SqlitePool>,
    request: CreatePromotionRequest,
    user_id: i64,
) -> Result<Promotion, String> {
    let result = sqlx::query(
        "INSERT INTO promotions (
            code, name, description, discount_type, discount_value,
            min_purchase_amount, max_discount_amount, start_date, end_date,
            usage_limit, customer_type, applicable_products, applicable_categories,
            created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&request.code)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.discount_type)
    .bind(&request.discount_value)
    .bind(&request.min_purchase_amount)
    .bind(&request.max_discount_amount)
    .bind(&request.start_date)
    .bind(&request.end_date)
    .bind(&request.usage_limit)
    .bind(&request.customer_type)
    .bind(&request.applicable_products)
    .bind(&request.applicable_categories)
    .bind(user_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to create promotion: {}", e))?;

    let promotion_id = result.last_insert_rowid();
    get_promotion(pool, promotion_id).await
}

#[tauri::command]
pub async fn update_promotion(
    pool: State<'_, SqlitePool>,
    promotion_id: i64,
    request: UpdatePromotionRequest,
) -> Result<Promotion, String> {
    sqlx::query(
        "UPDATE promotions SET
            code = COALESCE(?, code),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            discount_type = COALESCE(?, discount_type),
            discount_value = COALESCE(?, discount_value),
            min_purchase_amount = COALESCE(?, min_purchase_amount),
            max_discount_amount = COALESCE(?, max_discount_amount),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            usage_limit = COALESCE(?, usage_limit),
            customer_type = COALESCE(?, customer_type),
            applicable_products = COALESCE(?, applicable_products),
            applicable_categories = COALESCE(?, applicable_categories),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&request.code)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.discount_type)
    .bind(&request.discount_value)
    .bind(&request.min_purchase_amount)
    .bind(&request.max_discount_amount)
    .bind(&request.start_date)
    .bind(&request.end_date)
    .bind(&request.usage_limit)
    .bind(&request.customer_type)
    .bind(&request.applicable_products)
    .bind(&request.applicable_categories)
    .bind(&request.is_active)
    .bind(promotion_id)
    .execute(pool.inner())
    .await
    .map_err(|e| format!("Failed to update promotion: {}", e))?;

    get_promotion(pool, promotion_id).await
}

#[tauri::command]
pub async fn delete_promotion(
    pool: State<'_, SqlitePool>,
    promotion_id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM promotions WHERE id = ?")
        .bind(promotion_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete promotion: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn validate_promotion(
    pool: State<'_, SqlitePool>,
    code: String,
    purchase_amount: f64,
    customer_type: Option<String>,
) -> Result<Promotion, String> {
    let promotion = get_promotion_by_code(pool.clone(), code).await?;

    // Check if promotion is valid
    let now = chrono::Local::now().format("%Y-%m-%d").to_string();

    if promotion.start_date > now {
        return Err("Promotion has not started yet".to_string());
    }

    if let Some(end_date) = &promotion.end_date {
        if end_date < &now {
            return Err("Promotion has expired".to_string());
        }
    }

    // Check minimum purchase
    if purchase_amount < promotion.min_purchase_amount {
        return Err(format!(
            "Minimum purchase amount is {}",
            promotion.min_purchase_amount
        ));
    }

    // Check usage limit
    if let Some(limit) = promotion.usage_limit {
        if promotion.usage_count >= limit {
            return Err("Promotion usage limit reached".to_string());
        }
    }

    // Check customer type
    if let Some(promo_customer_type) = &promotion.customer_type {
        if promo_customer_type != "All" {
            if let Some(cust_type) = customer_type {
                if &cust_type != promo_customer_type {
                    return Err("Promotion not applicable to this customer type".to_string());
                }
            } else {
                return Err("Customer type required for this promotion".to_string());
            }
        }
    }

    Ok(promotion)
}
