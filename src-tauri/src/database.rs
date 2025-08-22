
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
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
                    unit_of_measure TEXT DEFAULT 'each',
                    cost_price REAL DEFAULT 0.0,
                    selling_price REAL NOT NULL,
                    is_active BOOLEAN DEFAULT true,
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
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(product_id)
                );

                -- Inventory movements log
                CREATE TABLE IF NOT EXISTS inventory_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer')),
                    quantity_change INTEGER NOT NULL,
                    previous_stock INTEGER NOT NULL,
                    new_stock INTEGER NOT NULL,
                    reference_id INTEGER, -- Links to sale_id, return_id, etc.
                    reference_type TEXT, -- 'sale', 'return', 'adjustment', etc.
                    notes TEXT,
                    user_id INTEGER REFERENCES users(id),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Sales transactions
                CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_number TEXT UNIQUE NOT NULL,
                    subtotal REAL NOT NULL,
                    tax_amount REAL DEFAULT 0.0,
                    discount_amount REAL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    payment_method TEXT NOT NULL,
                    payment_status TEXT DEFAULT 'completed',
                    cashier_id INTEGER NOT NULL REFERENCES users(id),
                    customer_name TEXT,
                    notes TEXT,
                    is_voided BOOLEAN DEFAULT false,
                    voided_by INTEGER REFERENCES users(id),
                    voided_at DATETIME,
                    void_reason TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Sale line items
                CREATE TABLE IF NOT EXISTS sale_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_id INTEGER NOT NULL REFERENCES sales(id),
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    discount_amount REAL DEFAULT 0.0,
                    line_total REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Returns/Refunds
                CREATE TABLE IF NOT EXISTS returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT UNIQUE NOT NULL,
                    original_sale_id INTEGER REFERENCES sales(id),
                    subtotal REAL NOT NULL,
                    tax_amount REAL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    refund_method TEXT NOT NULL,
                    processed_by INTEGER NOT NULL REFERENCES users(id),
                    reason TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Return line items
                CREATE TABLE IF NOT EXISTS return_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_id INTEGER NOT NULL REFERENCES returns(id),
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    line_total REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Receipt templates
                CREATE TABLE IF NOT EXISTS receipt_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    template_type TEXT NOT NULL CHECK (template_type IN ('sale', 'return', 'void')),
                    printer_type TEXT NOT NULL CHECK (printer_type IN ('thermal', 'inkjet', 'laser')),
                    template_content TEXT NOT NULL,
                    is_default BOOLEAN DEFAULT false,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
                CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
                CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
                CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
                CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
                CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
                CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
                CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
                CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
                CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
                CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
                CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at);
                CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);

                -- Insert default store configuration
                INSERT OR IGNORE INTO locations (id, name, address, phone, email, tax_rate, currency, timezone)
                VALUES (1, 'My Store', '123 Main St', '+1-555-0123', 'info@mystore.com', 0.08, 'USD', 'America/New_York');

                -- Insert default admin user (password: admin123)
                INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role)
                VALUES ('admin', 'admin@store.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlC8L4g5C5qjGzW', 'Store', 'Admin', 'Admin');
            "#,
            kind: MigrationKind::Up,
        }
    ]
}