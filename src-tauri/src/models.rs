use serde::{Deserialize, Serialize};

// User models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub is_active: bool,
    pub last_login: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub user: User,
    pub session_token: String,
}

// Product models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit_of_measure: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit_of_measure: String,
    pub cost_price: f64,
    pub selling_price: f64,
}

// Inventory models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryItem {
    pub id: i64,
    pub product_id: i64,
    pub current_stock: i32,
    pub minimum_stock: i32,
    pub maximum_stock: i32,
    pub last_updated: String,
    pub product: Option<Product>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockUpdateRequest {
    pub product_id: i64,
    pub quantity_change: i32,
    pub movement_type: String,
    pub notes: Option<String>,
}

// Sales models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sale {
    pub id: i64,
    pub sale_number: String,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total_amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub cashier_id: i64,
    pub customer_name: Option<String>,
    pub notes: Option<String>,
    pub is_voided: bool,
    pub voided_by: Option<i64>,
    pub voided_at: Option<String>,
    pub void_reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleRequest {
    pub items: Vec<SaleItemRequest>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total_amount: f64,
    pub payment_method: String,
    pub customer_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub line_total: f64,
    pub created_at: String,
    pub product: Option<Product>,
}

// Store configuration models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoreConfig {
    pub id: i64,
    pub name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: f64,
    pub currency: String,
    pub timezone: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStoreConfigRequest {
    pub name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: f64,
    pub currency: String,
    pub timezone: String,
}