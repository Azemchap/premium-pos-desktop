use tauri::{command, State};
use sqlx::{SqlitePool, Row};
use crate::models::{ReceiptTemplate, CreateReceiptTemplateRequest};

#[command]
pub async fn get_templates(
    pool: State<'_, SqlitePool>,
    template_type: Option<String>,
    printer_type: Option<String>,
) -> Result<Vec<ReceiptTemplate>, String> {
    let pool_ref = pool.inner();
    
    let query = if template_type.is_some() && printer_type.is_some() {
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE template_type = ?1 AND printer_type = ?2 ORDER BY is_default DESC, name ASC"
    } else if template_type.is_some() {
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE template_type = ?1 ORDER BY is_default DESC, name ASC"
    } else if printer_type.is_some() {
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE printer_type = ?1 ORDER BY is_default DESC, name ASC"
    } else {
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates ORDER BY template_type, is_default DESC, name ASC"
    };

    let rows = if template_type.is_some() && printer_type.is_some() {
        sqlx::query(query)
            .bind(template_type.as_ref().unwrap())
            .bind(printer_type.as_ref().unwrap())
            .fetch_all(pool_ref)
            .await
    } else if template_type.is_some() {
        sqlx::query(query)
            .bind(template_type.as_ref().unwrap())
            .fetch_all(pool_ref)
            .await
    } else if printer_type.is_some() {
        sqlx::query(query)
            .bind(printer_type.as_ref().unwrap())
            .fetch_all(pool_ref)
            .await
    } else {
        sqlx::query(query)
            .fetch_all(pool_ref)
            .await
    }
    .map_err(|e| format!("Database error: {}", e))?;

    let mut templates = Vec::new();
    for row in rows {
        let template = ReceiptTemplate {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            template_type: row.try_get("template_type").map_err(|e| e.to_string())?,
            printer_type: row.try_get("printer_type").map_err(|e| e.to_string())?,
            template_content: row.try_get("template_content").map_err(|e| e.to_string())?,
            is_default: row.try_get("is_default").map_err(|e| e.to_string())?,
            paper_width: row.try_get("paper_width").map_err(|e| e.to_string())?,
            font_size: row.try_get("font_size").map_err(|e| e.to_string())?,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        };
        templates.push(template);
    }

    Ok(templates)
}

#[command]
pub async fn create_template(
    pool: State<'_, SqlitePool>,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    let pool_ref = pool.inner();
    
    // If this is a default template, unset other defaults of the same type
    if request.is_default {
        sqlx::query(
            "UPDATE receipt_templates SET is_default = 0 WHERE template_type = ?1 AND printer_type = ?2"
        )
        .bind(&request.template_type)
        .bind(&request.printer_type)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to update existing defaults: {}", e))?;
    }

    // Create new template
    let result = sqlx::query(
        "INSERT INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to create template: {}", e))?;

    let template_id = result.last_insert_rowid();

    // Get the created template
    let row = sqlx::query(
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE id = ?1"
    )
    .bind(template_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch created template: {}", e))?;

    let template = ReceiptTemplate {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        name: row.try_get("name").map_err(|e| e.to_string())?,
        template_type: row.try_get("template_type").map_err(|e| e.to_string())?,
        printer_type: row.try_get("printer_type").map_err(|e| e.to_string())?,
        template_content: row.try_get("template_content").map_err(|e| e.to_string())?,
        is_default: row.try_get("is_default").map_err(|e| e.to_string())?,
        paper_width: row.try_get("paper_width").map_err(|e| e.to_string())?,
        font_size: row.try_get("font_size").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    Ok(template)
}

#[command]
pub async fn update_template(
    pool: State<'_, SqlitePool>,
    template_id: i64,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    let pool_ref = pool.inner();
    
    // If this is a default template, unset other defaults of the same type
    if request.is_default {
        sqlx::query(
            "UPDATE receipt_templates SET is_default = 0 WHERE template_type = ?1 AND printer_type = ?2 AND id != ?3"
        )
        .bind(&request.template_type)
        .bind(&request.printer_type)
        .bind(template_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to update existing defaults: {}", e))?;
    }

    // Update template
    sqlx::query(
        "UPDATE receipt_templates SET 
            name = ?1, template_type = ?2, printer_type = ?3, template_content = ?4, 
            is_default = ?5, paper_width = ?6, font_size = ?7, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?8"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .bind(template_id)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Failed to update template: {}", e))?;

    // Get the updated template
    let row = sqlx::query(
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE id = ?1"
    )
    .bind(template_id)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Failed to fetch updated template: {}", e))?;

    let template = ReceiptTemplate {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        name: row.try_get("name").map_err(|e| e.to_string())?,
        template_type: row.try_get("template_type").map_err(|e| e.to_string())?,
        printer_type: row.try_get("printer_type").map_err(|e| e.to_string())?,
        template_content: row.try_get("template_content").map_err(|e| e.to_string())?,
        is_default: row.try_get("is_default").map_err(|e| e.to_string())?,
        paper_width: row.try_get("paper_width").map_err(|e| e.to_string())?,
        font_size: row.try_get("font_size").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
        updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
    };

    Ok(template)
}

#[command]
pub async fn delete_template(
    pool: State<'_, SqlitePool>,
    template_id: i64,
) -> Result<bool, String> {
    let pool_ref = pool.inner();
    
    // Check if template is default
    let template = sqlx::query(
        "SELECT is_default FROM receipt_templates WHERE id = ?1"
    )
    .bind(template_id)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let template = match template {
        Some(t) => t,
        None => return Err("Template not found".to_string()),
    };

    let is_default: bool = template.try_get("is_default").map_err(|e| e.to_string())?;
    if is_default {
        return Err("Cannot delete default template".to_string());
    }

    // Delete template
    sqlx::query("DELETE FROM receipt_templates WHERE id = ?1")
        .bind(template_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to delete template: {}", e))?;

    Ok(true)
}

#[command]
pub async fn get_default_template(
    pool: State<'_, SqlitePool>,
    template_type: String,
    printer_type: String,
) -> Result<Option<ReceiptTemplate>, String> {
    let pool_ref = pool.inner();
    
    let row = sqlx::query(
        "SELECT id, name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at
         FROM receipt_templates WHERE template_type = ?1 AND printer_type = ?2 AND is_default = 1"
    )
    .bind(template_type)
    .bind(printer_type)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    match row {
        Some(r) => {
            let template = ReceiptTemplate {
                id: r.try_get("id").map_err(|e| e.to_string())?,
                name: r.try_get("name").map_err(|e| e.to_string())?,
                template_type: r.try_get("template_type").map_err(|e| e.to_string())?,
                printer_type: r.try_get("printer_type").map_err(|e| e.to_string())?,
                template_content: r.try_get("template_content").map_err(|e| e.to_string())?,
                is_default: r.try_get("is_default").map_err(|e| e.to_string())?,
                paper_width: r.try_get("paper_width").map_err(|e| e.to_string())?,
                font_size: r.try_get("font_size").map_err(|e| e.to_string())?,
                created_at: r.try_get("created_at").map_err(|e| e.to_string())?,
                updated_at: r.try_get("updated_at").map_err(|e| e.to_string())?,
            };
            Ok(Some(template))
        }
        None => Ok(None),
    }
}
