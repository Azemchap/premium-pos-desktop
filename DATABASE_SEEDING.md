# Database Seeding Guide

## 🌱 Automatic Seeding

The database is **automatically seeded** when you first run the application. The seeding process:
- Runs only once (checks if data already exists)
- Creates sample data for testing and demonstration
- Is completely safe and non-destructive

## 📊 What Gets Seeded

### 1. **Users (5 total)**
| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Administrator | Full system access (pre-existing) |
| `manager` | `Manager123` | Manager | Operations and reports access |
| `cashier1` | `Cashier123` | Cashier | Sales operations only |
| `cashier2` | `Cashier123` | Cashier | Sales operations only |
| `inventory` | `Inventory123` | Inventory Manager | Stock management access |

### 2. **Products (33 items)**

#### Electronics (10 products)
- iPhone 15 Pro - $999.99
- Samsung Galaxy S24 - $899.99
- MacBook Air M3 - $1,299.99
- Dell XPS 15 - $1,499.99
- iPad Pro 12.9" - $1,099.99
- Sony WH-1000XM5 Headphones - $399.99
- AirPods Pro 2 - $249.99
- Samsung 65" 4K TV - $899.99
- Canon EOS R6 Camera - $2,499.99
- PlayStation 5 - $499.99

#### Clothing (5 products)
- Nike Air Max 90 - $129.99
- Adidas Ultraboost - $179.99
- Levi's 501 Jeans - $69.99
- North Face Jacket - $199.99
- Nike Dri-FIT Shirt - $34.99

#### Home & Garden (4 products)
- Dyson V15 Vacuum - $649.99
- KitchenAid Mixer - $379.99
- Instant Pot Duo - $99.99
- Philips Hue Starter Kit - $199.99

#### Sports & Fitness (4 products)
- Peloton Bike - $1,495.00
- Bowflex Dumbbells - $349.99
- Premium Yoga Mat - $79.99
- Garmin Forerunner Watch - $299.99

#### Food & Beverage (3 products)
- Organic Coffee Beans - $24.99
- Protein Powder - $49.99
- Energy Drink Pack (24ct) - $39.99

#### Health & Beauty (3 products)
- Dyson Airwrap - $599.99
- La Mer Cream - $185.00
- Oral-B Electric Toothbrush - $129.99

#### Books & Media (2 products)
- Business Strategy Book - $29.99
- Tech Magazine - $9.99

#### Automotive (2 products)
- Motor Oil 5W-30 - $44.99
- Car Phone Mount - $24.99

### 3. **Inventory Records**
- All products have inventory records
- Stock levels vary (5-100 units)
- Realistic min/max thresholds
- Some items set to low stock for testing alerts

### 4. **Sales Transactions (20)**
- 20 sample sales spread over the last 30 days
- Multiple payment methods (cash, card, mobile)
- 2-4 items per sale
- Realistic customer names
- Complete transaction history

### 5. **Store Configuration**
- Store Name: "Premium POS Store"
- Address: "123 Main Street, Downtown"
- Phone: "+1-555-0100"
- Email: "contact@premiumpos.com"
- Tax Rate: 8.5%
- Currency: USD
- Timezone: America/New_York

## 🔄 Re-seeding the Database

If you want to reset and re-seed the database:

### Method 1: Using npm script (Recommended)
```bash
# Delete the database and restart the app
pnpm reset-db
pnpm tauri:dev
```

### Method 2: Manual deletion
1. Stop the application
2. Delete the database file:
   - **Windows**: `%APPDATA%\com.premiumpos.Premium POS\pos.db`
   - **macOS**: `~/Library/Application Support/com.premiumpos.Premium POS/pos.db`
   - **Linux**: `~/.local/share/com.premiumpos.Premium POS/pos.db`
3. Restart the application

### Method 3: Development mode
Delete `src-tauri/target/debug/pos.db` and restart

## ⚙️ How Seeding Works

The seeding process is defined in `src-tauri/src/seeder.rs` and:

1. **Checks for existing data**: Won't duplicate if products already exist
2. **Creates users** with hashed passwords
3. **Creates store configuration**
4. **Creates products** with realistic data
5. **Creates inventory records** for each product
6. **Creates sample sales** with proper accounting
7. **Updates stock levels** based on sales

## 🛡️ Safety Features

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Won't delete existing data
- **Transactional**: Either completes fully or rolls back
- **Logged**: Progress messages in console
- **Error handling**: Gracefully handles failures

## 📝 Seed Data Details

### Product Categories Distribution
- Electronics: 30%
- Clothing: 15%
- Home & Garden: 12%
- Sports & Fitness: 12%
- Food & Beverage: 9%
- Health & Beauty: 9%
- Books & Media: 6%
- Automotive: 6%

### Stock Levels Pattern
- Low stock (5 units): 20% of products
- Medium-low (25 units): 20%
- Medium (50 units): 20%
- Medium-high (75 units): 20%
- High (100 units): 20%

### Sales Data Pattern
- Distributed over last 30 days
- Various payment methods
- Different item quantities
- Realistic customer data
- Proper tax calculations

## 🎯 Using Seed Data

### For Development
- Test all features with realistic data
- Verify calculations and logic
- Test UI with various data types
- Performance testing with volume

### For Demonstrations
- Show investors realistic workflows
- Present to potential customers
- Training new users
- Create marketing materials

### For Testing
- Verify reports and analytics
- Test search and filtering
- Validate business rules
- Check edge cases

## 🔍 Verifying Seed Data

After seeding, you should see:

1. **Dashboard**: 
   - Sales figures from transactions
   - Low stock alerts
   - Recent activity

2. **Products Page**:
   - 33 products listed
   - Various categories
   - Different price ranges

3. **Inventory Page**:
   - All products with stock
   - Some low stock alerts
   - Inventory value calculated

4. **Sales Page**:
   - All products available
   - Stock levels visible
   - Ready to create sales

5. **Reports Page**:
   - 20 transactions visible
   - Sales trends
   - Product performance data

6. **Users Page** (Admin only):
   - 5 users listed
   - Different roles
   - All active

7. **Settings Page**:
   - Store info populated
   - Tax rate configured
   - Regional settings set

## 🚨 Troubleshooting

### Seeding doesn't run
- Check console for "🌱 Starting database seeding..." message
- Ensure database file has write permissions
- Check for error messages in terminal

### Partial seeding
- Application may have stopped mid-seed
- Delete database and try again
- Check disk space

### Duplicate data
- Seeder checks for existing products
- Only runs if fewer than 10 products exist
- Won't create duplicate users with same username

## 📚 Additional Resources

- See `APP_FEATURES.md` for complete feature list
- Check `src-tauri/src/seeder.rs` for implementation
- Review database schema in `src-tauri/src/database.rs`

---

**Note**: The seed data is for **development and demonstration purposes**. For production use, you should:
1. Delete all seed data
2. Create your actual products
3. Set up your real users
4. Configure your store information
5. Start processing real transactions

The seeding system makes it easy to get started and test the application with realistic data!
