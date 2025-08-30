use crate::models::{ReceiptTemplate, CreateReceiptTemplateRequest};
use sqlx::{SqlitePool, Row};

pub async fn get_receipt_templates(
    pool: &SqlitePool,
) -> Result<Vec<ReceiptTemplate>, String> {
    let rows = sqlx::query("SELECT * FROM receipt_templates ORDER BY name")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

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

pub async fn create_receipt_template(
    pool: &SqlitePool,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    let template_id = sqlx::query(
        "INSERT INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(chrono::Utc::now().naive_utc().to_string())
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let template = ReceiptTemplate {
        id: template_id,
        name: request.name,
        template_type: request.template_type,
        printer_type: request.printer_type,
        template_content: request.template_content,
        is_default: request.is_default,
        paper_width: request.paper_width,
        font_size: request.font_size,
        created_at: chrono::Utc::now().naive_utc().to_string(),
        updated_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(template)
}

pub async fn update_receipt_template(
    pool: &SqlitePool,
    template_id: i64,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    sqlx::query(
        "UPDATE receipt_templates SET name = ?, template_type = ?, printer_type = ?, template_content = ?, is_default = ?, paper_width = ?, font_size = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .bind(chrono::Utc::now().naive_utc().to_string())
    .bind(template_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    let template = ReceiptTemplate {
        id: template_id,
        name: request.name,
        template_type: request.template_type,
        printer_type: request.printer_type,
        template_content: request.template_content,
        is_default: request.is_default,
        paper_width: request.paper_width,
        font_size: request.font_size,
        created_at: chrono::Utc::now().naive_utc().to_string(),
        updated_at: chrono::Utc::now().naive_utc().to_string(),
    };

    Ok(template)
}

pub async fn delete_receipt_template(
    pool: &SqlitePool,
    template_id: i64,
) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM receipt_templates WHERE id = ?")
        .bind(template_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

pub async fn get_default_template(
    pool: &SqlitePool,
) -> Result<Option<ReceiptTemplate>, String> {
    let row = sqlx::query("SELECT * FROM receipt_templates WHERE is_default = 1 LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
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
        Ok(Some(template))
    } else {
        Ok(None)
    }
}