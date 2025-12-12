use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                -- QorBooks/Location configuration (single row)
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
                    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier', 'StockKeeper', 'Warehouse')),
                    is_active BOOLEAN DEFAULT true,
                    profile_image_url TEXT,
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
                    product_id INTEGER NOT NULL,
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
                    product_id INTEGER NOT NULL,
                    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment', 'stock_take', 'damage', 'transfer', 'receipt', 'reservation', 'void')),
                    quantity_change INTEGER NOT NULL,
                    previous_stock INTEGER NOT NULL,
                    new_stock INTEGER NOT NULL,
                    reference_id INTEGER,
                    reference_type TEXT,
                    notes TEXT,
                    user_id INTEGER,
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
                    cashier_id INTEGER NOT NULL,
                    customer_name TEXT,
                    customer_phone TEXT,
                    customer_email TEXT,
                    notes TEXT,
                    is_voided BOOLEAN DEFAULT false,
                    voided_by INTEGER,
                    voided_at DATETIME,
                    void_reason TEXT,
                    shift_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Sale line items
                CREATE TABLE IF NOT EXISTS sale_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
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
                    original_sale_id INTEGER,
                    subtotal REAL NOT NULL,
                    tax_amount REAL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    refund_method TEXT NOT NULL,
                    processed_by INTEGER NOT NULL,
                    reason TEXT,
                    notes TEXT,
                    shift_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Return line items
                CREATE TABLE IF NOT EXISTS return_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
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
                    user_id INTEGER NOT NULL,
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
                    shift_id INTEGER NOT NULL,
                    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening', 'closing', 'adjustment', 'withdrawal', 'deposit')),
                    amount REAL NOT NULL,
                    reason TEXT,
                    user_id INTEGER NOT NULL,
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
                INSERT OR IGNORE INTO locations (id, name, address, city, state, zip_code, phone, email, tax_rate, currency)
                VALUES (1, 'QorBooks', '123 Main Street', 'New York', 'NY', '10001', '+1-555-0123', 'info@qorbooks.com', 0.08, 'USD');

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
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
                -- Clean up any existing locations_old table from previous failed migration
                DROP TABLE IF EXISTS locations_old;
                
                -- Rename existing locations table
                ALTER TABLE locations RENAME TO locations_old;
                
                -- Create new locations table with all required columns (no timezone)
                CREATE TABLE locations (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    country TEXT,
                    phone TEXT,
                    email TEXT,
                    tax_rate REAL DEFAULT 0.0,
                    currency TEXT DEFAULT 'USD',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Copy data from old table, providing defaults for new columns
                -- Use INSERT OR IGNORE to handle any potential duplicate IDs
                INSERT OR IGNORE INTO locations (id, name, address, city, state, zip_code, country, phone, email, tax_rate, currency, created_at, updated_at)
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
                    'US',
                    phone, 
                    email, 
                    tax_rate, 
                    currency, 
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
                -- This migration adds profile_image_url to users table for existing databases
                -- For new databases, v1 already includes this column
                SELECT 1;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "remove_timezone_from_locations",
            sql: r#"
                -- Migration v6 is no longer needed since we removed timezone from v1 and v4
                -- This is a no-op for compatibility with existing databases
                SELECT 1;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_logo_url_to_locations",
            sql: r#"
                -- Add logo_url field to locations table
                ALTER TABLE locations ADD COLUMN logo_url TEXT;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_product_variants_system",
            sql: r#"
                -- Variant Types (templates for variant dimensions like "Size", "Color", etc.)
                CREATE TABLE IF NOT EXISTS variant_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    display_order INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Variant Values (specific options for each type like "Small", "Red", etc.)
                CREATE TABLE IF NOT EXISTS variant_values (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    variant_type_id INTEGER NOT NULL,
                    value TEXT NOT NULL,
                    code TEXT,
                    display_order INTEGER DEFAULT 0,
                    hex_color TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (variant_type_id) REFERENCES variant_types(id) ON DELETE CASCADE,
                    UNIQUE(variant_type_id, value)
                );

                -- Product Variants (actual product variations)
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    sku TEXT UNIQUE NOT NULL,
                    barcode TEXT UNIQUE,
                    variant_name TEXT,
                    cost_price REAL DEFAULT 0.0,
                    selling_price REAL,
                    wholesale_price REAL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                );

                -- Product Variant Combinations (which variant values make up this variant)
                CREATE TABLE IF NOT EXISTS product_variant_values (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_variant_id INTEGER NOT NULL,
                    variant_value_id INTEGER NOT NULL,
                    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
                    FOREIGN KEY (variant_value_id) REFERENCES variant_values(id) ON DELETE CASCADE,
                    UNIQUE(product_variant_id, variant_value_id)
                );

                -- Variant Inventory (stock tracking per variant)
                CREATE TABLE IF NOT EXISTS variant_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_variant_id INTEGER NOT NULL,
                    current_stock INTEGER DEFAULT 0,
                    minimum_stock INTEGER DEFAULT 0,
                    maximum_stock INTEGER DEFAULT 0,
                    reserved_stock INTEGER DEFAULT 0,
                    available_stock INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
                    UNIQUE(product_variant_id)
                );

                -- Create indexes for performance
                CREATE INDEX IF NOT EXISTS idx_variant_types_active ON variant_types(is_active);
                CREATE INDEX IF NOT EXISTS idx_variant_types_order ON variant_types(display_order);
                
                CREATE INDEX IF NOT EXISTS idx_variant_values_type ON variant_values(variant_type_id);
                CREATE INDEX IF NOT EXISTS idx_variant_values_active ON variant_values(is_active);
                CREATE INDEX IF NOT EXISTS idx_variant_values_order ON variant_values(display_order);
                
                CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
                CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
                CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);
                CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
                
                CREATE INDEX IF NOT EXISTS idx_product_variant_values_variant ON product_variant_values(product_variant_id);
                CREATE INDEX IF NOT EXISTS idx_product_variant_values_value ON product_variant_values(variant_value_id);
                
                CREATE INDEX IF NOT EXISTS idx_variant_inventory_variant ON variant_inventory(product_variant_id);
                CREATE INDEX IF NOT EXISTS idx_variant_inventory_stock ON variant_inventory(current_stock, minimum_stock);

                -- Insert default variant types
                INSERT OR IGNORE INTO variant_types (name, description, display_order) VALUES
                ('Size', 'Product sizes (S, M, L, XL, etc.)', 1),
                ('Color', 'Product colors', 2),
                ('Material', 'Material type or composition', 3),
                ('Style', 'Style or design variation', 4);

                -- Insert common size values
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, 'Extra Small', 'XS', 1 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, 'Small', 'S', 2 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, 'Medium', 'M', 3 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, 'Large', 'L', 4 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, 'Extra Large', 'XL', 5 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, display_order)
                SELECT 1, '2X Large', 'XXL', 6 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 1);

                -- Insert common color values
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Black', 'BLK', '#000000', 1 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'White', 'WHT', '#FFFFFF', 2 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Red', 'RED', '#FF0000', 3 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Blue', 'BLU', '#0000FF', 4 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Green', 'GRN', '#008000', 5 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Yellow', 'YEL', '#FFFF00', 6 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
                
                INSERT OR IGNORE INTO variant_values (variant_type_id, value, code, hex_color, display_order)
                SELECT 2, 'Gray', 'GRY', '#808080', 7 WHERE EXISTS (SELECT 1 FROM variant_types WHERE id = 2);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_crm_and_customer_management",
            sql: r#"
                -- Enhanced Customers table for CRM
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                    total_spent REAL DEFAULT 0.0,
                    total_orders INTEGER DEFAULT 0,
                    average_order_value REAL DEFAULT 0.0,
                    last_purchase_date DATETIME,
                    notes TEXT,
                    tags TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Customer Interactions (calls, emails, meetings, notes)
                CREATE TABLE IF NOT EXISTS customer_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    interaction_type TEXT CHECK (interaction_type IN ('Call', 'Email', 'Meeting', 'Note', 'Support')) NOT NULL,
                    subject TEXT,
                    description TEXT,
                    outcome TEXT,
                    next_action TEXT,
                    next_action_date DATETIME,
                    user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                -- Loyalty Program Tiers
                CREATE TABLE IF NOT EXISTS loyalty_tiers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    min_points INTEGER NOT NULL,
                    discount_percentage REAL DEFAULT 0.0,
                    benefits TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Customer Loyalty Transactions
                CREATE TABLE IF NOT EXISTS loyalty_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    transaction_type TEXT CHECK (transaction_type IN ('Earn', 'Redeem', 'Expire', 'Adjust')) NOT NULL,
                    points INTEGER NOT NULL,
                    sale_id INTEGER,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    FOREIGN KEY (sale_id) REFERENCES sales(id)
                );

                -- Customer Addresses (multiple addresses per customer)
                CREATE TABLE IF NOT EXISTS customer_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    address_type TEXT CHECK (address_type IN ('Billing', 'Shipping', 'Both')) DEFAULT 'Both',
                    address_line1 TEXT NOT NULL,
                    address_line2 TEXT,
                    city TEXT NOT NULL,
                    state TEXT NOT NULL,
                    zip_code TEXT NOT NULL,
                    country TEXT DEFAULT 'US',
                    is_default BOOLEAN DEFAULT false,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                );

                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
                CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
                CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
                CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
                CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id);
                CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(interaction_type);
                CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "create_employee_and_timetracking",
            sql: r#"
                -- Enhanced Employees table (extends users)
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    employee_number TEXT UNIQUE NOT NULL,
                    department TEXT,
                    position TEXT,
                    hire_date DATE,
                    employment_type TEXT CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Intern')) DEFAULT 'Full-time',
                    salary_type TEXT CHECK (salary_type IN ('Hourly', 'Salary', 'Commission')) DEFAULT 'Hourly',
                    hourly_rate REAL DEFAULT 0.0,
                    salary REAL DEFAULT 0.0,
                    commission_rate REAL DEFAULT 0.0,
                    emergency_contact_name TEXT,
                    emergency_contact_phone TEXT,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                -- Time Clock (clock in/out tracking)
                CREATE TABLE IF NOT EXISTS time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    clock_in DATETIME NOT NULL,
                    clock_out DATETIME,
                    break_minutes INTEGER DEFAULT 0,
                    total_hours REAL DEFAULT 0.0,
                    hourly_rate REAL DEFAULT 0.0,
                    total_pay REAL DEFAULT 0.0,
                    notes TEXT,
                    status TEXT CHECK (status IN ('Active', 'Completed', 'Approved', 'Rejected')) DEFAULT 'Active',
                    approved_by INTEGER,
                    approved_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                    FOREIGN KEY (approved_by) REFERENCES users(id)
                );

                -- Payroll Records
                CREATE TABLE IF NOT EXISTS payroll (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    pay_period_start DATE NOT NULL,
                    pay_period_end DATE NOT NULL,
                    regular_hours REAL DEFAULT 0.0,
                    overtime_hours REAL DEFAULT 0.0,
                    base_pay REAL DEFAULT 0.0,
                    overtime_pay REAL DEFAULT 0.0,
                    commission REAL DEFAULT 0.0,
                    bonuses REAL DEFAULT 0.0,
                    deductions REAL DEFAULT 0.0,
                    gross_pay REAL DEFAULT 0.0,
                    net_pay REAL DEFAULT 0.0,
                    payment_method TEXT CHECK (payment_method IN ('Direct Deposit', 'Check', 'Cash')),
                    payment_date DATE,
                    status TEXT CHECK (status IN ('Draft', 'Processed', 'Paid')) DEFAULT 'Draft',
                    notes TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Employee Leaves/Time Off
                CREATE TABLE IF NOT EXISTS employee_leaves (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    leave_type TEXT CHECK (leave_type IN ('Vacation', 'Sick', 'Personal', 'Unpaid', 'Other')) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    total_days REAL NOT NULL,
                    reason TEXT,
                    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
                    approved_by INTEGER,
                    approved_at DATETIME,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                    FOREIGN KEY (approved_by) REFERENCES users(id)
                );

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
                CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
                CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
                CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
                CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
                CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period_start, pay_period_end);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create_supplier_and_purchase_orders",
            sql: r#"
                -- Suppliers
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Purchase Orders
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    po_number TEXT UNIQUE NOT NULL,
                    supplier_id INTEGER NOT NULL,
                    order_date DATE NOT NULL,
                    expected_delivery_date DATE,
                    actual_delivery_date DATE,
                    subtotal REAL DEFAULT 0.0,
                    tax REAL DEFAULT 0.0,
                    shipping_cost REAL DEFAULT 0.0,
                    total_amount REAL DEFAULT 0.0,
                    status TEXT CHECK (status IN ('Draft', 'Sent', 'Confirmed', 'Partial', 'Received', 'Cancelled')) DEFAULT 'Draft',
                    payment_status TEXT CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')) DEFAULT 'Unpaid',
                    payment_method TEXT,
                    notes TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Purchase Order Items
                CREATE TABLE IF NOT EXISTS purchase_order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    purchase_order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    received_quantity INTEGER DEFAULT 0,
                    unit_cost REAL NOT NULL,
                    total_cost REAL NOT NULL,
                    notes TEXT,
                    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                );

                -- Supplier Payments
                CREATE TABLE IF NOT EXISTS supplier_payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    supplier_id INTEGER NOT NULL,
                    purchase_order_id INTEGER,
                    payment_date DATE NOT NULL,
                    amount REAL NOT NULL,
                    payment_method TEXT CHECK (payment_method IN ('Cash', 'Check', 'Wire Transfer', 'Credit Card', 'Other')),
                    reference_number TEXT,
                    notes TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
                CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
                CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
                CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
                CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "create_expenses_and_financial_tracking",
            sql: r#"
                -- Expense Categories
                CREATE TABLE IF NOT EXISTS expense_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    parent_category_id INTEGER,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id)
                );

                -- Expenses
                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    expense_number TEXT UNIQUE NOT NULL,
                    category_id INTEGER,
                    vendor TEXT,
                    description TEXT NOT NULL,
                    amount REAL NOT NULL,
                    expense_date DATE NOT NULL,
                    payment_method TEXT CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'Check', 'Bank Transfer', 'Other')),
                    reference_number TEXT,
                    receipt_url TEXT,
                    is_recurring BOOLEAN DEFAULT false,
                    recurring_frequency TEXT CHECK (recurring_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly')),
                    tags TEXT,
                    notes TEXT,
                    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid')) DEFAULT 'Pending',
                    approved_by INTEGER,
                    approved_at DATETIME,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
                    FOREIGN KEY (approved_by) REFERENCES users(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Budgets
                CREATE TABLE IF NOT EXISTS budgets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category_id INTEGER,
                    budget_period TEXT CHECK (budget_period IN ('Monthly', 'Quarterly', 'Yearly')) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    allocated_amount REAL NOT NULL,
                    spent_amount REAL DEFAULT 0.0,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
                );

                -- Insert default expense categories
                INSERT OR IGNORE INTO expense_categories (name, description) VALUES
                ('Rent & Utilities', 'Rent, electricity, water, internet'),
                ('Salaries & Wages', 'Employee compensation'),
                ('Inventory Purchases', 'Stock and product purchases'),
                ('Marketing & Advertising', 'Promotional expenses'),
                ('Office Supplies', 'Stationery and office equipment'),
                ('Equipment & Maintenance', 'Equipment purchases and repairs'),
                ('Professional Services', 'Legal, accounting, consulting'),
                ('Insurance', 'Business insurance premiums'),
                ('Taxes & Licenses', 'Business taxes and permits'),
                ('Other', 'Miscellaneous expenses');

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
                CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
                CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
                CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
                CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "create_appointments_and_services",
            sql: r#"
                -- Services (for service-based businesses)
                CREATE TABLE IF NOT EXISTS services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    duration_minutes INTEGER NOT NULL,
                    price REAL NOT NULL,
                    category TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Appointments
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    appointment_number TEXT UNIQUE NOT NULL,
                    customer_id INTEGER,
                    service_id INTEGER,
                    employee_id INTEGER,
                    appointment_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    status TEXT CHECK (status IN ('Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show')) DEFAULT 'Scheduled',
                    price REAL NOT NULL,
                    notes TEXT,
                    reminder_sent BOOLEAN DEFAULT false,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (service_id) REFERENCES services(id),
                    FOREIGN KEY (employee_id) REFERENCES employees(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
                CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employee_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
                CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "create_marketing_and_promotions",
            sql: r#"
                -- Marketing Campaigns
                CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    campaign_type TEXT CHECK (campaign_type IN ('Email', 'SMS', 'Social Media', 'Print', 'Other')) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    budget REAL DEFAULT 0.0,
                    actual_cost REAL DEFAULT 0.0,
                    target_audience TEXT,
                    status TEXT CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed', 'Cancelled')) DEFAULT 'Draft',
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Promotions & Discounts
                CREATE TABLE IF NOT EXISTS promotions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    discount_type TEXT CHECK (discount_type IN ('Percentage', 'Fixed Amount', 'Buy X Get Y')) NOT NULL,
                    discount_value REAL NOT NULL,
                    min_purchase_amount REAL DEFAULT 0.0,
                    max_discount_amount REAL,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    usage_limit INTEGER,
                    usage_count INTEGER DEFAULT 0,
                    customer_type TEXT CHECK (customer_type IN ('All', 'Retail', 'Wholesale', 'VIP', 'Corporate')),
                    applicable_products TEXT,
                    applicable_categories TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );

                -- Promotion Usage Tracking
                CREATE TABLE IF NOT EXISTS promotion_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    promotion_id INTEGER NOT NULL,
                    customer_id INTEGER,
                    sale_id INTEGER,
                    discount_amount REAL NOT NULL,
                    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (promotion_id) REFERENCES promotions(id),
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (sale_id) REFERENCES sales(id)
                );

                -- Customer Segments
                CREATE TABLE IF NOT EXISTS customer_segments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    criteria TEXT NOT NULL,
                    customer_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
                CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
                CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
                CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion ON promotion_usage(promotion_id);
                CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer ON promotion_usage(customer_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "create_multitenant_organizations",
            sql: r#"
                -- Organizations (multi-tenant support)
                CREATE TABLE IF NOT EXISTS organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    industry TEXT,
                    business_type TEXT,
                    logo_url TEXT,
                    website TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    country TEXT DEFAULT 'US',
                    tax_id TEXT,
                    subscription_plan TEXT CHECK (subscription_plan IN ('Free', 'Starter', 'Professional', 'Enterprise')) DEFAULT 'Free',
                    subscription_status TEXT CHECK (subscription_status IN ('Trial', 'Active', 'Suspended', 'Cancelled')) DEFAULT 'Trial',
                    trial_ends_at DATE,
                    subscription_ends_at DATE,
                    settings TEXT,
                    custom_fields TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Organization Users (many-to-many)
                CREATE TABLE IF NOT EXISTS organization_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT CHECK (role IN ('Owner', 'Admin', 'Manager', 'User')) DEFAULT 'User',
                    permissions TEXT,
                    is_active BOOLEAN DEFAULT true,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(organization_id, user_id)
                );

                -- Custom Business Modules (for extensibility)
                CREATE TABLE IF NOT EXISTS custom_modules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER,
                    module_name TEXT NOT NULL,
                    module_type TEXT,
                    configuration TEXT,
                    is_enabled BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
                );

                -- Insert default organization
                INSERT OR IGNORE INTO organizations (name, slug, subscription_plan, subscription_status)
                VALUES ('My Business', 'my-business', 'Free', 'Active');

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
                CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
                CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id);
                CREATE INDEX IF NOT EXISTS idx_organization_users_user ON organization_users(user_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add_payment_status_check_constraint_to_sales",
            sql: r#"
                -- Create new sales table with payment_status CHECK constraint
                CREATE TABLE IF NOT EXISTS sales_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_number TEXT UNIQUE NOT NULL,
                    subtotal REAL NOT NULL,
                    tax_amount REAL DEFAULT 0.0,
                    discount_amount REAL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    payment_method TEXT NOT NULL,
                    payment_status TEXT CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Completed')) DEFAULT 'Completed',
                    cashier_id INTEGER NOT NULL,
                    customer_name TEXT,
                    customer_phone TEXT,
                    customer_email TEXT,
                    notes TEXT,
                    is_voided BOOLEAN DEFAULT false,
                    voided_by INTEGER,
                    voided_at DATETIME,
                    void_reason TEXT,
                    shift_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Copy data from old table to new table (if old table exists and has data)
                INSERT OR IGNORE INTO sales_new
                SELECT * FROM sales WHERE EXISTS (SELECT 1 FROM sales LIMIT 1);

                -- Drop old table
                DROP TABLE IF EXISTS sales;

                -- Rename new table to sales
                ALTER TABLE sales_new RENAME TO sales;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "add_is_active_to_locations",
            sql: r#"
                -- Add is_active column to locations table
                ALTER TABLE locations ADD COLUMN is_active BOOLEAN DEFAULT true;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "add_phone_to_users_and_fields_to_organizations",
            sql: r#"
                -- Add phone column to users table
                ALTER TABLE users ADD COLUMN phone TEXT;

                -- Add legal_name and description columns to organizations table
                ALTER TABLE organizations ADD COLUMN legal_name TEXT;
                ALTER TABLE organizations ADD COLUMN description TEXT;
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
