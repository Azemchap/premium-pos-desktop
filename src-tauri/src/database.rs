
pub struct Migration {
    pub version: u32,
    pub description: &'static str,
    pub sql: &'static str,
}

pub const INITIAL_MIGRATION: &str = r#"
    -- Store/Location configuration (single row)
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        tax_rate REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'USD',
        timezone TEXT DEFAULT 'UTC',
        logo_path TEXT,
        receipt_header TEXT,
        receipt_footer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users table for local authentication
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier', 'StockKeeper')),
        is_active BOOLEAN DEFAULT true,
        last_login DATETIME,
        pin_code TEXT,
        permissions TEXT, -- JSON string for granular permissions
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product catalog
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        subcategory TEXT,
        brand TEXT,
        unit_of_measure TEXT DEFAULT 'each',
        cost_price REAL DEFAULT 0.0,
        selling_price REAL NOT NULL,
        wholesale_price REAL DEFAULT 0.0,
        tax_rate REAL DEFAULT 0.0,
        is_active BOOLEAN DEFAULT true,
        is_taxable BOOLEAN DEFAULT true,
        weight REAL DEFAULT 0.0,
        dimensions TEXT, -- JSON string for length, width, height
        supplier_info TEXT, -- JSON string for supplier details
        reorder_point INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory tracking
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        current_stock INTEGER DEFAULT 0,
        minimum_stock INTEGER DEFAULT 0,
        maximum_stock INTEGER DEFAULT 0,
        reserved_stock INTEGER DEFAULT 0, -- For pending sales
        available_stock INTEGER DEFAULT 0, -- current_stock - reserved_stock
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_stock_take DATETIME,
        stock_take_count INTEGER DEFAULT 0,
        UNIQUE(product_id)
    );

    -- Inventory movements log
    CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer', 'receipt', 'reservation')),
        quantity_change INTEGER NOT NULL,
        notes TEXT,
        reference_id INTEGER, -- Links to sale_id, return_id, etc.
        reference_type TEXT, -- 'sale', 'return', 'adjustment', etc.
        user_id INTEGER REFERENCES users(id),
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number TEXT UNIQUE NOT NULL,
        cashier_id INTEGER NOT NULL REFERENCES users(id),
        shift_id INTEGER REFERENCES shifts(id),
        customer_id INTEGER REFERENCES customers(id),
        subtotal REAL NOT NULL,
        tax_amount REAL NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'check', 'gift_card', 'store_credit')),
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        is_voided BOOLEAN DEFAULT false,
        void_reason TEXT,
        voided_by INTEGER REFERENCES users(id),
        voided_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale items table
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        tax_rate REAL DEFAULT 0.0,
        tax_amount REAL DEFAULT 0.0,
        discount_amount REAL DEFAULT 0.0,
        discount_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Returns table
    CREATE TABLE IF NOT EXISTS returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT UNIQUE NOT NULL,
        original_sale_id INTEGER REFERENCES sales(id),
        customer_id INTEGER REFERENCES customers(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        return_reason TEXT NOT NULL,
        refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'card', 'store_credit', 'exchange')),
        refund_amount REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Return items table
    CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES returns(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        country TEXT DEFAULT 'USA',
        loyalty_points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.0,
        last_visit DATETIME,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Shifts table for cashier management
    CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        opening_amount REAL NOT NULL,
        closing_amount REAL,
        total_sales REAL DEFAULT 0.0,
        total_returns REAL DEFAULT 0.0,
        cash_sales REAL DEFAULT 0.0,
        card_sales REAL DEFAULT 0.0,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cash drawer transactions
    CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL REFERENCES shifts(id),
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening', 'closing', 'adjustment', 'withdrawal', 'deposit')),
        amount REAL NOT NULL,
        reason TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store configuration
    CREATE TABLE IF NOT EXISTS store_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        tax_rate REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'USD',
        timezone TEXT DEFAULT 'UTC',
        logo_path TEXT,
        receipt_header TEXT,
        receipt_footer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create comprehensive indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, minimum_stock);
    CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available_stock);
    
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_user ON inventory_movements(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
    CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status, is_voided);
    CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);
    
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
    
    CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at);
    CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(original_sale_id);
    CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
    
    CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
    CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(start_time);
    
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

    -- Insert default store configuration
    INSERT OR IGNORE INTO store_config (id, name, address, phone, email, tax_rate, currency, timezone, receipt_header, receipt_footer)
    VALUES (1, 'Premium POS Store', '123 Main Street', '+1-555-0123', 'info@premiumpos.com', 0.08, 'USD', 'America/New_York', 'Thank you for shopping with us!', 'Please come again!');

    -- Insert default receipt templates
    INSERT OR IGNORE INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size)
    VALUES 
    ('Default Sale Receipt', 'sale', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nSALE #{{sale_number}}\nDate: {{sale_date}}\nCashier: {{cashier_name}}\n\n{{items}}\n\nSubtotal: {{subtotal}}\nTax: {{tax_amount}}\nTotal: {{total_amount}}\n\n{{receipt_footer}}', 1, 80, 12),
    ('Default Return Receipt', 'return', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nRETURN #{{return_number}}\nDate: {{return_date}}\nProcessed by: {{user_name}}\n\n{{items}}\n\nTotal Refund: {{total_amount}}\n\n{{receipt_footer}}', 1, 80, 12);
"#;

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: INITIAL_MIGRATION,
        }
    ]
}