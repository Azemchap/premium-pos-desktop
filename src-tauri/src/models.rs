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
    pub pin_code: Option<String>,
    pub permissions: Option<String>, // JSON string for granular permissions
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
    pub pin_code: Option<String>,
    pub permissions: Option<String>,
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
    pub subcategory: Option<String>,
    pub brand: Option<String>,
    pub unit_of_measure: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub tax_rate: f64,
    pub is_active: bool,
    pub is_taxable: bool,
    pub weight: f64,
    pub dimensions: Option<String>, // JSON string for length, width, height
    pub supplier_info: Option<String>, // JSON string for supplier details
    pub reorder_point: i32,
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
    pub subcategory: Option<String>,
    pub brand: Option<String>,
    pub unit_of_measure: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub tax_rate: f64,
    pub is_taxable: bool,
    pub weight: f64,
    pub dimensions: Option<String>,
    pub supplier_info: Option<String>,
    pub reorder_point: i32,
}

// Inventory models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryItem {
    pub id: i64,
    pub product_id: i64,
    pub current_stock: i32,
    pub minimum_stock: i32,
    pub maximum_stock: i32,
    pub reserved_stock: i32,
    pub available_stock: i32,
    pub last_updated: String,
    pub last_stock_take: Option<String>,
    pub stock_take_count: i32,
    pub product: Option<Product>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockUpdateRequest {
    pub product_id: i64,
    pub quantity_change: i32,
    pub movement_type: String,
    pub notes: Option<String>,
    pub reference_id: Option<i64>,
    pub reference_type: Option<String>,
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
    pub customer_phone: Option<String>,
    pub customer_email: Option<String>,
    pub notes: Option<String>,
    pub is_voided: bool,
    pub voided_by: Option<i64>,
    pub voided_at: Option<String>,
    pub void_reason: Option<String>,
    pub shift_id: Option<i64>,
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
    pub customer_phone: Option<String>,
    pub customer_email: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub line_total: f64,
    pub tax_amount: f64,
    pub cost_price: f64,
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
    pub tax_amount: f64,
    pub cost_price: f64,
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
    pub logo_path: Option<String>,
    pub receipt_header: Option<String>,
    pub receipt_footer: Option<String>,
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
    pub logo_path: Option<String>,
    pub receipt_header: Option<String>,
    pub receipt_footer: Option<String>,
}

// Shift models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Shift {
    pub id: i64,
    pub user_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub opening_amount: f64,
    pub closing_amount: Option<f64>,
    pub total_sales: f64,
    pub total_returns: f64,
    pub cash_sales: f64,
    pub card_sales: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShiftRequest {
    pub opening_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloseShiftRequest {
    pub closing_amount: f64,
    pub notes: Option<String>,
}

// Cash drawer transaction models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CashDrawerTransaction {
    pub id: i64,
    pub shift_id: i64,
    pub transaction_type: String,
    pub amount: f64,
    pub reason: Option<String>,
    pub user_id: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCashDrawerTransactionRequest {
    pub shift_id: i64,
    pub transaction_type: String,
    pub amount: f64,
    pub reason: Option<String>,
}

// Receipt template models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReceiptTemplate {
    pub id: i64,
    pub name: String,
    pub template_type: String,
    pub printer_type: String,
    pub template_content: String,
    pub is_default: bool,
    pub paper_width: i32,
    pub font_size: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReceiptTemplateRequest {
    pub name: String,
    pub template_type: String,
    pub printer_type: String,
    pub template_content: String,
    pub is_default: bool,
    pub paper_width: i32,
    pub font_size: i32,
}

// Dashboard statistics models
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub today_sales: f64,
    pub today_transactions: i32,
    pub total_products: i32,
    pub low_stock_items: i32,
    pub average_transaction_value: f64,
    pub week_sales: f64,
    pub month_sales: f64,
}

// Search and filter models
#[derive(Debug, Serialize, Deserialize)]
pub struct ProductSearchRequest {
    pub query: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub is_active: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesSearchRequest {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub cashier_id: Option<i64>,
    pub payment_method: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}