use bcrypt::{hash, DEFAULT_COST};
use sqlx::SqlitePool;
use uuid::Uuid;

pub async fn seed_database(pool: &SqlitePool) -> Result<(), String> {
    println!("🌱 Starting database seeding...");

    // Check if data already exists
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    if count > 10 {
        println!("⚠️  Database already seeded. Skipping...");
        return Ok(());
    }

    // Seed Users
    seed_users(pool).await?;
    
    // Seed Store Config
    seed_store_config(pool).await?;
    
    // Seed Products
    let product_ids = seed_products(pool).await?;
    
    // Seed Inventory
    seed_inventory(pool, &product_ids).await?;
    
    // Seed Sales
    seed_sales(pool, &product_ids).await?;

    println!("✅ Database seeding completed successfully!");
    Ok(())
}

async fn seed_users(pool: &SqlitePool) -> Result<(), String> {
    println!("👥 Seeding users...");

    let users = vec![
        ("manager", "manager@pos.com", "Manager123", "Sarah", "Johnson", "Manager"),
        ("cashier1", "cashier1@pos.com", "Cashier123", "Michael", "Smith", "Cashier"),
        ("cashier2", "cashier2@pos.com", "Cashier123", "Emily", "Davis", "Cashier"),
        ("inventory", "inventory@pos.com", "Inventory123", "James", "Wilson", "Inventory Manager"),
    ];

    for (username, email, password, first_name, last_name, role) in users {
        let pwd_hash = hash(password, DEFAULT_COST).map_err(|e| e.to_string())?;
        
        sqlx::query(
            "INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)"
        )
        .bind(username)
        .bind(email)
        .bind(&pwd_hash)
        .bind(first_name)
        .bind(last_name)
        .bind(role)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    println!("   ✓ Created 4 users (+ admin)");
    Ok(())
}

async fn seed_store_config(pool: &SqlitePool) -> Result<(), String> {
    println!("🏪 Seeding store configuration...");

    sqlx::query(
        "INSERT OR IGNORE INTO store_config (id, name, address, phone, email, tax_rate, currency, timezone)
         VALUES (1, 'Premium POS Store', '123 Main Street, Downtown', '+1-555-0100', 'contact@premiumpos.com', 8.5, 'USD', 'America/New_York')"
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    println!("   ✓ Store configuration created");
    Ok(())
}

async fn seed_products(pool: &SqlitePool) -> Result<Vec<i64>, String> {
    println!("📦 Seeding products...");

    let products = vec![
        // Electronics
        ("ELEC-001", "4900001001", "iPhone 15 Pro", "Latest Apple smartphone with A17 Pro chip", "Electronics", "Smartphones", "Apple", 999.99, 750.00, 850.00, 8.5, true, "Each", 0.2, "6.1 x 2.8 x 0.3 inches", "Apple Inc.", 5),
        ("ELEC-002", "4900001002", "Samsung Galaxy S24", "Flagship Android smartphone", "Electronics", "Smartphones", "Samsung", 899.99, 650.00, 750.00, 8.5, true, "Each", 0.19, "5.9 x 2.7 x 0.3 inches", "Samsung Electronics", 5),
        ("ELEC-003", "4900001003", "MacBook Air M3", "Lightweight laptop with M3 chip", "Electronics", "Computers", "Apple", 1299.99, 950.00, 1100.00, 8.5, true, "Each", 2.7, "12 x 8.5 x 0.6 inches", "Apple Inc.", 3),
        ("ELEC-004", "4900001004", "Dell XPS 15", "High-performance Windows laptop", "Electronics", "Computers", "Dell", 1499.99, 1100.00, 1250.00, 8.5, true, "Each", 4.5, "13.6 x 9 x 0.7 inches", "Dell Technologies", 3),
        ("ELEC-005", "4900001005", "iPad Pro 12.9", "Professional tablet with M2 chip", "Electronics", "Tablets", "Apple", 1099.99, 800.00, 950.00, 8.5, true, "Each", 1.5, "11 x 8.5 x 0.2 inches", "Apple Inc.", 4),
        ("ELEC-006", "4900001006", "Sony WH-1000XM5", "Premium noise-canceling headphones", "Electronics", "Audio", "Sony", 399.99, 250.00, 320.00, 8.5, true, "Each", 0.56, "7 x 3 x 9 inches", "Sony Corporation", 10),
        ("ELEC-007", "4900001007", "AirPods Pro 2", "Wireless earbuds with ANC", "Electronics", "Audio", "Apple", 249.99, 160.00, 200.00, 8.5, true, "Pair", 0.1, "2 x 2 x 1 inches", "Apple Inc.", 15),
        ("ELEC-008", "4900001008", "Samsung 65 4K TV", "Large 4K Smart TV", "Electronics", "TVs", "Samsung", 899.99, 600.00, 750.00, 8.5, true, "Each", 45.0, "57 x 33 x 2 inches", "Samsung Electronics", 2),
        ("ELEC-009", "4900001009", "Canon EOS R6", "Full-frame mirrorless camera", "Electronics", "Cameras", "Canon", 2499.99, 1800.00, 2100.00, 8.5, true, "Each", 1.4, "5.4 x 3.8 x 3.5 inches", "Canon Inc.", 2),
        ("ELEC-010", "4900001010", "PlayStation 5", "Next-gen gaming console", "Electronics", "Gaming", "Sony", 499.99, 380.00, 450.00, 8.5, true, "Each", 9.9, "15 x 4 x 10 inches", "Sony Interactive", 6),

        // Clothing
        ("CLTH-001", "4900002001", "Nike Air Max 90", "Classic athletic sneakers", "Clothing", "Footwear", "Nike", 129.99, 65.00, 90.00, 8.5, true, "Pair", 1.0, "Standard", "Nike Inc.", 20),
        ("CLTH-002", "4900002002", "Adidas Ultraboost", "Running shoes with boost technology", "Clothing", "Footwear", "Adidas", 179.99, 90.00, 130.00, 8.5, true, "Pair", 1.1, "Standard", "Adidas AG", 15),
        ("CLTH-003", "4900002003", "Levi's 501 Jeans", "Original fit jeans", "Clothing", "Bottoms", "Levi's", 69.99, 30.00, 45.00, 8.5, true, "Each", 0.8, "Standard", "Levi Strauss & Co.", 30),
        ("CLTH-004", "4900002004", "North Face Jacket", "Waterproof outdoor jacket", "Clothing", "Outerwear", "North Face", 199.99, 100.00, 150.00, 8.5, true, "Each", 1.2, "Standard", "The North Face", 12),
        ("CLTH-005", "4900002005", "Nike Dri-FIT Shirt", "Performance athletic shirt", "Clothing", "Tops", "Nike", 34.99, 15.00, 22.00, 8.5, true, "Each", 0.3, "Standard", "Nike Inc.", 50),

        // Home & Garden
        ("HOME-001", "4900003001", "Dyson V15 Vacuum", "Cordless stick vacuum cleaner", "Home & Garden", "Appliances", "Dyson", 649.99, 400.00, 550.00, 8.5, true, "Each", 6.8, "49 x 10 x 10 inches", "Dyson Ltd.", 5),
        ("HOME-002", "4900003002", "KitchenAid Mixer", "Stand mixer for baking", "Home & Garden", "Kitchen", "KitchenAid", 379.99, 220.00, 300.00, 8.5, true, "Each", 22.0, "14 x 9 x 14 inches", "Whirlpool Corp.", 8),
        ("HOME-003", "4900003003", "Instant Pot Duo", "Multi-function pressure cooker", "Home & Garden", "Kitchen", "Instant Pot", 99.99, 50.00, 70.00, 8.5, true, "Each", 12.0, "13 x 13 x 12 inches", "Instant Brands", 15),
        ("HOME-004", "4900003004", "Philips Hue Starter Kit", "Smart LED lighting system", "Home & Garden", "Smart Home", "Philips", 199.99, 120.00, 160.00, 8.5, true, "Box", 2.0, "Standard", "Signify N.V.", 10),

        // Sports & Fitness
        ("SPRT-001", "4900004001", "Peloton Bike", "Interactive fitness bike", "Sports", "Fitness Equipment", "Peloton", 1495.00, 1000.00, 1300.00, 8.5, true, "Each", 135.0, "59 x 23 x 53 inches", "Peloton Interactive", 2),
        ("SPRT-002", "4900004002", "Bowflex Dumbbells", "Adjustable dumbbells set", "Sports", "Fitness Equipment", "Bowflex", 349.99, 200.00, 275.00, 8.5, true, "Pair", 52.0, "17 x 8 x 9 inches", "Nautilus Inc.", 8),
        ("SPRT-003", "4900004003", "Yoga Mat Premium", "Non-slip exercise mat", "Sports", "Fitness Accessories", "Manduka", 79.99, 35.00, 55.00, 8.5, true, "Each", 3.2, "71 x 26 x 0.2 inches", "Manduka", 25),
        ("SPRT-004", "4900004004", "Garmin Forerunner", "GPS running watch", "Sports", "Wearables", "Garmin", 299.99, 180.00, 240.00, 8.5, true, "Each", 0.2, "Standard", "Garmin Ltd.", 12),

        // Food & Beverage
        ("FOOD-001", "4900005001", "Organic Coffee Beans", "Premium Arabica coffee beans", "Food & Beverage", "Coffee", "Generic", 24.99, 12.00, 18.00, 0.0, false, "Lb", 1.0, "Standard", "Local Roasters", 50),
        ("FOOD-002", "4900005002", "Protein Powder", "Whey protein supplement", "Food & Beverage", "Supplements", "Optimum", 49.99, 25.00, 38.00, 0.0, false, "Each", 5.0, "Standard", "Optimum Nutrition", 30),
        ("FOOD-003", "4900005003", "Energy Drink Pack", "24-pack energy drinks", "Food & Beverage", "Beverages", "Red Bull", 39.99, 20.00, 30.00, 8.5, true, "Pack", 15.0, "Standard", "Red Bull GmbH", 40),

        // Health & Beauty
        ("BEAU-001", "4900006001", "Dyson Airwrap", "Multi-styler hair tool", "Health & Beauty", "Hair Care", "Dyson", 599.99, 380.00, 500.00, 8.5, true, "Each", 1.5, "Standard", "Dyson Ltd.", 4),
        ("BEAU-002", "4900006002", "La Mer Cream", "Luxury moisturizing cream", "Health & Beauty", "Skincare", "La Mer", 185.00, 90.00, 140.00, 8.5, true, "Each", 0.5, "Standard", "Estée Lauder", 15),
        ("BEAU-003", "4900006003", "Oral-B Electric", "Rechargeable toothbrush", "Health & Beauty", "Oral Care", "Oral-B", 129.99, 60.00, 95.00, 8.5, true, "Each", 0.8, "Standard", "Procter & Gamble", 20),

        // Books & Media
        ("BOOK-001", "4900007001", "Business Strategy Book", "Bestselling business guide", "Books", "Business", "Generic", 29.99, 12.00, 20.00, 0.0, false, "Each", 1.2, "Standard", "Various Publishers", 25),
        ("BOOK-002", "4900007002", "Tech Magazine", "Monthly technology magazine", "Books", "Magazines", "Generic", 9.99, 4.00, 7.00, 0.0, false, "Each", 0.5, "Standard", "Various Publishers", 50),

        // Automotive
        ("AUTO-001", "4900008001", "Motor Oil 5W-30", "Synthetic motor oil", "Automotive", "Fluids", "Mobil 1", 44.99, 22.00, 35.00, 8.5, true, "Each", 8.0, "Standard", "ExxonMobil", 30),
        ("AUTO-002", "4900008002", "Car Phone Mount", "Dashboard phone holder", "Automotive", "Accessories", "iOttie", 24.99, 10.00, 17.00, 8.5, true, "Each", 0.5, "Standard", "iOttie Inc.", 40),
    ];

    let mut product_ids = Vec::new();

    for (sku, barcode, name, desc, category, subcategory, brand, price, cost, wholesale, tax_rate, is_taxable, unit, weight, dimensions, supplier, reorder) in products {
        let result = sqlx::query(
            "INSERT INTO products (sku, barcode, name, description, category, subcategory, brand, 
             cost_price, selling_price, wholesale_price, tax_rate, is_taxable, unit_of_measure, 
             weight, dimensions, supplier_info, reorder_point, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, 1)"
        )
        .bind(sku)
        .bind(barcode)
        .bind(name)
        .bind(desc)
        .bind(category)
        .bind(subcategory)
        .bind(brand)
        .bind(cost)
        .bind(price)
        .bind(wholesale)
        .bind(tax_rate)
        .bind(is_taxable)
        .bind(unit)
        .bind(weight)
        .bind(dimensions)
        .bind(supplier)
        .bind(reorder)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        product_ids.push(result.last_insert_rowid());
    }

    println!("   ✓ Created {} products", product_ids.len());
    Ok(product_ids)
}

async fn seed_inventory(pool: &SqlitePool, product_ids: &[i64]) -> Result<(), String> {
    println!("📊 Seeding inventory...");

    for &product_id in product_ids {
        let stock = match product_id % 5 {
            0 => 5,   // Low stock
            1 => 50,  // Medium stock
            2 => 100, // High stock
            3 => 25,  // Medium-low
            _ => 75,  // Medium-high
        };

        let min_stock = stock / 5;
        let max_stock = stock * 2;

        sqlx::query(
            "INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock, 
             reserved_stock, available_stock, stock_take_count)
             VALUES (?1, ?2, ?3, ?4, 0, ?2, 0)"
        )
        .bind(product_id)
        .bind(stock)
        .bind(min_stock)
        .bind(max_stock)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    println!("   ✓ Created {} inventory records", product_ids.len());
    Ok(())
}

async fn seed_sales(pool: &SqlitePool, product_ids: &[i64]) -> Result<(), String> {
    println!("💰 Seeding sales transactions...");

    // Get admin user ID
    let admin_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = 'admin'")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Create 20 sample sales
    for i in 0..20 {
        let sale_number = format!("SALE-{}", Uuid::new_v4().to_string().split('-').next().unwrap());
        
        let payment_methods = vec!["cash", "card", "mobile"];
        let payment_method = payment_methods[i % 3];

        let mut subtotal = 0.0;
        let mut tax_amount = 0.0;

        // Create sale
        let sale_result = sqlx::query(
            "INSERT INTO sales (sale_number, subtotal, tax_amount, discount_amount, total_amount,
             payment_method, payment_status, cashier_id, customer_name, notes, shift_id, created_at)
             VALUES (?1, ?2, ?3, 0, ?4, ?5, 'completed', ?6, ?7, ?8, NULL, datetime('now', '-' || ?9 || ' days'))"
        )
        .bind(&sale_number)
        .bind(0.0) // Will update after items
        .bind(0.0)
        .bind(0.0)
        .bind(payment_method)
        .bind(admin_id)
        .bind(format!("Customer {}", i + 1))
        .bind("Sample transaction")
        .bind(i % 30) // Spread over last 30 days
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        let sale_id = sale_result.last_insert_rowid();

        // Add 2-4 items to each sale
        let num_items = 2 + (i % 3);
        for j in 0..num_items {
            let product_idx = ((i * 3 + j) % product_ids.len() as i64) as usize;
            let product_id = product_ids[product_idx];

            // Get product details
            let product: (f64, f64, bool, f64) = sqlx::query_as(
                "SELECT cost_price, selling_price, is_taxable, tax_rate FROM products WHERE id = ?1"
            )
            .bind(product_id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

            let (cost_price, selling_price, is_taxable, tax_rate) = product;
            let quantity = 1 + (j % 3);
            let line_total = selling_price * quantity as f64;
            let item_tax = if is_taxable { line_total * tax_rate / 100.0 } else { 0.0 };

            subtotal += line_total;
            tax_amount += item_tax;

            // Create sale item
            sqlx::query(
                "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount,
                 line_total, tax_amount, cost_price)
                 VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)"
            )
            .bind(sale_id)
            .bind(product_id)
            .bind(quantity)
            .bind(selling_price)
            .bind(line_total)
            .bind(item_tax)
            .bind(cost_price)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        }

        // Update sale totals
        let total_amount = subtotal + tax_amount;
        sqlx::query(
            "UPDATE sales SET subtotal = ?1, tax_amount = ?2, total_amount = ?3 WHERE id = ?4"
        )
        .bind(subtotal)
        .bind(tax_amount)
        .bind(total_amount)
        .bind(sale_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    println!("   ✓ Created 20 sales transactions");
    Ok(())
}
