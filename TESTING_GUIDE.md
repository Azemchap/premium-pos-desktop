# 🧪 TESTING GUIDE - Inventory System

## 🚀 STEP-BY-STEP TESTING

### Prerequisites
```bash
pnpm tauri:dev
```
Login with: admin / admin123

---

## TEST 1: Product Creation & Auto-Inventory

### Steps:
1. Navigate to **Products** page
2. Click **Add Product** button
3. Fill in the form:
   - Name: "Test Product 1"
   - SKU: "TEST-001"
   - Barcode: (leave empty) ✅
   - Category: Select from dropdown
   - Brand: Select from dropdown
   - Selling Price: 100.00
   - Cost Price: 50.00
   - Unit: Each
4. Click **Save**

### Expected Result:
✅ Success toast: "Product created successfully"
✅ Product appears in Products table
✅ Can create multiple products without barcode

### Verify:
1. Go to **Inventory** page
2. Search for "Test Product 1"
3. ✅ Should see product with 0 stock
4. ✅ Status shows "Out of Stock"

---

## TEST 2: Receive Stock

### Steps:
1. On **Inventory** page
2. Find "Test Product 1"
3. Click **⋮** (more actions) → **Receive Stock**
4. Fill in dialog:
   - Quantity: 100
   - Cost Price: 50.00
   - Supplier: "Test Supplier Co."
   - Reference: "PO-12345"
   - Notes: "Initial stock receipt"
5. Click **Receive Stock**

### Expected Result:
✅ Success toast: "Received 100 units of Test Product 1"
✅ Current Stock shows: 100
✅ Available shows: 100
✅ Status changes to "In Stock"

### Verify:
1. Click **Movement History** tab
2. ✅ Should see movement: +100 (receipt)
3. ✅ Shows supplier info in notes

---

## TEST 3: Make a Sale

### Steps:
1. Navigate to **Sales** page
2. Search for "Test Product 1"
3. ✅ Should appear in products list
4. Click the product card to add to cart
5. ✅ Cart should show 1 item
6. Click **Proceed to Payment**
7. Select payment method: Cash
8. Amount received: 100.00
9. Click **Complete Sale**

### Expected Result:
✅ Success toast: "Sale completed"
✅ Receipt auto-prints
✅ Completion dialog shows

### Verify:
1. Go back to **Inventory** page
2. Find "Test Product 1"
3. ✅ Current Stock should be: 99
4. ✅ Available should be: 99
5. Click **Movement History** tab
6. ✅ Should see: +100 (receipt) and -1 (sale)

---

## TEST 4: Stock Adjustment

### Steps:
1. On **Inventory** page
2. Find "Test Product 1"
3. Click **⋮** → **Adjust Stock**
4. Select adjustment type: **Remove Stock**
5. Quantity: 5
6. Reason: "Damaged"
7. Notes: "Water damage during storage"
8. Click **Adjust Stock**

### Expected Result:
✅ Success toast: "Removed 5 units"
✅ Current Stock: 94
✅ Available: 94

### Verify Movement:
1. Movement History tab
2. ✅ See: receipt (+100), sale (-1), adjustment (-5)

---

## TEST 5: Stock Take (Reconciliation)

### Steps:
1. Imagine physical count finds only 90 units
2. On **Inventory** page
3. Find "Test Product 1"
4. Click **⋮** → **Stock Take**
5. Dialog shows:
   - System Count: 94
   - Difference: (will calculate)
6. Enter Actual Count: 90
7. ✅ Difference shows: -4 (in red)
8. Notes: "4 units missing during physical count"
9. Click **Complete Stock Take**

### Expected Result:
✅ Success toast: "Stock take completed. Difference: -4 units"
✅ Current Stock updated to: 90
✅ Available updated to: 90

### Verify:
1. Movement History
2. ✅ See stock_take movement (-4)
3. ✅ Notes explain the discrepancy

---

## TEST 6: Stock Reservation

