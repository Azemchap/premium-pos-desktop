-- Comprehensive Returns System Migration
-- Add to database.rs as a new migration

Migration {
    version: 20,
    description: "create_comprehensive_returns_system",
    sql: r#"
        -- Comprehensive Returns Table
        CREATE TABLE IF NOT EXISTS comprehensive_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_number TEXT UNIQUE NOT NULL,
            return_type TEXT NOT NULL CHECK (return_type IN ('SalesReturn', 'PurchaseReturn', 'InventoryReturn', 'TransferReturn')),
            reference_id INTEGER, -- sale_id, purchase_order_id, or transfer_id
            reference_number TEXT,
            supplier_id INTEGER,
            from_location_id INTEGER,
            to_location_id INTEGER,
            subtotal REAL NOT NULL,
            tax_amount REAL DEFAULT 0.0,
            total_amount REAL NOT NULL,
            refund_method TEXT,
            credit_method TEXT, -- for purchase returns
            expected_credit_date DATE,
            status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Processing', 'Completed', 'Rejected')) DEFAULT 'Pending',
            processed_by INTEGER NOT NULL,
            approved_by INTEGER,
            approved_at DATETIME,
            completed_at DATETIME,
            reason TEXT,
            notes TEXT,
            shift_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (from_location_id) REFERENCES locations(id),
            FOREIGN KEY (to_location_id) REFERENCES locations(id),
            FOREIGN KEY (processed_by) REFERENCES users(id),
            FOREIGN KEY (approved_by) REFERENCES users(id),
            FOREIGN KEY (shift_id) REFERENCES shifts(id)
        );

        -- Comprehensive Return Items Table
        CREATE TABLE IF NOT EXISTS comprehensive_return_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            line_total REAL NOT NULL,
            reason TEXT NOT NULL CHECK (reason IN ('Defective', 'WrongItem', 'Damaged', 'Expired', 'Overstock', 'Recall', 'CustomerDissatisfaction', 'WrongShipment', 'QualityIssue', 'Other')),
            condition TEXT NOT NULL CHECK (condition IN ('New', 'Opened', 'Used', 'Damaged', 'Defective', 'Sealed')),
            disposition TEXT NOT NULL CHECK (disposition IN ('Restock', 'Dispose', 'ReturnToSupplier', 'Transfer', 'Repair', 'WriteOff')),
            batch_number TEXT,
            expiry_date DATE,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (return_id) REFERENCES comprehensive_returns(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_comprehensive_returns_type ON comprehensive_returns(return_type);
        CREATE INDEX IF NOT EXISTS idx_comprehensive_returns_status ON comprehensive_returns(status);
        CREATE INDEX IF NOT EXISTS idx_comprehensive_returns_date ON comprehensive_returns(created_at);
        CREATE INDEX IF NOT EXISTS idx_comprehensive_returns_supplier ON comprehensive_returns(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_comprehensive_return_items_return_id ON comprehensive_return_items(return_id);
        CREATE INDEX IF NOT EXISTS idx_comprehensive_return_items_product_id ON comprehensive_return_items(product_id);

        -- Insert sample return reasons and conditions data
        INSERT OR IGNORE INTO return_reasons (reason, description) VALUES
        ('Defective', 'Product is defective or not working as intended'),
        ('WrongItem', 'Wrong item was delivered or shipped'),
        ('Damaged', 'Product was damaged during shipping or handling'),
        ('Expired', 'Product has passed its expiration date'),
        ('Overstock', 'Too much inventory, returning to reduce stock'),
        ('Recall', 'Product recall from manufacturer or supplier'),
        ('CustomerDissatisfaction', 'Customer not satisfied with product'),
        ('WrongShipment', 'Incorrect items shipped'),
        ('QualityIssue', 'Product quality does not meet standards'),
        ('Other', 'Other reasons not listed');

        INSERT OR IGNORE INTO return_conditions (condition, description) VALUES
        ('New', 'Product is new and unused'),
        ('Opened', 'Product packaging has been opened'),
        ('Used', 'Product has been used'),
        ('Damaged', 'Product is damaged'),
        ('Defective', 'Product is defective'),
        ('Sealed', 'Product is still sealed in original packaging');

        INSERT OR IGNORE INTO disposition_actions (action, description) VALUES
        ('Restock', 'Return item to sellable inventory'),
        ('Dispose', 'Dispose of item safely'),
        ('ReturnToSupplier', 'Return item to original supplier'),
        ('Transfer', 'Transfer to another location'),
        ('Repair', 'Send item for repair'),
        ('WriteOff', 'Write off as financial loss');
    "#
},
