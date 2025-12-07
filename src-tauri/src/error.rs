use serde::{Deserialize, Serialize};
use std::fmt;

/// Custom error types for the application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    pub fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            details: None,
        }
    }

    pub fn with_details(code: &str, message: &str, details: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            details: Some(details.to_string()),
        }
    }

    // Authentication errors
    pub fn invalid_credentials() -> Self {
        Self::new("AUTH_001", "Invalid username or password")
    }

    pub fn session_expired() -> Self {
        Self::new("AUTH_002", "Session has expired. Please log in again")
    }

    pub fn session_invalid() -> Self {
        Self::new("AUTH_003", "Invalid session token")
    }

    pub fn rate_limit_exceeded() -> Self {
        Self::new("AUTH_004", "Too many login attempts. Please try again later")
    }

    pub fn weak_password() -> Self {
        Self::new("AUTH_005", "Password does not meet complexity requirements")
    }

    pub fn user_inactive() -> Self {
        Self::new("AUTH_006", "User account is inactive")
    }

    // Validation errors
    pub fn validation_error(message: &str) -> Self {
        Self::new("VAL_001", message)
    }

    pub fn duplicate_entry(field: &str) -> Self {
        Self::with_details("VAL_002", "Duplicate entry found", field)
    }

    pub fn not_found(resource: &str) -> Self {
        Self::with_details("VAL_003", "Resource not found", resource)
    }

    pub fn invalid_format(field: &str) -> Self {
        Self::with_details("VAL_004", "Invalid format", field)
    }

    pub fn negative_value(field: &str) -> Self {
        Self::with_details("VAL_005", "Value cannot be negative", field)
    }

    // Inventory errors
    pub fn insufficient_stock(product: &str, available: i32, requested: i32) -> Self {
        Self::with_details(
            "INV_001",
            &format!("Insufficient stock. Available: {}, Requested: {}", available, requested),
            product,
        )
    }

    pub fn product_inactive(product: &str) -> Self {
        Self::with_details("INV_002", "Product is inactive", product)
    }

    pub fn inventory_not_found(product_id: i64) -> Self {
        Self::with_details(
            "INV_003",
            "Inventory record not found",
            &product_id.to_string(),
        )
    }

    // Transaction errors
    pub fn transaction_failed(reason: &str) -> Self {
        Self::with_details("TXN_001", "Transaction failed", reason)
    }

    pub fn rollback_failed() -> Self {
        Self::new("TXN_002", "Failed to rollback transaction")
    }

    pub fn concurrent_modification() -> Self {
        Self::new("TXN_003", "Concurrent modification detected. Please retry")
    }

    // Sales errors
    pub fn sale_already_voided() -> Self {
        Self::new("SALE_001", "Sale has already been voided")
    }

    pub fn sale_not_found() -> Self {
        Self::new("SALE_002", "Sale not found")
    }

    pub fn invalid_payment_amount() -> Self {
        Self::new("SALE_003", "Payment amount is invalid")
    }

    // Shift errors
    pub fn shift_already_open() -> Self {
        Self::new("SHIFT_001", "A shift is already open for this user")
    }

    pub fn shift_not_found() -> Self {
        Self::new("SHIFT_002", "Shift not found or already closed")
    }

    pub fn shift_has_discrepancy(expected: f64, actual: f64) -> Self {
        Self::with_details(
            "SHIFT_003",
            &format!("Cash drawer discrepancy. Expected: {:.2}, Actual: {:.2}", expected, actual),
            &format!("Difference: {:.2}", actual - expected),
        )
    }

    // Reference integrity errors
    pub fn referenced_by_other_records(resource: &str, references: &str) -> Self {
        Self::with_details(
            "REF_001",
            &format!("Cannot delete {}. Referenced by {}", resource, references),
            references,
        )
    }

    // Database errors
    pub fn database_error(message: &str) -> Self {
        Self::new("DB_001", message)
    }

    pub fn connection_failed() -> Self {
        Self::new("DB_002", "Database connection failed")
    }

    pub fn query_timeout() -> Self {
        Self::new("DB_003", "Query execution timeout")
    }

    // General errors
    pub fn internal_error() -> Self {
        Self::new("SYS_001", "An internal error occurred. Please try again")
    }

    pub fn operation_timeout() -> Self {
        Self::new("SYS_002", "Operation timed out")
    }

    pub fn permission_denied() -> Self {
        Self::new("SYS_003", "Permission denied")
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)?;
        if let Some(details) = &self.details {
            write!(f, " ({})", details)?;
        }
        Ok(())
    }
}

impl std::error::Error for AppError {}

// Convert to string for Tauri commands
impl From<AppError> for String {
    fn from(err: AppError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}

// Helper type for Results
pub type AppResult<T> = Result<T, AppError>;
