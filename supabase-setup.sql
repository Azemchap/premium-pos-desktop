-- QorBooks - Supabase Database Setup Script
-- This script creates all tables, indexes, triggers, and enables realtime
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- DROP EXISTING TABLES (CAUTION: This will delete all data!)
-- ============================================================================
-- Uncomment the following lines if you want to start fresh:
/*
DROP TABLE IF EXISTS promotion_usage CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS customer_segments CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS employee_leaves CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_tiers CASCADE;
DROP TABLE IF EXISTS customer_interactions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS variant_inventory CASCADE;
DROP TABLE IF EXISTS product_variant_values CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS variant_values CASCADE;
DROP TABLE IF EXISTS variant_types CASCADE;
DROP TABLE IF EXISTS cash_drawer_transactions CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS receipt_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS store_config CASCADE;
*/

-- ============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE FUNCTION FOR AUTO-UPDATING updated_at TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Store Configuration (renamed from locations for clarity)
CREATE TABLE IF NOT EXISTS store_config (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    tax_rate NUMERIC(5,4) DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier', 'StockKeeper', 'Warehouse')),
    is_active BOOLEAN DEFAULT true,
    profile_image_url TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Master Data
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands Master Data
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units of Measurement Master Data
CREATE TABLE IF NOT EXISTS units (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    abbreviation TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    unit_of_measure TEXT DEFAULT 'each',
    cost_price NUMERIC(12,2) DEFAULT 0.0,
    selling_price NUMERIC(12,2) NOT NULL,
    wholesale_price NUMERIC(12,2) DEFAULT 0.0,
    tax_rate NUMERIC(5,4) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,
    weight NUMERIC(10,2) DEFAULT 0.0,
    dimensions TEXT,
    supplier_info TEXT,
    reorder_point INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Tracking
CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    last_stock_take TIMESTAMPTZ,
    stock_take_count INTEGER DEFAULT 0,
    UNIQUE(product_id)
);

-- Inventory Movements Log
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer', 'receipt', 'reservation', 'void')),
    quantity_change INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id BIGINT,
    reference_type TEXT,
    notes TEXT,
    user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (CRM)
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    date_of_birth DATE,
    customer_type TEXT CHECK (customer_type IN ('Retail', 'Wholesale', 'VIP', 'Corporate')) DEFAULT 'Retail',
    status TEXT CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    loyalty_points INTEGER DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0.0,
    total_orders INTEGER DEFAULT 0,
    average_order_value NUMERIC(12,2) DEFAULT 0.0,
    last_purchase_date TIMESTAMPTZ,
    notes TEXT,
    tags TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    supplier_number TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    payment_terms TEXT,
    tax_id TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Transactions
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    sale_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.0,
    discount_amount NUMERIC(12,2) DEFAULT 0.0,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'completed',
    cashier_id BIGINT NOT NULL REFERENCES users(id),
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    notes TEXT,
    is_voided BOOLEAN DEFAULT false,
    voided_by BIGINT REFERENCES users(id),
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    shift_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Line Items
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.0,
    line_total NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.0,
    cost_price NUMERIC(12,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0.0,
    tax NUMERIC(12,2) DEFAULT 0.0,
    shipping_cost NUMERIC(12,2) DEFAULT 0.0,
    total_amount NUMERIC(12,2) DEFAULT 0.0,
    status TEXT CHECK (status IN ('Draft', 'Sent', 'Confirmed', 'Partial', 'Received', 'Cancelled')) DEFAULT 'Draft',
    payment_status TEXT CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')) DEFAULT 'Unpaid',
    payment_method TEXT,
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_number TEXT UNIQUE NOT NULL,
    category_id BIGINT,
    vendor TEXT,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'Check', 'Bank Transfer', 'Other')),
    reference_number TEXT,
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly')),
    tags TEXT,
    notes TEXT,
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid')) DEFAULT 'Pending',
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_number TEXT UNIQUE NOT NULL,
    department TEXT,
    position TEXT,
    hire_date DATE,
    employment_type TEXT CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Intern')) DEFAULT 'Full-time',
    salary_type TEXT CHECK (salary_type IN ('Hourly', 'Salary', 'Commission')) DEFAULT 'Hourly',
    hourly_rate NUMERIC(10,2) DEFAULT 0.0,
    salary NUMERIC(12,2) DEFAULT 0.0,
    commission_rate NUMERIC(5,4) DEFAULT 0.0,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Tracking
