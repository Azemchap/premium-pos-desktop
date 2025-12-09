/**
 * Central Types File - Shared between Frontend and Backend
 * This ensures consistency across the entire application
 */

// ==================== USER TYPES ====================

export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'StockKeeper' | 'Warehouse';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  profile_image_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ==================== PRODUCT TYPES ====================

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  wholesale_price: number;
  tax_rate: number;
  is_active: boolean;
  is_taxable: boolean;
  weight: number;
  dimensions?: string;
  supplier_info?: string;
  reorder_point: number;
  // Building materials specific
  material_grade?: string;
  color?: string;
  finish?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  minimum_stock: number;
  available_stock: number;
  reserved_stock: number;
}

// ==================== INVENTORY TYPES ====================

export interface Inventory {
  id: number;
  product_id: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  reserved_stock: number;
  available_stock: number;
  last_updated: string;
  last_stock_take?: string;
  stock_take_count: number;
}

export type MovementType = 'sale' | 'return' | 'adjustment' | 'stock_take' | 'damage' | 'transfer' | 'receipt' | 'reservation' | 'void';

export interface InventoryMovement {
  id: number;
  product_id: number;
  movement_type: MovementType;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: number;
  reference_type?: string;
  notes?: string;
  user_id?: number;
  created_at: string;
}

// ==================== SALES TYPES ====================

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'check' | 'bank_transfer' | 'credit';

export interface Sale {
  id: number;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: string;
  cashier_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  is_voided: boolean;
  voided_by?: number;
  voided_at?: string;
  void_reason?: string;
  shift_id?: number;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  tax_amount: number;
  cost_price: number;
  created_at: string;
  product?: Product;
}

export interface CreateSaleRequest {
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
}

// ==================== STORE CONFIG TYPES ====================

export interface StoreConfig {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  tax_rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateStoreConfigRequest {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  tax_rate: number;
  currency: string;
}

// ==================== MASTER DATA TYPES ====================

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== NOTIFICATION TYPES ====================

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';
export type NotificationType = 'low_stock' | 'sale' | 'return' | 'system' | 'inventory' | 'user';

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  is_read: boolean;
  user_id?: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

// ==================== REPORT TYPES ====================

export interface DashboardStats {
  today_sales: number;
  today_transactions: number;
  total_products: number;
  low_stock_items: number;
  average_transaction_value: number;
  week_sales: number;
  month_sales: number;
}

export interface SalesReport {
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
  total_profit: number;
  profit_margin: number;
  cash_sales: number;
  card_sales: number;
  mobile_sales: number;
  check_sales: number;
}

// ==================== CUSTOMER TYPES (For Future) ====================

export interface Customer {
  id: number;
  customer_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  customer_type: 'Retail' | 'Wholesale' | 'VIP' | 'Corporate';
  status: 'Active' | 'Inactive' | 'Blocked';
  loyalty_points: number;
  total_spent: number;
  total_orders: number;
  average_order_value: number;
  last_purchase_date?: string;
  notes?: string;
  tags?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  customer_type?: 'Retail' | 'Wholesale' | 'VIP' | 'Corporate';
  notes?: string;
  tags?: string;
}

export interface UpdateCustomerRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  customer_type?: 'Retail' | 'Wholesale' | 'VIP' | 'Corporate';
  status?: 'Active' | 'Inactive' | 'Blocked';
  notes?: string;
  tags?: string;
}

// ==================== SUPPLIER TYPES (For Future) ====================

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tax_id?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== PURCHASE ORDER TYPES (For Future) ====================

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery?: string;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ==================== VALIDATION HELPERS ====================

export const isValidRole = (role: string): role is UserRole => {
  return ['Admin', 'Manager', 'Cashier', 'StockKeeper', 'Warehouse'].includes(role);
};

export const isValidPaymentMethod = (method: string): method is PaymentMethod => {
  return ['cash', 'card', 'mobile', 'check', 'bank_transfer', 'credit'].includes(method);
};

export const isValidMovementType = (type: string): type is MovementType => {
  return ['sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer', 'receipt', 'reservation', 'void'].includes(type);
};
