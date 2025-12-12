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
    pub profile_image_url: Option<String>,
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
pub struct UpdateProfileRequest {
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub profile_image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
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

// Customer models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: i64,
    pub customer_number: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub date_of_birth: Option<String>,
    pub customer_type: String,
    pub status: String,
    pub loyalty_points: i32,
    pub total_spent: f64,
    pub total_orders: i32,
    pub average_order_value: f64,
    pub last_purchase_date: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub date_of_birth: Option<String>,
    pub customer_type: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub date_of_birth: Option<String>,
    pub customer_type: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<String>,
}

// Supplier models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Supplier {
    pub id: i64,
    pub supplier_number: String,
    pub company_name: String,
    pub contact_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub payment_terms: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
    pub rating: Option<i32>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSupplierRequest {
    pub company_name: String,
    pub contact_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub payment_terms: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
    pub rating: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSupplierRequest {
    pub company_name: Option<String>,
    pub contact_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub payment_terms: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
    pub rating: Option<i32>,
    pub is_active: Option<bool>,
}

// Expense models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    pub id: i64,
    pub expense_number: String,
    pub category_id: Option<i64>,
    pub vendor: Option<String>,
    pub description: String,
    pub amount: f64,
    pub expense_date: String,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub receipt_url: Option<String>,
    pub is_recurring: bool,
    pub recurring_frequency: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub approved_by: Option<i64>,
    pub approved_at: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateExpenseRequest {
    pub category_id: Option<i64>,
    pub vendor: Option<String>,
    pub description: String,
    pub amount: f64,
    pub expense_date: String,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurring_frequency: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateExpenseRequest {
    pub category_id: Option<i64>,
    pub vendor: Option<String>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub expense_date: Option<String>,
    pub payment_method: Option<String>,
    pub reference_number: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurring_frequency: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

// Purchase Order models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseOrder {
    pub id: i64,
    pub po_number: String,
    pub supplier_id: i64,
    pub order_date: String,
    pub expected_delivery_date: Option<String>,
    pub actual_delivery_date: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub shipping_cost: f64,
    pub total_amount: f64,
    pub status: String,
    pub payment_status: String,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseOrderItem {
    pub id: i64,
    pub purchase_order_id: i64,
    pub product_id: i64,
    pub quantity: i32,
    pub received_quantity: i32,
    pub unit_cost: f64,
    pub total_cost: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseOrderItemInput {
    pub product_id: i64,
    pub quantity: i32,
    pub unit_cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub supplier_id: i64,
    pub order_date: String,
    pub expected_delivery_date: Option<String>,
    pub items: Vec<PurchaseOrderItemInput>,
    pub tax: Option<f64>,
    pub shipping_cost: Option<f64>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_id: Option<i64>,
    pub order_date: Option<String>,
    pub expected_delivery_date: Option<String>,
    pub actual_delivery_date: Option<String>,
    pub status: Option<String>,
    pub payment_status: Option<String>,
    pub payment_method: Option<String>,
    pub tax: Option<f64>,
    pub shipping_cost: Option<f64>,
    pub notes: Option<String>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductSearchRequest {
    pub search_term: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub is_active: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
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
    pub user_id: Option<i64>,
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
    pub payment_status: Option<String>,
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
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: f64,
    pub currency: String,
    pub logo_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStoreConfigRequest {
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: f64,
    pub currency: String,
    pub logo_url: Option<String>,
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

// Product Variants models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariantType {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub display_order: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVariantTypeRequest {
    pub name: String,
    pub description: Option<String>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateVariantTypeRequest {
    pub name: String,
    pub description: Option<String>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariantValue {
    pub id: i64,
    pub variant_type_id: i64,
    pub value: String,
    pub code: Option<String>,
    pub display_order: i32,
    pub hex_color: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVariantValueRequest {
    pub variant_type_id: i64,
    pub value: String,
    pub code: Option<String>,
    pub display_order: Option<i32>,
    pub hex_color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateVariantValueRequest {
    pub value: String,
    pub code: Option<String>,
    pub display_order: Option<i32>,
    pub hex_color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductVariant {
    pub id: i64,
    pub product_id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub variant_name: Option<String>,
    pub cost_price: f64,
    pub selling_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductVariantRequest {
    pub product_id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub variant_name: Option<String>,
    pub cost_price: f64,
    pub selling_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub variant_value_ids: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductVariantRequest {
    pub sku: String,
    pub barcode: Option<String>,
    pub variant_name: Option<String>,
    pub cost_price: f64,
    pub selling_price: Option<f64>,
    pub wholesale_price: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductVariantWithValues {
    pub id: i64,
    pub product_id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub variant_name: Option<String>,
    pub cost_price: f64,
    pub selling_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub variant_values: Vec<VariantValue>,
    pub inventory: Option<VariantInventory>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariantInventory {
    pub id: i64,
    pub product_variant_id: i64,
    pub current_stock: i32,
    pub minimum_stock: i32,
    pub maximum_stock: i32,
    pub reserved_stock: i32,
    pub available_stock: i32,
    pub last_updated: String,
}

// ==================== EMPLOYEE MODELS ====================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Employee {
    pub id: i64,
    pub user_id: i64,
    pub employee_number: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub hire_date: Option<String>,
    pub employment_type: String,
    pub salary_type: String,
    pub hourly_rate: f64,
    pub salary: f64,
    pub commission_rate: f64,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    // User details from join
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub user_id: i64,
    pub department: Option<String>,
    pub position: Option<String>,
    pub hire_date: Option<String>,
    pub employment_type: String,
    pub salary_type: String,
    pub hourly_rate: Option<f64>,
    pub salary: Option<f64>,
    pub commission_rate: Option<f64>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub department: Option<String>,
    pub position: Option<String>,
    pub hire_date: Option<String>,
    pub employment_type: Option<String>,
    pub salary_type: Option<String>,
    pub hourly_rate: Option<f64>,
    pub salary: Option<f64>,
    pub commission_rate: Option<f64>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

// ==================== TIME TRACKING MODELS ====================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimeEntry {
    pub id: i64,
    pub employee_id: i64,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub break_minutes: i32,
    pub total_hours: f64,
    pub hourly_rate: f64,
    pub total_pay: f64,
    pub notes: Option<String>,
    pub status: String,
    pub approved_by: Option<i64>,
    pub approved_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTimeEntryRequest {
    pub employee_id: i64,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub break_minutes: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTimeEntryRequest {
    pub clock_in: Option<String>,
    pub clock_out: Option<String>,
    pub break_minutes: Option<i32>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub approved_by: Option<i64>,
}

// ==================== ORGANIZATION MODELS ====================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Organization {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub industry: Option<String>,
    pub business_type: Option<String>,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: String,
    pub tax_id: Option<String>,
    pub subscription_plan: String,
    pub subscription_status: String,
    pub trial_ends_at: Option<String>,
    pub subscription_ends_at: Option<String>,
    pub settings: Option<String>,
    pub custom_fields: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub legal_name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
    pub slug: String,
    pub industry: Option<String>,
    pub business_type: Option<String>,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub subscription_plan: Option<String>,
    pub subscription_status: Option<String>,
    pub settings: Option<String>,
    pub custom_fields: Option<String>,
    pub legal_name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOrganizationRequest {
    pub name: Option<String>,
    pub industry: Option<String>,
    pub business_type: Option<String>,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub settings: Option<String>,
    pub custom_fields: Option<String>,
    pub legal_name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Location {
    pub id: i64,
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: f64,
    pub currency: String,
    pub logo_url: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateLocationRequest {
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: Option<f64>,
    pub currency: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLocationRequest {
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tax_rate: Option<f64>,
    pub currency: Option<String>,
    pub logo_url: Option<String>,
    pub is_active: Option<bool>,
}

// ==================== PROMOTION MODELS ====================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Promotion {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_purchase_amount: f64,
    pub max_discount_amount: Option<f64>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub customer_type: Option<String>,
    pub applicable_products: Option<String>,
    pub applicable_categories: Option<String>,
    pub is_active: bool,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePromotionRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_purchase_amount: Option<f64>,
    pub max_discount_amount: Option<f64>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub usage_limit: Option<i32>,
    pub customer_type: Option<String>,
    pub applicable_products: Option<String>,
    pub applicable_categories: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePromotionRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub discount_type: Option<String>,
    pub discount_value: Option<f64>,
    pub min_purchase_amount: Option<f64>,
    pub max_discount_amount: Option<f64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub usage_limit: Option<i32>,
    pub customer_type: Option<String>,
    pub applicable_products: Option<String>,
    pub applicable_categories: Option<String>,
    pub is_active: Option<bool>,
}

// ==================== APPOINTMENT MODELS ====================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Appointment {
    pub id: i64,
    pub appointment_number: String,
    pub customer_id: Option<i64>,
    pub service_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub appointment_date: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_minutes: i32,
    pub status: String,
    pub price: f64,
    pub notes: Option<String>,
    pub reminder_sent: bool,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAppointmentRequest {
    pub customer_id: Option<i64>,
    pub service_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub appointment_date: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_minutes: i32,
    pub status: Option<String>,
    pub price: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAppointmentRequest {
    pub customer_id: Option<i64>,
    pub service_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub appointment_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub status: Option<String>,
    pub price: Option<f64>,
    pub notes: Option<String>,
    pub reminder_sent: Option<bool>,
}