CREATE TABLE IF NOT EXISTS time_tracking (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    break_minutes INTEGER DEFAULT 0,
    total_hours NUMERIC(8,2) DEFAULT 0.0,
    hourly_rate NUMERIC(10,2) DEFAULT 0.0,
    total_pay NUMERIC(12,2) DEFAULT 0.0,
    notes TEXT,
    status TEXT CHECK (status IN ('Active', 'Completed', 'Approved', 'Rejected')) DEFAULT 'Active',
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('Percentage', 'Fixed Amount', 'Buy X Get Y')) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    min_purchase_amount NUMERIC(12,2) DEFAULT 0.0,
    max_discount_amount NUMERIC(12,2),
    start_date DATE NOT NULL,
    end_date DATE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    customer_type TEXT CHECK (customer_type IN ('All', 'Retail', 'Wholesale', 'VIP', 'Corporate')),
    applicable_products TEXT,
    applicable_categories TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    appointment_number TEXT UNIQUE NOT NULL,
    customer_id BIGINT REFERENCES customers(id),
    service_id BIGINT,
    employee_id BIGINT REFERENCES employees(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT CHECK (status IN ('Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show')) DEFAULT 'Scheduled',
    price NUMERIC(10,2) NOT NULL,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    user_id BIGINT REFERENCES users(id),
    reference_id BIGINT,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt Templates
CREATE TABLE IF NOT EXISTS receipt_templates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('sale', 'return', 'void')),
    printer_type TEXT NOT NULL CHECK (printer_type IN ('thermal', 'inkjet', 'laser')),
    template_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    paper_width INTEGER DEFAULT 80,
    font_size INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts for Cash Management
CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    opening_amount NUMERIC(12,2) NOT NULL,
    closing_amount NUMERIC(12,2),
    total_sales NUMERIC(12,2) DEFAULT 0.0,
    total_returns NUMERIC(12,2) DEFAULT 0.0,
    cash_sales NUMERIC(12,2) DEFAULT 0.0,
    card_sales NUMERIC(12,2) DEFAULT 0.0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Returns/Refunds
CREATE TABLE IF NOT EXISTS returns (
    id BIGSERIAL PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    original_sale_id BIGINT REFERENCES sales(id),
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.0,
    total_amount NUMERIC(12,2) NOT NULL,
    refund_method TEXT NOT NULL,
    processed_by BIGINT NOT NULL REFERENCES users(id),
    reason TEXT,
    notes TEXT,
    shift_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, minimum_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available_stock);

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user ON inventory_movements(user_id);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status, is_voided);
CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);

-- Sale items indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_at ON suppliers(updated_at);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_updated_at ON purchase_orders(updated_at);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_updated_at ON purchase_order_items(updated_at);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_updated_at ON expenses(updated_at);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_updated_at ON employees(updated_at);

