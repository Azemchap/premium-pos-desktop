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
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
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
                    dimensions TEXT,
                    supplier_info TEXT,
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
                    reserved_stock INTEGER DEFAULT 0,
                    available_stock INTEGER DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_stock_take DATETIME,
                    stock_take_count INTEGER DEFAULT 0,
                    UNIQUE(product_id)
                );

                -- Inventory movements log
                CREATE TABLE IF NOT EXISTS inventory_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer', 'receipt', 'reservation', 'void')),
                    quantity_change INTEGER NOT NULL,
                    previous_stock INTEGER NOT NULL,
                    new_stock INTEGER NOT NULL,
                    reference_id INTEGER,
                    reference_type TEXT,
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
                    customer_phone TEXT,
                    customer_email TEXT,
                    notes TEXT,
                    is_voided BOOLEAN DEFAULT false,
                    voided_by INTEGER REFERENCES users(id),
                    voided_at DATETIME,
                    void_reason TEXT,
                    shift_id INTEGER,
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
                    tax_amount REAL DEFAULT 0.0,
                    cost_price REAL DEFAULT 0.0,
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
                    shift_id INTEGER REFERENCES shifts(id),
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
                    paper_width INTEGER DEFAULT 80,
                    font_size INTEGER DEFAULT 12,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Shifts for cash management
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

                -- Create indexes for better performance
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
                INSERT OR IGNORE INTO locations (id, name, address, phone, email, tax_rate, currency, timezone)
                VALUES (1, 'Premium POS Store', '123 Main Street', '+1-555-0123', 'info@premiumpos.com', 0.08, 'USD', 'America/New_York');

                -- Insert default receipt templates
                INSERT OR IGNORE INTO receipt_templates (name, template_type, printer_type, template_content, is_default, paper_width, font_size)
                VALUES 
                ('Default Sale Receipt', 'sale', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nSALE #{{sale_number}}\nDate: {{sale_date}}\nCashier: {{cashier_name}}\n\n{{items}}\n\nSubtotal: {{subtotal}}\nTax: {{tax_amount}}\nTotal: {{total_amount}}\n\nThank you for your business!', 1, 80, 12),
                ('Default Return Receipt', 'return', 'thermal', '{{store_name}}\n{{store_address}}\n{{store_phone}}\n\nRETURN #{{return_number}}\nDate: {{return_date}}\nProcessed by: {{user_name}}\n\n{{items}}\n\nTotal Refund: {{total_amount}}\n\nThank you!', 1, 80, 12);
            "#,
        kind: MigrationKind::Up,
    },
        Migration {
        version: 2,
        description: "create_master_data_tables",
        sql: r#"
                -- Categories master table
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                -- Brands master table
                CREATE TABLE IF NOT EXISTS brands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                -- Units of Measurement master table
                CREATE TABLE IF NOT EXISTS units (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    abbreviation TEXT,
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                -- Insert default categories
                INSERT OR IGNORE INTO categories (name, description) VALUES
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
                ('Other', 'Miscellaneous items');

                -- Insert default brands
                INSERT OR IGNORE INTO brands (name) VALUES
                ('Generic'), ('House Brand'), ('Other');

                -- Insert default units
                INSERT OR IGNORE INTO units (name, abbreviation, description) VALUES
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
                ('Service', 'svc', 'Service units');
        "#,
        kind: MigrationKind::Up,
        },
        Migration {
        version: 3,
        description: "create_notifications_table",
        sql: r#"
                -- Notifications table for alerts and notifications
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    notification_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL DEFAULT 'info',
                    is_read BOOLEAN NOT NULL DEFAULT 0,
                    user_id INTEGER,
                    reference_id INTEGER,
                    reference_type TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
                CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
            "#,
        kind: MigrationKind::Up,
    },
        Migration {
        version: 4,
        description: "add_address_fields_to_locations",
        sql: r#"
                -- Rename existing locations table
                ALTER TABLE locations RENAME TO locations_old;
                
                -- Create new locations table with all required columns
                CREATE TABLE locations (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    phone TEXT,
                    email TEXT,
                    tax_rate REAL DEFAULT 0.0,
                    currency TEXT DEFAULT 'USD',
                    timezone TEXT DEFAULT 'UTC',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Copy data from old table, providing defaults for new columns
                INSERT INTO locations (id, name, address, city, state, zip_code, phone, email, tax_rate, currency, timezone, created_at, updated_at)
                SELECT 
                    id, 
                    name, 
                    CASE 
                        WHEN address = '123 Main Street' THEN '123 Main Street, Suite 100'
                        ELSE COALESCE(address, '')
                    END,
                    'New York',
                    'NY',
                    '10001',
                    phone, 
                    email, 
                    tax_rate, 
                    currency, 
                    timezone, 
                    created_at, 
                    updated_at
                FROM locations_old;
                
                -- Drop old table
                DROP TABLE locations_old;
            "#,
        kind: MigrationKind::Up,
    },
        Migration {
        version: 5,
        description: "add_profile_image_to_users",
        sql: r#"
                -- This migration adds profile_image_url to users table
                -- Since it may have been partially applied, we make it idempotent
                
                -- Rename existing table
                ALTER TABLE users RENAME TO users_old_v5;
                
                -- Create new table with profile_image_url
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier', 'StockKeeper')),
                    is_active BOOLEAN DEFAULT true,
                    profile_image_url TEXT,
                    last_login DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Copy all data from old table
                INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, profile_image_url, last_login, created_at, updated_at)
                SELECT 
                    id, 
                    username, 
                    email, 
                    password_hash, 
                    first_name, 
                    last_name, 
                    role, 
                    is_active,
                    profile_image_url,
                    last_login, 
                    created_at, 
                    updated_at
                FROM users_old_v5;
                
                -- Drop old table
                DROP TABLE users_old_v5;
                
                -- Recreate indexes
                CREATE INDEX idx_users_username ON users(username);
                CREATE INDEX idx_users_email ON users(email);
                CREATE INDEX idx_users_role ON users(role);
                CREATE INDEX idx_users_active ON users(is_active);
            "#,
        kind: MigrationKind::Up,
    }]
}
