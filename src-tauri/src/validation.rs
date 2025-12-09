use crate::error::{AppError, AppResult};
use regex::Regex;

/// Validate email format
pub fn validate_email(email: &str) -> AppResult<()> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    if email_regex.is_match(email) {
        Ok(())
    } else {
        Err(AppError::invalid_format("email"))
    }
}

/// Validate password complexity
/// Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
pub fn validate_password_strength(password: &str) -> AppResult<()> {
    if password.len() < 8 {
        return Err(AppError::weak_password());
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());

    if !has_uppercase || !has_lowercase || !has_digit {
        return Err(AppError::weak_password());
    }

    Ok(())
}

/// Validate phone number format (US)
pub fn validate_phone(phone: &str) -> AppResult<()> {
    let phone_regex =
        Regex::new(r"^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$").unwrap();
    if phone_regex.is_match(phone) {
        Ok(())
    } else {
        Err(AppError::invalid_format("phone"))
    }
}

/// Validate that a value is not negative
pub fn validate_non_negative<T: PartialOrd + Default>(value: T, field: &str) -> AppResult<()> {
    if value < T::default() {
        Err(AppError::negative_value(field))
    } else {
        Ok(())
    }
}

/// Validate that a value is positive
pub fn validate_positive(value: f64, field: &str) -> AppResult<()> {
    if value <= 0.0 {
        Err(AppError::validation_error(&format!(
            "{} must be positive",
            field
        )))
    } else {
        Ok(())
    }
}

/// Validate string is not empty
pub fn validate_not_empty(value: &str, field: &str) -> AppResult<()> {
    if value.trim().is_empty() {
        Err(AppError::validation_error(&format!(
            "{} cannot be empty",
            field
        )))
    } else {
        Ok(())
    }
}

/// Validate string length
pub fn validate_length(value: &str, min: usize, max: usize, field: &str) -> AppResult<()> {
    let len = value.len();
    if len < min || len > max {
        Err(AppError::validation_error(&format!(
            "{} must be between {} and {} characters",
            field, min, max
        )))
    } else {
        Ok(())
    }
}

/// Validate that a date is not in the future
pub fn validate_date_not_future(_date: &str) -> AppResult<()> {
    // TODO: Implement date validation logic
    // For now, just basic check - accept all dates
    Ok(())
}

/// Validate SKU format (alphanumeric, hyphens allowed)
pub fn validate_sku(sku: &str) -> AppResult<()> {
    let sku_regex = Regex::new(r"^[A-Za-z0-9\-_]+$").unwrap();
    if sku_regex.is_match(sku) && sku.len() >= 2 && sku.len() <= 50 {
        Ok(())
    } else {
        Err(AppError::invalid_format("SKU"))
    }
}

/// Validate barcode format (numeric, 8-14 digits)
pub fn validate_barcode(barcode: &str) -> AppResult<()> {
    let barcode_regex = Regex::new(r"^\d{8,14}$").unwrap();
    if barcode_regex.is_match(barcode) {
        Ok(())
    } else {
        Err(AppError::invalid_format("barcode"))
    }
}

/// Validate quantity (must be positive integer)
pub fn validate_quantity(quantity: i32, field: &str) -> AppResult<()> {
    if quantity <= 0 {
        Err(AppError::validation_error(&format!(
            "{} must be greater than 0",
            field
        )))
    } else {
        Ok(())
    }
}

/// Validate price (must be non-negative)
pub fn validate_price(price: f64, field: &str) -> AppResult<()> {
    if price < 0.0 {
        Err(AppError::negative_value(field))
    } else {
        Ok(())
    }
}

/// Validate enum value
pub fn validate_enum<T: PartialEq>(value: &T, allowed: &[T], field: &str) -> AppResult<()>
where
    T: std::fmt::Debug,
{
    if allowed.contains(value) {
        Ok(())
    } else {
        Err(AppError::validation_error(&format!(
            "Invalid value for {}",
            field
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("user@example.com").is_ok());
        assert!(validate_email("invalid-email").is_err());
    }

    #[test]
    fn test_password_strength() {
        assert!(validate_password_strength("StrongPass1").is_ok());
        assert!(validate_password_strength("weak").is_err());
        assert!(validate_password_strength("NoDigits!").is_err());
    }

    #[test]
    fn test_sku_validation() {
        assert!(validate_sku("SKU-123").is_ok());
        assert!(validate_sku("A").is_err());
        assert!(validate_sku("invalid sku").is_err());
    }
}