-- Time tracking indexes
CREATE INDEX IF NOT EXISTS idx_time_tracking_employee ON time_tracking(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_updated_at ON time_tracking(updated_at);

-- Promotions indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_updated_at ON promotions(updated_at);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_updated_at ON appointments(updated_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Shifts indexes
CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(start_time);

-- Returns indexes
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(original_sale_id);

-- Return items indexes
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);

-- Brands indexes
CREATE INDEX IF NOT EXISTS idx_brands_updated_at ON brands(updated_at);

-- Units indexes
CREATE INDEX IF NOT EXISTS idx_units_updated_at ON units(updated_at);

-- Store config indexes
CREATE INDEX IF NOT EXISTS idx_store_config_updated_at ON store_config(updated_at);

-- ============================================================================
-- CREATE TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================================

CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON store_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_tracking_updated_at BEFORE UPDATE ON time_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_templates_updated_at BEFORE UPDATE ON receipt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES (Allow all operations for now - customize as needed)
-- ============================================================================

-- For development/testing, allow all operations
-- In production, you should create more restrictive policies based on user roles

CREATE POLICY "Allow all on store_config" ON store_config FOR ALL USING (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all on brands" ON brands FOR ALL USING (true);
CREATE POLICY "Allow all on units" ON units FOR ALL USING (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all on inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow all on inventory_movements" ON inventory_movements FOR ALL USING (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all on suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow all on sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all on sale_items" ON sale_items FOR ALL USING (true);
CREATE POLICY "Allow all on purchase_orders" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow all on purchase_order_items" ON purchase_order_items FOR ALL USING (true);
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all on employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all on time_tracking" ON time_tracking FOR ALL USING (true);
CREATE POLICY "Allow all on promotions" ON promotions FOR ALL USING (true);
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all on receipt_templates" ON receipt_templates FOR ALL USING (true);
CREATE POLICY "Allow all on shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all on returns" ON returns FOR ALL USING (true);
CREATE POLICY "Allow all on return_items" ON return_items FOR ALL USING (true);

-- ============================================================================
-- ENABLE REALTIME FOR KEY TABLES
-- ============================================================================

-- Enable realtime replication for tables that need live updates
-- Go to Database → Replication in Supabase dashboard to enable these

-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
-- ALTER PUBLICATION supabase_realtime ADD TABLE customers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sales;
-- ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- ============================================================================
-- INSERT DEFAULT/SEED DATA
-- ============================================================================

-- Default store configuration
INSERT INTO store_config (id, name, address, city, state, zip_code, phone, email, tax_rate, currency)
VALUES (1, 'QorBooks', '123 Main Street, Suite 100', 'New York', 'NY', '10001', '+1-555-0123', 'info@qorbooks.com', 0.08, 'USD')
ON CONFLICT (id) DO NOTHING;

-- Default categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Home & Garden', 'Home improvement and gardening'),
('Sports', 'Sports equipment and gear'),
('Books', 'Books and publications'),
('Automotive', 'Auto parts and accessories'),
('Health & Beauty', 'Health and beauty products'),
('Toys', 'Toys and games'),
('Food & Beverage', 'Food and drink products'),
('Hardware', 'Tools and hardware'),
('Services', 'Service-based products'),
('Real Estate', 'Property and real estate'),
('Other', 'Miscellaneous items')
ON CONFLICT (name) DO NOTHING;

-- Default brands
INSERT INTO brands (name) VALUES
('Generic'),
('House Brand'),
('Other')
ON CONFLICT (name) DO NOTHING;

-- Default units
INSERT INTO units (name, abbreviation, description) VALUES
('Each', 'ea', 'Individual items'),
('Box', 'box', 'Boxed items'),
('Pack', 'pk', 'Packaged items'),
('Kilogram', 'kg', 'Weight in kilograms'),
('Pound', 'lb', 'Weight in pounds'),
('Meter', 'm', 'Length in meters'),
('Liter', 'L', 'Volume in liters'),
('Pair', 'pr', 'Pairs of items'),
('Dozen', 'doz', '12 items'),
('Case', 'cs', 'Cases'),
('Square Meter', 'm²', 'Area measurement'),
('Hour', 'hr', 'Time-based services'),
('Service', 'svc', 'Service units')
ON CONFLICT (name) DO NOTHING;

-- Default receipt templates
INSERT INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size)
VALUES
('Default Sale Receipt', 'sale', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nSALE #{{sale_number}}\nDate: {{sale_date}}\nCashier: {{cashier_name}}\n\n{{items}}\n\nSubtotal: {{subtotal}}\nTax: {{tax_amount}}\nTotal: {{total_amount}}\n\nThank you for your business!', true, 80, 12),
('Default Return Receipt', 'return', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nRETURN #{{return_number}}\nDate: {{return_date}}\nProcessed by: {{user_name}}\n\n{{items}}\n\nTotal Refund: {{total_amount}}\n\nThank you!', true, 80, 12)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Your Supabase database is now set up and ready to use!
-- Next steps:
-- 1. Enable realtime for tables in Database → Replication
-- 2. Test the connection from your app
-- 3. Run a manual sync to populate data
