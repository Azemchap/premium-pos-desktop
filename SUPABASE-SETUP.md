# QorBooks - Supabase Database Setup Guide

This guide will help you set up your Supabase database for QorBooks with all required tables, indexes, and realtime subscriptions.

## Quick Setup (Recommended)

### Option 1: Manual Setup via Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Setup Script**
   - Open `supabase-setup.sql` in your code editor
   - Copy all the contents
   - Paste into the Supabase SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Enable Realtime Replication**
   - Go to: **Database → Replication**
   - Find the publication `supabase_realtime`
   - Click to enable replication for these tables:
     - ✅ products
     - ✅ inventory
     - ✅ customers
     - ✅ sales
     - ✅ purchase_orders
     - ✅ expenses

5. **Verify Setup**
   - Go to **Database → Tables**
   - You should see all tables listed
   - Check that `updated_at` triggers are working

### Option 2: Automated Setup via Script

```bash
# Make the script executable
chmod +x setup-supabase.sh

# Run the setup script
./setup-supabase.sh
```

The script will guide you through the process.

## What Gets Created

### Tables (26 total)

**Core Business:**
- `store_config` - Store/business settings
- `users` - User authentication and roles
- `products` - Product catalog
- `inventory` - Stock tracking
- `inventory_movements` - Stock history
- `sales` - Sales transactions
- `sale_items` - Individual sale line items
- `returns` - Return/refund transactions
- `return_items` - Individual return line items

**Master Data:**
- `categories` - Product categories
- `brands` - Product brands
- `units` - Units of measurement

**Customers & CRM:**
- `customers` - Customer information
- `suppliers` - Supplier information

**Purchasing:**
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items

**Finance:**
- `expenses` - Business expenses
- `shifts` - Cash register shifts
- `receipt_templates` - Receipt formatting

**HR & Staff:**
- `employees` - Employee records
- `time_tracking` - Clock in/out tracking

**Marketing:**
- `promotions` - Discounts and promotions
- `appointments` - Service appointments

**System:**
- `notifications` - In-app notifications

### Indexes

Over **50 indexes** are created for optimal query performance on:
- Foreign keys
- Frequently searched columns (SKU, barcode, email, phone)
- Date/time columns for reporting
- Status and type columns for filtering
- `updated_at` columns for selective sync

### Triggers

Automatic `updated_at` timestamp triggers on all tables with an `updated_at` column.

### Row Level Security (RLS)

- RLS is enabled on all tables
- Default policy: "Allow all" (for development)
- **Production:** Customize policies based on user roles

## Configuration

### Update Your App Configuration

The app is already configured with your credentials from:
```typescript
// src/lib/supabase.ts
const supabaseUrl = 'https://lbgboyuytouaxnhuqhrv.supabase.co';
const supabaseKey = 'sb_publishable_aw_T4GuVZQQIO7tZPH5r6Q_O9kQ0zkZ';
```

### Verify Connection

After setup, test the connection:
```bash
# Start the app
pnpm tauri:dev

# Check the console for:
# ✅ Subscribed to realtime updates for products
# ✅ Subscribed to realtime updates for customers
# etc.
```

## Enable Realtime (Important!)

For live sync to work, you **must** enable realtime replication:

1. Go to **Database → Replication** in Supabase dashboard
2. Click on `supabase_realtime` publication
3. Check these tables:
   ```
   ☐ products
   ☐ inventory
   ☐ customers
   ☐ sales
   ☐ purchase_orders
   ☐ expenses
   ```
4. Click "Save"

### Verify Realtime is Working

```bash
# In browser console, you should see:
✅ Subscribed to realtime updates for products
✅ Subscribed to realtime updates for customers
✅ Subscribed to realtime updates for sales
# ... etc
```

## Data Migration

### From Local SQLite to Supabase

If you have existing local data you want to migrate:

1. **Export from SQLite:**
   ```bash
   # The app stores data in:
   # Linux: ~/.local/share/com.qorbooks.app/
   # Mac: ~/Library/Application Support/com.qorbooks.app/
   # Windows: %APPDATA%\com.qorbooks.app\
   ```

2. **Convert and Import:**
   - Use the sync feature in the app
   - Or manually export/import specific tables

3. **Automatic Sync:**
   - Just start the app while online
   - Click the sync indicator in the header
   - Data will sync automatically

## Troubleshooting

### Tables Not Creating

**Problem:** SQL script fails
**Solution:**
- Check for syntax errors in the SQL editor
- Ensure you have proper permissions
- Try running sections individually

### Realtime Not Working

**Problem:** Changes not syncing in realtime
**Solution:**
- Verify replication is enabled (Database → Replication)
- Check browser console for connection errors
- Ensure RLS policies allow your operations

### Sync Failing

**Problem:** "Failed to sync data"
**Solution:**
- Check Supabase project is online
- Verify API keys are correct
- Check RLS policies aren't blocking access
- Review browser console for detailed errors

### Permission Denied

**Problem:** "permission denied for table"
**Solution:**
- Check RLS policies
- Verify you're using the correct API key
- For development, the "Allow all" policies should work

## Production Considerations

### Security

1. **Update RLS Policies:**
   ```sql
   -- Example: Only allow users to see their own data
   CREATE POLICY "Users see own data" ON sales
   FOR SELECT USING (cashier_id = auth.uid());
   ```

2. **Use Service Role Key Carefully:**
   - Never expose service role key in frontend
   - Use for backend/admin operations only

3. **Enable MFA:**
   - For your Supabase account
   - For admin users in the app

### Performance

1. **Monitor Database Size:**
   - Supabase free tier: 500 MB
   - Plan upgrades as needed

2. **Optimize Queries:**
   - Use indexes (already created)
   - Implement pagination for large datasets

3. **Archive Old Data:**
   - Move old transactions to archive tables
   - Keep active dataset small

### Backup

1. **Enable Automatic Backups:**
   - Go to: Database → Backups
   - Enable daily backups (paid plans)

2. **Manual Exports:**
   - Regular SQL exports
   - Store in secure location

## Support

### Resources

- [Supabase Documentation](https://supabase.com/docs)
- [QorBooks GitHub Issues](https://github.com/yourrepo/issues)
- [Supabase Discord](https://discord.supabase.com)

### Common SQL Queries

**Check table sizes:**
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Check active realtime subscriptions:**
```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**View recent changes:**
```sql
SELECT tablename, last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY last_value DESC
LIMIT 10;
```

## Next Steps

After setup is complete:

1. ✅ Test the app sync functionality
2. ✅ Add some test data
3. ✅ Verify realtime updates work
4. ✅ Test offline → online sync
5. ✅ Configure backup strategy
6. ✅ Customize RLS policies for production

---

**Setup Complete!** 🎉

Your QorBooks database is now fully configured and ready to use with realtime sync, conflict resolution, and selective updates.
