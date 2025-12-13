// src-tauri/src/commands/sync.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{Row, SqlitePool, Column};
use std::collections::HashMap;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncData {
    pub users: Option<Vec<Value>>,
    pub products: Option<Vec<Value>>,
    pub categories: Option<Vec<Value>>,
    pub customers: Option<Vec<Value>>,
    pub suppliers: Option<Vec<Value>>,
    pub sales: Option<Vec<Value>>,
    pub sale_items: Option<Vec<Value>>,
    pub inventory: Option<Vec<Value>>,
    pub purchase_orders: Option<Vec<Value>>,
    pub purchase_order_items: Option<Vec<Value>>,
    pub expenses: Option<Vec<Value>>,
    pub employees: Option<Vec<Value>>,
    pub promotions: Option<Vec<Value>>,
    pub appointments: Option<Vec<Value>>,
    pub time_tracking: Option<Vec<Value>>,
    pub store_config: Option<Vec<Value>>,
    pub returns: Option<Vec<Value>>,
    pub return_items: Option<Vec<Value>>,
}

/// Sync data from cloud (Supabase) to local SQLite database
#[tauri::command]
pub async fn sync_from_cloud(
    pool: State<'_, SqlitePool>,
    data: HashMap<String, Vec<Value>>,
) -> Result<String, String> {
    println!("🔄 Starting cloud sync to local database...");

    let mut synced_tables = Vec::new();
    let mut errors = Vec::new();

    // Process each table
    for (table_name, records) in data.iter() {
        if records.is_empty() {
            continue;
        }

        match sync_table_to_local(&pool, table_name, records).await {
            Ok(count) => {
                println!("✅ Synced {} records to {}", count, table_name);
                synced_tables.push(table_name.clone());
            }
            Err(e) => {
                eprintln!("❌ Failed to sync {}: {}", table_name, e);
                errors.push(format!("{}: {}", table_name, e));
            }
        }
    }

    if errors.is_empty() {
        Ok(format!(
            "Successfully synced {} tables: {}",
            synced_tables.len(),
            synced_tables.join(", ")
        ))
    } else {
        Err(format!(
            "Synced {} tables with {} errors: {}",
            synced_tables.len(),
            errors.len(),
            errors.join("; ")
        ))
    }
}

/// Helper function to sync a specific table
async fn sync_table_to_local(
    pool: &SqlitePool,
    table_name: &str,
    records: &[Value],
) -> Result<usize, String> {
    let mut synced_count = 0;

    // For each record, upsert into local database
    for record in records {
        match upsert_record(pool, table_name, record).await {
            Ok(_) => synced_count += 1,
            Err(e) => {
                eprintln!("⚠️ Failed to upsert record in {}: {}", table_name, e);
            }
        }
    }

    Ok(synced_count)
}

/// Generic upsert function for any table
async fn upsert_record(pool: &SqlitePool, table_name: &str, record: &Value) -> Result<(), String> {
    let record_obj = record
        .as_object()
        .ok_or_else(|| "Record is not a valid object".to_string())?;

    // Get all field names and values
    let fields: Vec<String> = record_obj.keys().cloned().collect();
    let placeholders: Vec<String> = (1..=fields.len()).map(|i| format!("?{}", i)).collect();

    // Build UPDATE clause, excluding 'id' field
    let update_clauses: Vec<String> = fields
        .iter()
        .enumerate()
        .filter(|(_, field)| *field != "id") // Skip id field by name, not index
        .map(|(i, field)| format!("{} = ?{}", field, i + 1))
        .collect();

    // Build UPSERT query
    let query = format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}",
        table_name,
        fields.join(", "),
        placeholders.join(", "),
        update_clauses.join(", ")
    );

    // Bind values dynamically
    let mut query_builder = sqlx::query(&query);
    for field in &fields {
        let value = &record_obj[field];
        match value {
            Value::String(s) => query_builder = query_builder.bind(s),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query_builder = query_builder.bind(i);
                } else if let Some(f) = n.as_f64() {
                    query_builder = query_builder.bind(f);
                } else {
                    return Err(format!("Unsupported number type for field {}", field));
                }
            }
            Value::Bool(b) => query_builder = query_builder.bind(b),
            Value::Null => query_builder = query_builder.bind(Option::<String>::None),
            _ => {
                return Err(format!("Unsupported value type for field {}", field));
            }
        }
    }

    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(())
}

