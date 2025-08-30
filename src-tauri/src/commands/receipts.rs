use tauri::{command, State};
use crate::models::{ReceiptTemplate, CreateReceiptTemplateRequest};
use sqlx::{SqlitePool, Row};

#[tauri::command]
pub async fn get_receipt_templates(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<ReceiptTemplate>, String> {
    let rows = sqlx::query("SELECT * FROM receipt_templates ORDER BY name")
        .fetch_all(pool.inner())
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
        };
        templates.push(template);
    }

    Ok(templates)
}

#[tauri::command]
pub async fn create_receipt_template(
    pool: State<'_, SqlitePool>,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    let template_id = sqlx::query(
        "INSERT INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    let template = ReceiptTemplate {
        id: template_id,
        name: request.name,
        template_type: request.template_type,
        printer_type: request.printer_type,
        template_content: request.template_content,
    };

    Ok(template)
}

#[tauri::command]
pub async fn update_receipt_template(
    pool: State<'_, SqlitePool>,
    template_id: i64,
    request: CreateReceiptTemplateRequest,
) -> Result<ReceiptTemplate, String> {
    sqlx::query(
        "UPDATE receipt_templates SET name = ?, template_type = ?, printer_type = ?, template_content = ?, is_default = ?, paper_width = ?, font_size = ? WHERE id = ?"
    )
    .bind(&request.name)
    .bind(&request.template_type)
    .bind(&request.printer_type)
    .bind(&request.template_content)
    .bind(request.is_default)
    .bind(request.paper_width)
    .bind(request.font_size)
    .bind(template_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let template = ReceiptTemplate {
        id: template_id,
        name: request.name,
        template_type: request.template_type,
        printer_type: request.printer_type,
        template_content: request.template_content,
    };

    Ok(template)
}

#[tauri::command]
pub async fn delete_receipt_template(
    pool: State<'_, SqlitePool>,
    template_id: i64,
) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM receipt_templates WHERE id = ?")
        .bind(template_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

#[tauri::command]
pub async fn get_default_template(
    pool: State<'_, SqlitePool>,
) -> Result<Option<ReceiptTemplate>, String> {
    let row = sqlx::query("SELECT * FROM receipt_templates WHERE is_default = 1 LIMIT 1")
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let template = ReceiptTemplate {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
            template_type: row.try_get("template_type").map_err(|e| e.to_string())?,
            printer_type: row.try_get("printer_type").map_err(|e| e.to_string())?,
            template_content: row.try_get("template_content").map_err(|e| e.to_string())?,
        };
        Ok(Some(template))
    } else {
        Ok(None)
    }
}