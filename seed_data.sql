-- Comprehensive Seed Data for QorBooks POS Application
-- This file populates all tables with realistic sample data

-- Clean existing data (optional - be careful in production!)
-- DELETE FROM time_tracking;
-- DELETE FROM sale_items;
-- DELETE FROM sales;
-- DELETE FROM appointments;
-- DELETE FROM promotions;
-- DELETE FROM employees;
-- DELETE FROM inventory_movements;
-- DELETE FROM inventory;
-- DELETE FROM purchase_order_items;
-- DELETE FROM purchase_orders;
-- DELETE FROM expenses;
-- DELETE FROM products;
-- DELETE FROM categories;
-- DELETE FROM customers;
-- DELETE FROM suppliers;
-- DELETE FROM locations;
-- DELETE FROM organizations;
-- DELETE FROM users;
-- DELETE FROM store_config;

-- Insert Store Configuration
INSERT INTO store_config (
    store_name, store_address, store_city, store_state, store_zip, store_phone,
    store_email, currency_code, currency_symbol, tax_rate,
    receipt_header, receipt_footer, low_stock_threshold
) VALUES (
    'QorBooks Retail Store',
    '123 Main Street',
    'New York',
    'NY',
    '10001',
    '+1 (555) 123-4567',
    'contact@qorbooks.com',
    'USD',
    '$',
    8.875,
    'Welcome to QorBooks! Your Premium POS Solution',
    'Thank you for your business! Visit us again soon.',
    10
) ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    store_address = EXCLUDED.store_address,
    store_phone = EXCLUDED.store_phone,
    tax_rate = EXCLUDED.tax_rate;

-- Insert Users
INSERT INTO users (username, email, password_hash, role, is_active) VALUES
    ('admin', 'admin@qorbooks.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKTGJBv4.8ZGQ0XG', 'Admin', true),
    ('manager', 'manager@qorbooks.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKTGJBv4.8ZGQ0XG', 'Manager', true),
    ('cashier', 'cashier@qorbooks.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKTGJBv4.8ZGQ0XG', 'Cashier', true)
ON CONFLICT (username) DO NOTHING;

-- Insert Organization
INSERT INTO organizations (
    name, legal_name, tax_id, address, city, state, zip_code,
    country, phone, email, website, description, is_active
) VALUES (
    'QorBooks Corporation',
    'QorBooks Corporation Inc.',
    '12-3456789',
    '123 Main Street',
    'New York',
    'NY',
    '10001',
    'USA',
    '+1 (555) 123-4567',
    'info@qorbooks.com',
    'www.qorbooks.com',
    'Leading provider of premium point-of-sale solutions',
    true
) ON CONFLICT DO NOTHING;