/// Get local data for uploading to cloud
#[tauri::command]
pub async fn get_local_data_for_sync(
    pool: State<'_, SqlitePool>,
) -> Result<HashMap<String, Vec<Value>>, String> {
    println!("📤 Fetching local data for cloud sync...");

    let tables = vec![
        "users",
        "products",
        "categories",
        "customers",
        "suppliers",
        "sales",
        "sale_items",
        "inventory",
        "purchase_orders",
        "purchase_order_items",
        "expenses",
        "employees",
        "promotions",
        "appointments",
        "time_tracking",
        "store_config",
        "returns",
        "return_items",
    ];

    let mut result = HashMap::new();

    for table in tables {
        match fetch_table_data(&pool, table).await {
            Ok(data) => {
                if !data.is_empty() {
                    result.insert(table.to_string(), data);
                }
            }
            Err(e) => {
                eprintln!("⚠️ Failed to fetch {}: {}", table, e);
            }
        }
    }

    Ok(result)
}

/// Fetch all records from a table
async fn fetch_table_data(pool: &SqlitePool, table_name: &str) -> Result<Vec<Value>, String> {
    let query = format!("SELECT * FROM {}", table_name);

    let rows = sqlx::query(&query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch {}: {}", table_name, e))?;

    let mut records = Vec::new();

    for row in rows {
        let mut record = serde_json::Map::new();
        
        // Get column information from the row
        let columns = row.columns();
        
        for (idx, column) in columns.iter().enumerate() {
            let column_name = column.name();
            
            // Try to extract value based on SQLite type
            // SQLite has dynamic typing, so we try multiple types
            if let Ok(val) = row.try_get::<String, _>(idx) {
                record.insert(column_name.to_string(), Value::String(val));
            } else if let Ok(val) = row.try_get::<i64, _>(idx) {
                record.insert(column_name.to_string(), Value::Number(val.into()));
            } else if let Ok(val) = row.try_get::<f64, _>(idx) {
                if let Some(num) = serde_json::Number::from_f64(val) {
                    record.insert(column_name.to_string(), Value::Number(num));
                }
            } else if let Ok(val) = row.try_get::<bool, _>(idx) {
                record.insert(column_name.to_string(), Value::Bool(val));
            } else if let Ok(_) = row.try_get::<Option<String>, _>(idx) {
                // NULL value
                record.insert(column_name.to_string(), Value::Null);
            } else {
                // If all else fails, try to get as string
                if let Ok(val) = row.try_get::<Option<String>, _>(idx) {
                    record.insert(
                        column_name.to_string(),
                        val.map(Value::String).unwrap_or(Value::Null),
                    );
                } else {
                    record.insert(column_name.to_string(), Value::Null);
                }
            }
        }

        records.push(Value::Object(record));
    }

    Ok(records)
}

/// Check if sync is needed (compare timestamps)
#[tauri::command]
pub async fn check_sync_status(pool: State<'_, SqlitePool>) -> Result<bool, String> {
    // Simple implementation: check if any data exists
    let query = "SELECT COUNT(*) as count FROM products";

    let result: (i64,) = sqlx::query_as(query)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(result.0 == 0)
}

/// Sync a single record from realtime update
#[tauri::command]
pub async fn sync_single_record(
    pool: State<'_, SqlitePool>,
    table: String,
    record: Value,
) -> Result<String, String> {
    println!("🔄 Syncing single record to {}", table);

    match upsert_record(&pool, &table, &record).await {
        Ok(_) => {
            println!("✅ Successfully synced record to {}", table);
            Ok(format!("Record synced to {}", table))
        }
        Err(e) => {
            eprintln!("❌ Failed to sync record to {}: {}", table, e);
            Err(format!("Failed to sync record: {}", e))
        }
    }
}

/// Delete a single record from local database
#[tauri::command]
pub async fn delete_local_record(
    pool: State<'_, SqlitePool>,
    table: String,
    id: i64,
) -> Result<String, String> {
    println!("🗑️ Deleting record {} from {}", id, table);

    let query = format!("DELETE FROM {} WHERE id = ?", table);

    sqlx::query(&query)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to delete record: {}", e))?;

    println!("✅ Successfully deleted record from {}", table);
    Ok(format!("Record deleted from {}", table))
}