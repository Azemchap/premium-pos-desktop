use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
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
    pub initial_stock: i64,
    pub minimum_stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryItem {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub minimum_stock: i64,
    pub maximum_stock: i64,
    pub last_updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockUpdateRequest {
    pub product_id: i64,
    pub quantity_change: i64,
    pub movement_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
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
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleRequest {
    pub items: Vec<CreateSaleItemRequest>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total_amount: f64,
    pub payment_method: String,
    pub customer_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleItemRequest {
    pub product_id: i64,
    pub quantity: i64,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub line_total: f64,
}