-- Insert Locations
INSERT INTO locations (organization_id, name, address, city, state, zip_code, phone, manager_name, is_active) VALUES
    (1, 'Main Store', '123 Main Street', 'New York', 'NY', '10001', '+1 (555) 123-4567', 'John Manager', true),
    (1, 'Downtown Branch', '456 Broadway', 'New York', 'NY', '10002', '+1 (555) 234-5678', 'Jane Smith', true),
    (1, 'Uptown Location', '789 Park Avenue', 'New York', 'NY', '10003', '+1 (555) 345-6789', 'Bob Johnson', true)
ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO categories (name, description, is_active) VALUES
    ('Electronics', 'Electronic devices and accessories', true),
    ('Clothing', 'Apparel and fashion items', true),
    ('Books', 'Books and publications', true),
    ('Home & Garden', 'Home improvement and gardening supplies', true),
    ('Sports & Outdoors', 'Sports equipment and outdoor gear', true),
    ('Toys & Games', 'Toys, games, and entertainment', true),
    ('Food & Beverages', 'Food items and drinks', true),
    ('Health & Beauty', 'Personal care and beauty products', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Products
INSERT INTO products (name, description, sku, barcode, category_id, cost_price, selling_price, is_active) VALUES
    ('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'ELC-001', '1234567890001', 1, 15.00, 29.99, true),
    ('Bluetooth Keyboard', 'Compact Bluetooth keyboard for all devices', 'ELC-002', '1234567890002', 1, 25.00, 49.99, true),
    ('USB-C Cable 6ft', 'Fast charging USB-C cable', 'ELC-003', '1234567890003', 1, 5.00, 14.99, true),
    ('Laptop Stand', 'Adjustable aluminum laptop stand', 'ELC-004', '1234567890004', 1, 20.00, 39.99, true),
    ('Cotton T-Shirt', 'Premium cotton crew neck t-shirt', 'CLO-001', '1234567890011', 2, 8.00, 19.99, true),
    ('Jeans - Blue', 'Classic fit denim jeans', 'CLO-002', '1234567890012', 2, 18.00, 39.99, true),
    ('Running Shoes', 'Lightweight running shoes', 'CLO-003', '1234567890013', 2, 30.00, 79.99, true),
    ('Winter Jacket', 'Insulated winter jacket', 'CLO-004', '1234567890014', 2, 40.00, 99.99, true),
    ('The Great Novel', 'Bestselling fiction book', 'BOK-001', '1234567890021', 3, 10.00, 24.99, true),
    ('Cookbook Delights', 'Collection of gourmet recipes', 'BOK-002', '1234567890022', 3, 12.00, 29.99, true),
    ('Business Guide', 'Essential business strategies', 'BOK-003', '1234567890023', 3, 15.00, 34.99, true),
    ('Yoga Mat', 'Non-slip exercise yoga mat', 'SPT-001', '1234567890031', 5, 12.00, 29.99, true),
    ('Dumbbell Set', '10lb dumbbell pair', 'SPT-002', '1234567890032', 5, 20.00, 49.99, true),
    ('Water Bottle', 'Stainless steel water bottle 32oz', 'SPT-003', '1234567890033', 5, 8.00, 19.99, true),
    ('Coffee Maker', 'Programmable 12-cup coffee maker', 'HOM-001', '1234567890041', 4, 35.00, 79.99, true),
    ('Desk Lamp', 'LED desk lamp with adjustable brightness', 'HOM-002', '1234567890042', 4, 18.00, 39.99, true),
    ('Board Game', 'Family strategy board game', 'TOY-001', '1234567890051', 6, 15.00, 34.99, true),
    ('Building Blocks', '500-piece building block set', 'TOY-002', '1234567890052', 6, 20.00, 44.99, true),
    ('Organic Coffee', 'Premium organic coffee beans 1lb', 'FOD-001', '1234567890061', 7, 8.00, 16.99, true),
    ('Green Tea', 'Organic green tea box of 20', 'FOD-002', '1234567890062', 7, 4.00, 9.99, true)
ON CONFLICT (sku) DO NOTHING;

-- Insert Inventory
INSERT INTO inventory (product_id, quantity, reorder_point, reorder_quantity) VALUES
    (1, 50, 10, 25),
    (2, 30, 8, 20),
    (3, 100, 15, 50),
    (4, 25, 5, 15),
    (5, 75, 20, 40),
    (6, 40, 15, 25),
    (7, 35, 10, 20),
    (8, 20, 8, 15),
    (9, 60, 12, 30),
    (10, 45, 10, 25),
    (11, 30, 8, 20),
    (12, 50, 10, 25),
    (13, 25, 8, 15),
    (14, 80, 15, 40),
    (15, 15, 5, 10),
    (16, 40, 10, 20),
    (17, 35, 8, 20),
    (18, 30, 10, 20),
    (19, 100, 20, 50),
    (20, 120, 25, 60)
ON CONFLICT (product_id) DO NOTHING;

-- Insert Customers
INSERT INTO customers (first_name, last_name, email, phone, address, city, state, zip_code, loyalty_points, is_active) VALUES
    ('Sarah', 'Johnson', 'sarah.j@email.com', '+1 (555) 111-2222', '100 Oak Street', 'New York', 'NY', '10001', 150, true),
    ('Michael', 'Williams', 'michael.w@email.com', '+1 (555) 222-3333', '200 Pine Street', 'New York', 'NY', '10002', 320, true),
    ('Emily', 'Brown', 'emily.b@email.com', '+1 (555) 333-4444', '300 Maple Avenue', 'New York', 'NY', '10003', 75, true),
    ('David', 'Davis', 'david.d@email.com', '+1 (555) 444-5555', '400 Elm Street', 'New York', 'NY', '10004', 210, true),
    ('Lisa', 'Miller', 'lisa.m@email.com', '+1 (555) 555-6666', '500 Cedar Lane', 'New York', 'NY', '10005', 95, true),
    ('James', 'Wilson', 'james.w@email.com', '+1 (555) 666-7777', '600 Birch Road', 'New York', 'NY', '10006', 180, true),
    ('Jennifer', 'Moore', 'jennifer.m@email.com', '+1 (555) 777-8888', '700 Ash Court', 'New York', 'NY', '10007', 410, true),
    ('Robert', 'Taylor', 'robert.t@email.com', '+1 (555) 888-9999', '800 Walnut Drive', 'New York', 'NY', '10008', 55, true)
ON CONFLICT (email) DO NOTHING;

-- Insert Suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, city, state, zip_code, payment_terms, is_active) VALUES
    ('Tech Distributors Inc', 'John Smith', 'sales@techdist.com', '+1 (555) 100-1000', '1000 Tech Blvd', 'San Francisco', 'CA', '94101', 'Net 30', true),
    ('Fashion Wholesale Co', 'Mary Jones', 'orders@fashionwholesale.com', '+1 (555) 200-2000', '2000 Fashion Ave', 'Los Angeles', 'CA', '90001', 'Net 45', true),
    ('Book Publishers United', 'David Lee', 'sales@bookpub.com', '+1 (555) 300-3000', '3000 Library Lane', 'Boston', 'MA', '02101', 'Net 30', true),
    ('Home Goods Supply', 'Susan Chen', 'info@homegoods.com', '+1 (555) 400-4000', '4000 Home Street', 'Chicago', 'IL', '60601', 'Net 60', true),
    ('Sports Equipment Corp', 'Mike Brown', 'sales@sportsequip.com', '+1 (555) 500-5000', '5000 Sports Way', 'Denver', 'CO', '80201', 'Net 30', true)
ON CONFLICT (email) DO NOTHING;

-- Insert Employees
INSERT INTO employees (
    first_name, last_name, email, phone, position, department,
    hire_date, salary, employment_type, address,
    emergency_contact, emergency_phone, is_active
) VALUES
    ('John', 'Manager', 'john.manager@qorbooks.com', '+1 (555) 001-1001', 'Store Manager', 'Management', '2020-01-15', 65000.00, 'Full-Time', '111 Manager St, NY 10001', 'Jane Manager', '+1 (555) 001-1002', true),
    ('Jane', 'Smith', 'jane.smith@qorbooks.com', '+1 (555) 001-1003', 'Assistant Manager', 'Management', '2020-06-01', 55000.00, 'Full-Time', '112 Manager St, NY 10001', 'John Smith', '+1 (555) 001-1004', true),
    ('Bob', 'Johnson', 'bob.johnson@qorbooks.com', '+1 (555) 001-1005', 'Senior Cashier', 'Sales', '2021-03-10', 42000.00, 'Full-Time', '113 Staff Ave, NY 10002', 'Mary Johnson', '+1 (555) 001-1006', true),
    ('Alice', 'Williams', 'alice.w@qorbooks.com', '+1 (555) 001-1007', 'Cashier', 'Sales', '2022-01-20', 38000.00, 'Full-Time', '114 Staff Ave, NY 10002', 'Tom Williams', '+1 (555) 001-1008', true),
    ('Charlie', 'Brown', 'charlie.b@qorbooks.com', '+1 (555) 001-1009', 'Cashier', 'Sales', '2022-05-15', 38000.00, 'Full-Time', '115 Staff Ave, NY 10003', 'Lucy Brown', '+1 (555) 001-1010', true),
    ('Diana', 'Davis', 'diana.d@qorbooks.com', '+1 (555) 001-1011', 'Stock Clerk', 'Inventory', '2021-08-01', 36000.00, 'Full-Time', '116 Warehouse Rd, NY 10004', 'Eric Davis', '+1 (555) 001-1012', true),
    ('Eve', 'Miller', 'eve.m@qorbooks.com', '+1 (555) 001-1013', 'Stock Clerk', 'Inventory', '2022-02-10', 36000.00, 'Full-Time', '117 Warehouse Rd, NY 10004', 'Frank Miller', '+1 (555) 001-1014', true),
    ('Frank', 'Wilson', 'frank.w@qorbooks.com', '+1 (555) 001-1015', 'Part-Time Cashier', 'Sales', '2023-01-05', 28000.00, 'Part-Time', '118 College St, NY 10005', 'Grace Wilson', '+1 (555) 001-1016', true),
    ('Grace', 'Taylor', 'grace.t@qorbooks.com', '+1 (555) 001-1017', 'Marketing Specialist', 'Marketing', '2021-11-01', 52000.00, 'Full-Time', '119 Creative Ave, NY 10006', 'Henry Taylor', '+1 (555) 001-1018', true),
    ('Henry', 'Anderson', 'henry.a@qorbooks.com', '+1 (555) 001-1019', 'IT Support', 'IT', '2020-09-15', 58000.00, 'Full-Time', '120 Tech Blvd, NY 10007', 'Irene Anderson', '+1 (555) 001-1020', true)
ON CONFLICT (email) DO NOTHING;

-- Insert Expenses
INSERT INTO expenses (category, description, amount, expense_date, payment_method, vendor, receipt_number, notes) VALUES
    ('Rent', 'Monthly store rent - Main location', 5000.00, '2024-01-01', 'Check', 'Property Management Co', 'RNT-2024-01', 'January rent payment'),
    ('Utilities', 'Electricity bill', 450.00, '2024-01-05', 'Bank Transfer', 'Electric Company', 'ELEC-2024-01', 'Monthly electricity'),
    ('Utilities', 'Water and sewage', 120.00, '2024-01-05', 'Bank Transfer', 'Water Department', 'WATER-2024-01', 'Monthly water service'),
    ('Supplies', 'Office supplies and stationery', 280.00, '2024-01-10', 'Card', 'Office Depot', 'SUPP-2024-01', 'Paper, pens, folders'),
    ('Marketing', 'Social media advertising', 800.00, '2024-01-15', 'Card', 'Meta Ads', 'ADS-2024-01', 'Facebook and Instagram ads'),
    ('Maintenance', 'HVAC maintenance', 350.00, '2024-01-20', 'Check', 'Climate Control Inc', 'MAINT-2024-01', 'Quarterly HVAC service'),
    ('Insurance', 'Business liability insurance', 1200.00, '2024-01-25', 'Bank Transfer', 'Insurance Corp', 'INS-2024-01', 'Quarterly premium'),
    ('Payroll', 'Employee salaries - January', 42000.00, '2024-01-31', 'Bank Transfer', 'Internal', 'PAY-2024-01', 'Monthly payroll')
ON CONFLICT DO NOTHING;

-- Insert Promotions
INSERT INTO promotions (
    name, description, discount_type, discount_value,
    start_date, end_date, min_purchase_amount,
    max_discount_amount, is_active
) VALUES
    ('New Year Sale', 'Start the year with great savings!', 'Percentage', 15.00, '2024-01-01', '2024-01-31', 50.00, 100.00, true),
    ('Spring Clearance', 'Clear out winter stock', 'Percentage', 25.00, '2024-03-01', '2024-03-31', 75.00, 150.00, true),
    ('Buy More Save More', '$10 off on purchases over $100', 'Fixed', 10.00, '2024-01-01', '2024-12-31', 100.00, 10.00, true),
    ('Summer Special', 'Beat the heat with cool deals', 'Percentage', 20.00, '2024-06-01', '2024-08-31', 60.00, 120.00, false),
    ('Black Friday Mega Sale', 'Biggest sale of the year', 'Percentage', 40.00, '2024-11-29', '2024-11-29', 100.00, 200.00, false)
ON CONFLICT DO NOTHING;

-- Insert Appointments
INSERT INTO appointments (
    customer_id, employee_id, appointment_date, appointment_time,
    duration_minutes, service_type, notes, status
) VALUES
    (1, 1, '2024-02-15', '10:00:00', 60, 'Product Consultation', 'Interested in home electronics setup', 'Scheduled'),
    (2, 9, '2024-02-16', '14:00:00', 45, 'Personal Shopping', 'Looking for business wardrobe', 'Scheduled'),
    (3, 1, '2024-02-14', '11:00:00', 30, 'Product Pickup', 'Special order laptop', 'Completed'),
    (4, 2, '2024-02-17', '15:30:00', 60, 'Business Account Setup', 'Setting up corporate account', 'Scheduled'),
    (5, 9, '2024-02-18', '10:30:00', 45, 'Gift Registry', 'Wedding gift registry', 'Scheduled')
ON CONFLICT DO NOTHING;

-- Insert Time Tracking (sample entries for the past week)
INSERT INTO time_tracking (employee_id, clock_in, clock_out, total_hours, notes) VALUES
    (3, '2024-02-05 08:00:00', '2024-02-05 17:00:00', 8.0, 'Regular shift'),
    (3, '2024-02-06 08:00:00', '2024-02-06 17:00:00', 8.0, 'Regular shift'),
    (4, '2024-02-05 09:00:00', '2024-02-05 18:00:00', 8.0, 'Regular shift'),
    (4, '2024-02-06 09:00:00', '2024-02-06 18:00:00', 8.0, 'Regular shift'),
    (5, '2024-02-05 10:00:00', '2024-02-05 19:00:00', 8.0, 'Regular shift'),
    (5, '2024-02-06 10:00:00', '2024-02-06 19:00:00', 8.0, 'Regular shift'),
    (6, '2024-02-05 07:00:00', '2024-02-05 16:00:00', 8.0, 'Early shift - inventory'),
    (7, '2024-02-05 07:00:00', '2024-02-05 16:00:00', 8.0, 'Early shift - inventory'),
    (8, '2024-02-05 16:00:00', '2024-02-05 20:00:00', 4.0, 'Part-time evening shift'),
    (8, '2024-02-06 16:00:00', '2024-02-06 20:00:00', 4.0, 'Part-time evening shift')
ON CONFLICT DO NOTHING;

-- Insert Purchase Orders
INSERT INTO purchase_orders (
    supplier_id, order_date, expected_delivery_date,
    total_amount, status, notes
) VALUES
    (1, '2024-01-10', '2024-01-20', 2500.00, 'Received', 'Electronics restock'),
    (2, '2024-01-15', '2024-01-25', 3200.00, 'Received', 'Spring clothing line'),
    (3, '2024-01-20', '2024-01-30', 1800.00, 'Pending', 'New book releases'),
    (4, '2024-01-25', '2024-02-05', 1500.00, 'Ordered', 'Home goods inventory'),
    (5, '2024-01-28', '2024-02-10', 2100.00, 'Ordered', 'Sports equipment')
ON CONFLICT DO NOTHING;

-- Note: Sales data is typically generated through the application
-- Sample sales can be added here if needed for testing
