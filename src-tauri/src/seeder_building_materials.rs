use bcrypt::{hash, DEFAULT_COST};
use sqlx::SqlitePool;
use uuid::Uuid;

pub async fn seed_database(pool: &SqlitePool) -> Result<(), String> {
    println!("🌱 Starting database seeding for Building Materials Wholesale...");

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

    // Seed Building Materials Products
    let product_ids = seed_building_materials_products(pool).await?;

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
        (
            "manager",
            "manager@buildco.com",
            "Manager123",
            "Sarah",
            "Johnson",
            "Manager",
        ),
        (
            "cashier1",
            "cashier1@buildco.com",
            "Cashier123",
            "Michael",
            "Smith",
            "Cashier",
        ),
        (
            "cashier2",
            "cashier2@buildco.com",
            "Cashier123",
            "Emily",
            "Davis",
            "Cashier",
        ),
        (
            "warehouse",
            "warehouse@buildco.com",
            "Warehouse123",
            "James",
            "Wilson",
            "Warehouse",
        ),
        (
            "stock",
            "stock@buildco.com",
            "Stock123",
            "Linda",
            "Martinez",
            "StockKeeper",
        ),
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

    println!("   ✓ Created 5 users (+ admin)");
    Ok(())
}

async fn seed_store_config(pool: &SqlitePool) -> Result<(), String> {
    println!("🏪 Seeding store configuration...");

    sqlx::query(
        "INSERT OR IGNORE INTO locations (id, name, address, city, state, zip_code, phone, email, tax_rate, currency)
         VALUES (1, 'BuildCo Wholesale Materials', '4567 Industrial Parkway', 'Denver', 'CO', '80202', '+1-303-555-0199', 'sales@buildco.com', 6.5, 'USD')"
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    println!("   ✓ Store configuration created");
    Ok(())
}

async fn seed_building_materials_products(pool: &SqlitePool) -> Result<Vec<i64>, String> {
    println!("🧱 Seeding building materials products...");

    let products = vec![
        // CEMENT & CONCRETE
        (
            "CEM-P1-50",
            "8901234001",
            "Portland Cement Type I - 50kg",
            "High-quality general purpose cement for all construction",
            "Cement & Concrete",
            "Portland Cement",
            "CemEx",
            8.50,
            6.20,
            7.00,
            6.5,
            true,
            "Bag",
            50.0,
            "20x10x6 inches",
            "CemEx Supply Co.",
            100,
        ),
        (
            "CEM-P1-94",
            "8901234002",
            "Portland Cement Type I - 94lb",
            "Standard 94lb bag for commercial projects",
            "Cement & Concrete",
            "Portland Cement",
            "Quikrete",
            12.99,
            9.50,
            10.50,
            6.5,
            true,
            "Bag",
            94.0,
            "24x14x6 inches",
            "Quikrete Corp.",
            80,
        ),
        (
            "CMX-001",
            "8901234003",
            "Ready Mix Concrete 3000 PSI",
            "Pre-mixed concrete 3000 PSI strength",
            "Cement & Concrete",
            "Ready Mix",
            "CemEx",
            115.00,
            85.00,
            95.00,
            6.5,
            true,
            "Cubic Yard",
            4000.0,
            "Bulk",
            "CemEx Supply Co.",
            20,
        ),
        (
            "CMX-002",
            "8901234004",
            "Ready Mix Concrete 4000 PSI",
            "High strength ready mix for commercial",
            "Cement & Concrete",
            "Ready Mix",
            "CemEx",
            125.00,
            95.00,
            105.00,
            6.5,
            true,
            "Cubic Yard",
            4000.0,
            "Bulk",
            "CemEx Supply Co.",
            15,
        ),
        (
            "GRT-001",
            "8901234005",
            "Cement Grout - Sanded",
            "Sanded grout for tile joints 1/8\" to 1/2\"",
            "Cement & Concrete",
            "Grout",
            "Custom Building Products",
            22.99,
            16.00,
            18.00,
            6.5,
            true,
            "Bag",
            25.0,
            "18x12x4 inches",
            "Custom Building",
            60,
        ),
        // LUMBER & WOOD
        (
            "LBR-2X4-8",
            "8901234101",
            "2x4x8 Pressure Treated Lumber",
            "Premium grade pressure treated lumber",
            "Lumber",
            "Dimensional Lumber",
            "Georgia-Pacific",
            8.99,
            6.20,
            7.00,
            6.5,
            true,
            "Each",
            13.5,
            "96x3.5x1.5 inches",
            "Georgia-Pacific",
            200,
        ),
        (
            "LBR-2X4-10",
            "8901234102",
            "2x4x10 Pressure Treated Lumber",
            "10 foot pressure treated for framing",
            "Lumber",
            "Dimensional Lumber",
            "Georgia-Pacific",
            11.49,
            7.80,
            8.90,
            6.5,
            true,
            "Each",
            16.9,
            "120x3.5x1.5 inches",
            "Georgia-Pacific",
            180,
        ),
        (
            "LBR-2X6-8",
            "8901234103",
            "2x6x8 Pressure Treated Lumber",
            "Heavy duty 2x6 for decking and framing",
            "Lumber",
            "Dimensional Lumber",
            "Georgia-Pacific",
            13.99,
            9.50,
            10.80,
            6.5,
            true,
            "Each",
            20.3,
            "96x5.5x1.5 inches",
            "Georgia-Pacific",
            150,
        ),
        (
            "LBR-2X8-10",
            "8901234104",
            "2x8x10 Pressure Treated Lumber",
            "Large dimensional lumber for structures",
            "Lumber",
            "Dimensional Lumber",
            "Georgia-Pacific",
            24.99,
            17.00,
            19.50,
            6.5,
            true,
            "Each",
            33.8,
            "120x7.25x1.5 inches",
            "Georgia-Pacific",
            100,
        ),
        (
            "PLY-001",
            "8901234105",
            "Plywood 4x8 1/2\" CDX",
            "Construction grade plywood sheet",
            "Lumber",
            "Plywood & OSB",
            "Weyerhaeuser",
            32.99,
            23.00,
            26.50,
            6.5,
            true,
            "Sheet",
            44.0,
            "96x48x0.5 inches",
            "Weyerhaeuser",
            80,
        ),
        (
            "PLY-002",
            "8901234106",
            "Plywood 4x8 3/4\" CDX",
            "Heavy duty construction plywood",
            "Lumber",
            "Plywood & OSB",
            "Weyerhaeuser",
            45.99,
            32.00,
            36.50,
            6.5,
            true,
            "Sheet",
            61.0,
            "96x48x0.75 inches",
            "Weyerhaeuser",
            60,
        ),
        (
            "OSB-001",
            "8901234107",
            "OSB 4x8 7/16\" Sheathing",
            "Oriented strand board for sheathing",
            "Lumber",
            "Plywood & OSB",
            "LP Building",
            18.99,
            13.50,
            15.20,
            6.5,
            true,
            "Sheet",
            45.0,
            "96x48x0.44 inches",
            "Louisiana-Pacific",
            100,
        ),
        // DRYWALL & INSULATION
        (
            "DRY-001",
            "8901234201",
            "Drywall 4x8 1/2\" Regular",
            "Standard gypsum drywall sheet",
            "Drywall & Insulation",
            "Drywall",
            "USG",
            10.49,
            7.20,
            8.30,
            6.5,
            true,
            "Sheet",
            54.0,
            "96x48x0.5 inches",
            "USG Corporation",
            150,
        ),
        (
            "DRY-002",
            "8901234202",
            "Drywall 4x8 5/8\" Type X Fire",
            "Fire resistant Type X drywall",
            "Drywall & Insulation",
            "Drywall",
            "USG",
            14.99,
            10.50,
            12.00,
            6.5,
            true,
            "Sheet",
            70.4,
            "96x48x0.625 inches",
            "USG Corporation",
            100,
        ),
        (
            "DRY-003",
            "8901234203",
            "Drywall 4x8 1/2\" Moisture Resistant",
            "Green board for moisture areas",
            "Drywall & Insulation",
            "Drywall",
            "USG",
            13.99,
            9.80,
            11.20,
            6.5,
            true,
            "Sheet",
            54.0,
            "96x48x0.5 inches",
            "USG Corporation",
            80,
        ),
        (
            "INS-001",
            "8901234204",
            "Fiberglass Insulation R-13 15\"",
            "R-13 batt insulation for 2x4 walls",
            "Drywall & Insulation",
            "Insulation",
            "Owens Corning",
            42.99,
            30.00,
            34.50,
            6.5,
            true,
            "Roll",
            18.0,
            "188x15x3.5 inches",
            "Owens Corning",
            60,
        ),
        (
            "INS-002",
            "8901234205",
            "Fiberglass Insulation R-19 23\"",
            "R-19 batt for 2x6 walls",
            "Drywall & Insulation",
            "Insulation",
            "Owens Corning",
            59.99,
            42.00,
            48.00,
            6.5,
            true,
            "Roll",
            25.0,
            "188x23x6.25 inches",
            "Owens Corning",
            50,
        ),
        (
            "INS-003",
            "8901234206",
            "Rigid Foam Insulation 4x8 1\"",
            "XPS foam board insulation R-5",
            "Drywall & Insulation",
            "Insulation",
            "Owens Corning",
            24.99,
            17.50,
            20.00,
            6.5,
            true,
            "Sheet",
            9.6,
            "96x48x1 inches",
            "Owens Corning",
            70,
        ),
        // ROOFING
        (
            "ROOF-001",
            "8901234301",
            "Asphalt Shingles 3-Tab Black",
            "Standard 3-tab architectural shingles",
            "Roofing",
            "Shingles",
            "GAF",
            28.99,
            20.00,
            23.00,
            6.5,
            true,
            "Bundle",
            75.0,
            "42x14x11 inches",
            "GAF Materials",
            100,
        ),
        (
            "ROOF-002",
            "8901234302",
            "Asphalt Shingles Architectural Gray",
            "Premium architectural shingles",
            "Roofing",
            "Shingles",
            "GAF",
            38.99,
            27.00,
            31.00,
            6.5,
            true,
            "Bundle",
            85.0,
            "42x14x11 inches",
            "GAF Materials",
            80,
        ),
        (
            "ROOF-003",
            "8901234303",
            "Roofing Felt 15lb Tar Paper",
            "Underlayment felt paper roll",
            "Roofing",
            "Underlayment",
            "GAF",
            22.99,
            16.00,
            18.50,
            6.5,
            true,
            "Roll",
            60.0,
            "144x36 inches",
            "GAF Materials",
            50,
        ),
        (
            "ROOF-004",
            "8901234304",
            "Synthetic Roofing Underlayment",
            "Advanced synthetic underlayment",
            "Roofing",
            "Underlayment",
            "GAF",
            119.99,
            85.00,
            98.00,
            6.5,
            true,
            "Roll",
            47.0,
            "250x48 inches",
            "GAF Materials",
            40,
        ),
        (
            "ROOF-005",
            "8901234305",
            "Metal Roofing Panel 3' - Galvanized",
            "Corrugated metal roofing panel",
            "Roofing",
            "Metal Roofing",
            "Union Corrugating",
            34.99,
            24.50,
            28.00,
            6.5,
            true,
            "Panel",
            28.0,
            "120x36x0.3 inches",
            "Union Corrugating",
            60,
        ),
        // SIDING & EXTERIOR
        (
            "SID-001",
            "8901234401",
            "Vinyl Siding 4.5\" Dutch Lap White",
            "Low maintenance vinyl siding",
            "Siding & Exterior",
            "Vinyl Siding",
            "CertainTeed",
            159.99,
            112.00,
            128.00,
            6.5,
            true,
            "Box",
            95.0,
            "12ft coverage",
            "CertainTeed Corp",
            40,
        ),
        (
            "SID-002",
            "8901234402",
            "Vinyl Siding 4.5\" Dutch Lap Tan",
            "Tan vinyl siding for residential",
            "Siding & Exterior",
            "Vinyl Siding",
            "CertainTeed",
            159.99,
            112.00,
            128.00,
            6.5,
            true,
            "Box",
            95.0,
            "12ft coverage",
            "CertainTeed Corp",
            35,
        ),
        (
            "SID-003",
            "8901234403",
            "House Wrap Tyvek 9'x150'",
            "Weather resistant house wrap",
            "Siding & Exterior",
            "Building Wrap",
            "DuPont",
            169.99,
            120.00,
            138.00,
            6.5,
            true,
            "Roll",
            52.0,
            "150x9ft",
            "DuPont Tyvek",
            30,
        ),
        (
            "SID-004",
            "8901234404",
            "Hardie Board Fiber Cement 4x8",
            "Durable fiber cement siding",
            "Siding & Exterior",
            "Fiber Cement",
            "James Hardie",
            42.99,
            30.00,
            34.50,
            6.5,
            true,
            "Sheet",
            95.0,
            "96x48x0.31 inches",
            "James Hardie",
            50,
        ),
        // WINDOWS & DOORS
        (
            "WIN-001",
            "8901234501",
            "Vinyl Window Single Hung 24x36",
            "Energy efficient vinyl window",
            "Windows & Doors",
            "Windows",
            "Pella",
            189.99,
            135.00,
            155.00,
            6.5,
            true,
            "Each",
            45.0,
            "24x36 inches",
            "Pella Corporation",
            25,
        ),
        (
            "WIN-002",
            "8901234502",
            "Vinyl Window Single Hung 30x48",
            "Large single hung window",
            "Windows & Doors",
            "Windows",
            "Pella",
            249.99,
            178.00,
            204.00,
            6.5,
            true,
            "Each",
            58.0,
            "30x48 inches",
            "Pella Corporation",
            20,
        ),
        (
            "DOOR-001",
            "8901234503",
            "Steel Entry Door 36\" White",
            "Insulated steel entry door",
            "Windows & Doors",
            "Doors",
            "Therma-Tru",
            299.99,
            215.00,
            245.00,
            6.5,
            true,
            "Each",
            85.0,
            "80x36x1.75 inches",
            "Therma-Tru",
            15,
        ),
        (
            "DOOR-002",
            "8901234504",
            "Fiberglass Entry Door 36\" Oak",
            "Premium fiberglass entry door",
            "Windows & Doors",
            "Doors",
            "Therma-Tru",
            459.99,
            330.00,
            378.00,
            6.5,
            true,
            "Each",
            90.0,
            "80x36x1.75 inches",
            "Therma-Tru",
            12,
        ),
        // FASTENERS & HARDWARE
        (
            "NAIL-001",
            "8901234601",
            "Framing Nails 16d 5lb Box",
            "Hot-dipped galvanized framing nails",
            "Fasteners & Hardware",
            "Nails",
            "Grip-Rite",
            14.99,
            10.50,
            12.00,
            6.5,
            true,
            "Box",
            5.0,
            "10x6x4 inches",
            "PrimeSource",
            100,
        ),
        (
            "NAIL-002",
            "8901234602",
            "Finish Nails 8d 1lb Box",
            "Bright finish nails for trim",
            "Fasteners & Hardware",
            "Nails",
            "Grip-Rite",
            5.99,
            4.20,
            4.80,
            6.5,
            true,
            "Box",
            1.0,
            "6x4x2 inches",
            "PrimeSource",
            150,
        ),
        (
            "SCREW-001",
            "8901234603",
            "Deck Screws #8 x 2.5\" 5lb",
            "Coated deck screws",
            "Fasteners & Hardware",
            "Screws",
            "GRK Fasteners",
            32.99,
            23.00,
            26.50,
            6.5,
            true,
            "Box",
            5.0,
            "8x6x4 inches",
            "GRK Fasteners",
            80,
        ),
        (
            "SCREW-002",
            "8901234604",
            "Drywall Screws #6 x 1-5/8\" 5lb",
            "Coarse thread drywall screws",
            "Fasteners & Hardware",
            "Screws",
            "Grip-Rite",
            18.99,
            13.50,
            15.50,
            6.5,
            true,
            "Box",
            5.0,
            "8x6x4 inches",
            "PrimeSource",
            100,
        ),
        // ELECTRICAL
        (
            "ELEC-001",
            "8901234701",
            "Romex 12/2 NM-B Cable 250ft",
            "12 AWG 2-conductor cable",
            "Electrical",
            "Wire & Cable",
            "Southwire",
            129.99,
            92.00,
            105.00,
            6.5,
            true,
            "Roll",
            38.0,
            "250ft coil",
            "Southwire",
            30,
        ),
        (
            "ELEC-002",
            "8901234702",
            "Romex 14/2 NM-B Cable 250ft",
            "14 AWG 2-conductor cable",
            "Electrical",
            "Wire & Cable",
            "Southwire",
            89.99,
            64.00,
            73.00,
            6.5,
            true,
            "Roll",
            32.0,
            "250ft coil",
            "Southwire",
            40,
        ),
        (
            "ELEC-003",
            "8901234703",
            "Electrical Box Single Gang",
            "PVC electrical outlet box",
            "Electrical",
            "Boxes & Covers",
            "Carlon",
            1.29,
            0.90,
            1.05,
            6.5,
            true,
            "Each",
            0.2,
            "4x2x2 inches",
            "Carlon",
            500,
        ),
        (
            "ELEC-004",
            "8901234704",
            "Electrical Box Double Gang",
            "PVC double gang box",
            "Electrical",
            "Boxes & Covers",
            "Carlon",
            1.89,
            1.35,
            1.55,
            6.5,
            true,
            "Each",
            0.3,
            "4x4x2 inches",
            "Carlon",
            400,
        ),
        // PLUMBING
        (
            "PLUMB-001",
            "8901234801",
            "PVC Pipe 2\" x 10ft Schedule 40",
            "White PVC drainage pipe",
            "Plumbing",
            "PVC Pipe",
            "Charlotte Pipe",
            9.99,
            7.00,
            8.00,
            6.5,
            true,
            "Each",
            4.5,
            "120x2 inches",
            "Charlotte Pipe",
            150,
        ),
        (
            "PLUMB-002",
            "8901234802",
            "PVC Pipe 4\" x 10ft Schedule 40",
            "Large diameter drainage pipe",
            "Plumbing",
            "PVC Pipe",
            "Charlotte Pipe",
            24.99,
            17.50,
            20.00,
            6.5,
            true,
            "Each",
            11.0,
            "120x4 inches",
            "Charlotte Pipe",
            100,
        ),
        (
            "PLUMB-003",
            "8901234803",
            "Copper Pipe Type L 3/4\" x 10ft",
            "Type L copper water pipe",
            "Plumbing",
            "Copper Pipe",
            "Mueller",
            42.99,
            30.50,
            35.00,
            6.5,
            true,
            "Each",
            6.0,
            "120x0.75 inches",
            "Mueller Industries",
            60,
        ),
        (
            "PLUMB-004",
            "8901234804",
            "PEX Tubing 1/2\" x 100ft Red",
            "Red PEX for hot water",
            "Plumbing",
            "PEX Tubing",
            "SharkBite",
            64.99,
            46.00,
            52.50,
            6.5,
            true,
            "Roll",
            15.0,
            "100ft coil",
            "SharkBite",
            50,
        ),
        // CONCRETE BLOCKS & BRICKS
        (
            "BLOCK-001",
            "8901234901",
            "Concrete Block 8x8x16 Standard",
            "Standard concrete masonry unit",
            "Masonry",
            "Concrete Blocks",
            "Oldcastle",
            1.89,
            1.35,
            1.55,
            6.5,
            true,
            "Each",
            33.0,
            "16x8x8 inches",
            "Oldcastle",
            1000,
        ),
        (
            "BLOCK-002",
            "8901234902",
            "Concrete Block 8x8x16 Half",
            "Half block for corners",
            "Masonry",
            "Concrete Blocks",
            "Oldcastle",
            1.49,
            1.05,
            1.20,
            6.5,
            true,
            "Each",
            17.0,
            "8x8x8 inches",
            "Oldcastle",
            500,
        ),
        (
            "BRICK-001",
            "8901234903",
            "Clay Brick Standard Red",
            "Standard modular clay brick",
            "Masonry",
            "Bricks",
            "Boral",
            0.69,
            0.48,
            0.55,
            6.5,
            true,
            "Each",
            4.5,
            "8x3.75x2.25 inches",
            "Boral Brick",
            2000,
        ),
        (
            "BRICK-002",
            "8901234904",
            "Clay Brick Paver Red",
            "Red clay paver for walkways",
            "Masonry",
            "Bricks",
            "Boral",
            0.89,
            0.62,
            0.72,
            6.5,
            true,
            "Each",
            5.0,
            "8x4x2.25 inches",
            "Boral Brick",
            1500,
        ),
    ];

    let mut product_ids = Vec::new();

    for (
        sku,
        barcode,
        name,
        desc,
        category,
        subcategory,
        brand,
        price,
        cost,
        wholesale,
        tax_rate,
        is_taxable,
        unit,
        weight,
        dimensions,
        supplier,
        reorder,
    ) in products
    {
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

    println!(
        "   ✓ Created {} building materials products",
        product_ids.len()
    );
    Ok(product_ids)
}

async fn seed_inventory(pool: &SqlitePool, product_ids: &[i64]) -> Result<(), String> {
    println!("📊 Seeding inventory...");

    for &product_id in product_ids {
        // Variable stock levels - higher for small items, lower for bulk
        let stock = match product_id % 7i64 {
            0 => 15,  // Low stock (heavy/bulk items)
            1 => 50,  // Medium stock
            2 => 150, // High stock (fasteners, small items)
            3 => 30,  // Medium-low stock
            4 => 100, // High stock
            5 => 25,  // Medium-low stock
            _ => 75,  // Default
        };

        let min_stock = stock / 4;
        let max_stock = stock * 3;

        sqlx::query(
            "INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock, 
             reserved_stock, available_stock, stock_take_count)
             VALUES (?1, ?2, ?3, ?4, 0, ?2, 0)",
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

    // Get admin user ID (or any valid user)
    let admin_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = 'admin' OR role = 'Admin' LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No users found in database".to_string())?;

    // Create 15 sample sales for building materials
    for i in 0i32..15i32 {
        let sale_number = format!(
            "SALE-{}",
            Uuid::new_v4().to_string().split('-').next().unwrap()
        );

        let payment_methods = vec!["cash", "card", "check", "bank_transfer"];
        let payment_method = payment_methods[(i % 4) as usize];

        let mut subtotal = 0.0;
        let mut tax_amount = 0.0;

        // Create sale - Don't include shift_id to avoid FK issues
        let sale_result = sqlx::query(
            "INSERT INTO sales (sale_number, subtotal, tax_amount, discount_amount, total_amount,
             payment_method, payment_status, cashier_id, customer_name, notes, created_at)
             VALUES (?1, ?2, ?3, 0, ?4, ?5, 'completed', ?6, ?7, ?8, datetime('now', '-' || ?9 || ' days'))"
        )
        .bind(&sale_number)
        .bind(0.0)
        .bind(0.0)
        .bind(0.0)
        .bind(payment_method)
        .bind(admin_id)
        .bind(format!("Contractor {}", i + 1))
        .bind("Building materials order")
        .bind(i % 30)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert sale: {} (cashier_id: {})", e, admin_id))?;

        let sale_id = sale_result.last_insert_rowid();

        // Add 1-5 items to each sale
        let num_items = 1 + (i % 5);
        for j in 0i32..num_items {
            let product_idx = (((i * 3) + j) as usize) % product_ids.len();
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
            let quantity: i32 = 1 + (j % 10); // 1-10 units
            let line_total = selling_price * (quantity as f64);
            let item_tax = if is_taxable {
                line_total * tax_rate / 100.0
            } else {
                0.0
            };

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
            "UPDATE sales SET subtotal = ?1, tax_amount = ?2, total_amount = ?3 WHERE id = ?4",
        )
        .bind(subtotal)
        .bind(tax_amount)
        .bind(total_amount)
        .bind(sale_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    println!("   ✓ Created 15 sales transactions");
    Ok(())
}