### Steps:
1. On **Inventory** page
2. Find "Test Product 1" (should have 90 available)
3. Click **⋮** → **Reserve Stock**
4. Dialog shows:
   - Available: 90
   - Already Reserved: 0
5. Quantity to Reserve: 20
6. Notes: "Customer order #12345"
7. Click **Reserve Stock**

### Expected Result:
✅ Success toast: "Reserved 20 units"
✅ Current Stock: 90 (unchanged)
✅ Reserved: 20 (new!)
✅ Available: 70 (reduced!)

### Verify Sales Page:
1. Go to **Sales** page
2. Try to add "Test Product 1" to cart
3. Try to add 75 units
4. ✅ Should ERROR: "Only 70 available"
5. Can only add up to 70 units (not 90!)

---

## TEST 7: Multiple Products Without Barcode

### Steps:
1. **Products** page
2. Create "Product A" - no barcode
3. Create "Product B" - no barcode
4. Create "Product C" - no barcode

### Expected Result:
✅ All 3 products created successfully
✅ No barcode UNIQUE constraint error
✅ All appear in Inventory with 0 stock

---

## TEST 8: Complete Product Lifecycle

### Steps:
1. **Create** "Widget X"
   → Inventory: 0 stock

2. **Receive** 200 units @ $25 each
   → Inventory: 200 available

3. **Reserve** 50 units for order
   → Available: 150

4. **Sell** 10 units
   → Available: 140

5. **Adjust** -3 (damaged)
   → Available: 137

6. **Stock Take** actual count: 135
   → System: 135 (difference: -2)

7. **View History**
   → See all 5 movements!

---

## ✅ EXPECTED OUTCOMES

After all tests, you should have:

1. ✅ Multiple products in system
2. ✅ Inventory records for all
3. ✅ Accurate stock levels
4. ✅ Complete movement history
5. ✅ Reservations working
6. ✅ Sales reducing inventory
7. ✅ No overselling
8. ✅ Audit trail complete

---

## 🎯 KEY VALIDATIONS

### Sales Page:
- ✅ Only shows products with available_stock > 0
- ✅ Can't add more than available to cart
- ✅ Accounts for items already in cart
- ✅ Better error messages

### Inventory Page:
- ✅ Shows ALL products (including 0 stock)
- ✅ 5 action dialogs working
- ✅ Statistics update in real-time
- ✅ Filters work correctly
- ✅ Movement history accurate

### Backend:
- ✅ Auto-creates inventory on product creation
- ✅ All stock operations atomic (transactions)
- ✅ Movement tracking complete
- ✅ Validates stock levels
- ✅ Prevents negative stock

---

## 🐛 TROUBLESHOOTING

### "Can't find product in inventory"
→ Refresh the page
→ Check "Out of Stock" filter
→ Search by SKU

### "Can't add to cart - out of stock"
→ Product has 0 stock
→ Go to Inventory → Receive Stock first

### "Can't receive stock"
→ Check quantity > 0
→ Verify user permissions

### "Stock take not updating"
→ Ensure actual count is different from system
→ Check for error toasts

---

## 📈 BEST PRACTICES

1. **Daily:**
   - Check low stock alerts
   - Process stock receipts
   - Review sales movements

2. **Weekly:**
   - Adjust for damages
   - Process reservations
   - Review movement history

3. **Monthly:**
   - Perform full stock take
   - Reconcile discrepancies
   - Update reorder levels

4. **Always:**
   - Add notes to movements
   - Track supplier info
   - Document adjustments

---

## 🏆 SUCCESS CRITERIA

Your inventory system is working if:

✅ Products auto-appear in Inventory
✅ Can receive stock without errors
✅ Sales reduce inventory correctly
✅ Can't oversell available stock
✅ Reservations prevent overselling
✅ Stock takes reconcile differences
✅ Movement history is complete
✅ No barcode errors
✅ Statistics are accurate

---

**Happy Testing! Your inventory system is now professional-grade! 🎉**

