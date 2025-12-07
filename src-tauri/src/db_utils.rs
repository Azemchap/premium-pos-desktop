use crate::error::{AppError, AppResult};
use sqlx::{Pool, Sqlite, Transaction};

/// Execute a database operation with automatic rollback on error
/// This ensures atomicity for complex operations
pub async fn execute_transaction<F, T>(
    pool: &Pool<Sqlite>,
    operation: F,
) -> AppResult<T>
where
    F: for<'a> FnOnce(&'a mut Transaction<'a, Sqlite>) -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<T>> + Send + 'a>>,
{
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::database_error(&e.to_string()))?;

    match operation(&mut tx).await {
        Ok(result) => {
            tx.commit()
                .await
                .map_err(|e| AppError::database_error(&e.to_string()))?;
            Ok(result)
        }
        Err(e) => {
            let _ = tx.rollback().await; // Ignore rollback errors
            Err(e)
        }
    }
}

/// Check if a record exists
pub async fn record_exists(
    pool: &Pool<Sqlite>,
    table: &str,
    id_column: &str,
    id: i64,
) -> AppResult<bool> {
    let query = format!(
        "SELECT COUNT(*) as count FROM {} WHERE {} = ?",
        table, id_column
    );

    let count: i64 = sqlx::query_scalar(&query)
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::database_error(&e.to_string()))?;

    Ok(count > 0)
}

/// Check if a record is referenced by other tables
pub async fn check_references(
    pool: &Pool<Sqlite>,
    checks: Vec<(String, String, i64)>, // (table, column, id)
) -> AppResult<Option<String>> {
    for (table, column, id) in checks {
        let query = format!(
            "SELECT COUNT(*) as count FROM {} WHERE {} = ?",
            table, column
        );

        let count: i64 = sqlx::query_scalar(&query)
            .bind(id)
            .fetch_one(pool)
            .await
            .map_err(|e| AppError::database_error(&e.to_string()))?;

        if count > 0 {
            return Ok(Some(table));
        }
    }

    Ok(None)
}

/// Generate a unique number for entities (sale_number, po_number, etc.)
pub async fn generate_unique_number(
    pool: &Pool<Sqlite>,
    prefix: &str,
    table: &str,
    column: &str,
) -> AppResult<String> {
    // Get the highest existing number
    let query = format!(
        "SELECT MAX(CAST(SUBSTR({}, LENGTH(?1) + 2) AS INTEGER)) as max_num FROM {} WHERE {} LIKE ?2",
        column, table, column
    );

    let max_num: Option<i64> = sqlx::query_scalar(&query)
        .bind(prefix)
        .bind(format!("{}-%", prefix))
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::database_error(&e.to_string()))?;

    let next_num = max_num.unwrap_or(0) + 1;
    Ok(format!("{}-{:06}", prefix, next_num))
}

/// Acquire a lock for a specific resource (naive implementation using a table)
pub async fn acquire_lock(
    pool: &Pool<Sqlite>,
    resource_type: &str,
    resource_id: i64,
) -> AppResult<()> {
    // Create locks table if it doesn't exist
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS resource_locks (
            resource_type TEXT NOT NULL,
            resource_id INTEGER NOT NULL,
            locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (resource_type, resource_id)
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::database_error(&e.to_string()))?;

    // Try to acquire lock
    let result = sqlx::query(
        "INSERT INTO resource_locks (resource_type, resource_id) VALUES (?, ?)"
    )
    .bind(resource_type)
    .bind(resource_id)
    .execute(pool)
    .await;

    match result {
        Ok(_) => Ok(()),
        Err(_) => Err(AppError::concurrent_modification()),
    }
}

/// Release a lock for a specific resource
pub async fn release_lock(
    pool: &Pool<Sqlite>,
    resource_type: &str,
    resource_id: i64,
) -> AppResult<()> {
    sqlx::query(
        "DELETE FROM resource_locks WHERE resource_type = ? AND resource_id = ?"
    )
    .bind(resource_type)
    .bind(resource_id)
    .execute(pool)
    .await
    .map_err(|e| AppError::database_error(&e.to_string()))?;

    Ok(())
}

/// Clean up old locks (older than 1 hour)
pub async fn cleanup_stale_locks(pool: &Pool<Sqlite>) -> AppResult<()> {
    sqlx::query(
        "DELETE FROM resource_locks WHERE locked_at < datetime('now', '-1 hour')"
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::database_error(&e.to_string()))?;

    Ok(())
}

/// Execute with retry logic for transient failures
pub async fn execute_with_retry<F, T>(
    max_retries: u32,
    operation: F,
) -> AppResult<T>
where
    F: Fn() -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<T>>>>,
{
    let mut attempts = 0;

    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                attempts += 1;
                if attempts >= max_retries {
                    return Err(e);
                }

                // Check if error is retryable (database locked, connection issues)
                let is_retryable = match &e.code[..] {
                    "DB_001" | "DB_002" | "TXN_003" => true,
                    _ => false,
                };

                if !is_retryable {
                    return Err(e);
                }

                // Exponential backoff
                let delay = std::time::Duration::from_millis(100 * 2u64.pow(attempts - 1));
                tokio::time::sleep(delay).await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_unique_number() {
        // Would need a test database setup
    }
}
