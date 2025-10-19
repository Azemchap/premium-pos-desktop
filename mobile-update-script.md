# 📱 Mobile Update Script - Apply to All Pages

## 🎯 Strategy

Since you have **8,758 lines** of code across 10+ pages, use this systematic approach:

1. **Use VS Code Find & Replace** (Ctrl+Shift+H)
2. **Enable Regex** mode
3. **Apply these patterns in order**
4. **Test after each batch**

---

## 🔧 Step-by-Step Updates

### **STEP 1: Update All Spacing (Gaps)**

**Files:** All `src/pages/*.tsx`

```regex
Find:    className="([^"]*\s)gap-6(\s[^"]*)"
Replace: className="$1gap-2 sm:gap-4 md:gap-6$2"
```

```regex
Find:    className="([^"]*\s)gap-4(\s[^"]*)"
Replace: className="$1gap-1 sm:gap-2 md:gap-4$2"
```

```regex
Find:    className="([^"]*\s)gap-8(\s[^"]*)"
Replace: className="$1gap-3 sm:gap-4 md:gap-8$2"
```

---

### **STEP 2: Update Padding**

```regex
Find:    className="([^"]*\s)p-6(\s[^"]*)"
Replace: className="$1p-3 sm:p-4 md:p-6$2"
```

```regex
Find:    className="([^"]*\s)p-8(\s[^"]*)"
Replace: className="$1p-4 sm:p-6 md:p-8$2"
```

```regex
Find:    className="([^"]*\s)px-6(\s[^"]*)"
Replace: className="$1px-3 sm:px-4 md:px-6$2"
```

```regex
Find:    className="([^"]*\s)py-6(\s[^"]*)"
Replace: className="$1py-3 sm:py-4 md:py-6$2"
```

---

### **STEP 3: Update Text Sizes**

```regex
Find:    className="([^"]*\s)text-3xl(\s[^"]*)"
Replace: className="$1text-xl sm:text-2xl md:text-3xl$2"
```

```regex
Find:    className="([^"]*\s)text-2xl(\s[^"]*)"
Replace: className="$1text-lg sm:text-xl md:text-2xl$2"
```

```regex
Find:    className="([^"]*\s)text-4xl(\s[^"]*)"
Replace: className="$1text-2xl sm:text-3xl md:text-4xl$2"
```

---

### **STEP 4: Update Grid Columns**

```regex
Find:    className="([^"]*\s)grid-cols-4(\s[^"]*)"
Replace: className="$1grid-cols-2 sm:grid-cols-3 md:grid-cols-4$2"
```

```regex
Find:    className="([^"]*\s)grid-cols-3(\s[^"]*)"
Replace: className="$1grid-cols-1 sm:grid-cols-2 md:grid-cols-3$2"
```

```regex
Find:    className="([^"]*\s)grid-cols-2(\s[^"]*)"
Replace: className="$1grid-cols-1 sm:grid-cols-2$2"
```

---

### **STEP 5: Update Space-Y/Space-X**

```regex
Find:    className="([^"]*\s)space-y-6(\s[^"]*)"
Replace: className="$1space-y-3 sm:space-y-4 md:space-y-6$2"
```

```regex
Find:    className="([^"]*\s)space-y-4(\s[^"]*)"
Replace: className="$1space-y-2 sm:space-y-3 md:space-y-4$2"
```

```regex
Find:    className="([^"]*\s)space-x-4(\s[^"]*)"
Replace: className="$1space-x-1 sm:space-x-2 md:space-x-4$2"
```

---

### **STEP 6: Update Margins**

```regex
Find:    className="([^"]*\s)m-6(\s[^"]*)"
Replace: className="$1m-3 sm:m-4 md:m-6$2"
```

```regex
Find:    className="([^"]*\s)mb-6(\s[^"]*)"
Replace: className="$1mb-3 sm:mb-4 md:mb-6$2"
```

```regex
Find:    className="([^"]*\s)mt-6(\s[^"]*)"
Replace: className="$1mt-3 sm:mt-4 md:mt-6$2"
```

---

## 📋 Manual Updates

After bulk regex updates, manually fix:

### **1. Add Haptic Imports**

Add to **every page**:

```tsx
import { hapticFeedback } from "@/lib/mobile-utils";
```

### **2. Wrap Tables for Mobile Scroll**

Find all `<Table>` components and wrap:

```tsx
<div className="overflow-x-auto -mx-3 sm:mx-0">
  <Table className="min-w-full">
    {/* existing content */}
  </Table>
</div>
```

### **3. Update Form Inputs**

Find inputs and add mobile keyboard types:

```tsx
// Email
<Input 
  type="email"
  inputMode="email"
  className="text-base"  // Prevents zoom on iOS
/>

// Phone
<Input 
  type="tel"
  inputMode="tel"
  className="text-base"
/>

// Numbers
<Input 
  type="number"
  inputMode="decimal"
  className="text-base"
/>
```

### **4. Add Touch Targets to Buttons**

Find primary action buttons:

```tsx
<Button 
  className="touch-target"
  onClick={async () => {
    await hapticFeedback('light');
    // existing onClick code
  }}
>
```

### **5. Update Icon Sizes**

```tsx
// Before
<Icon className="w-6 h-6" />

// After
<Icon className="w-5 h-5 md:w-6 md:h-6" />
```

---

## 📱 Page-Specific Fixes

### **Sales.tsx**
1. Product search results - make cards smaller on mobile
2. Cart items - reduce padding
3. Payment methods - stack vertically on mobile
4. Customer form - add `inputMode` attributes

### **Inventory.tsx**
1. Filter buttons - wrap on mobile
2. Action buttons - stack on mobile
3. Quantity inputs - add `inputMode="numeric"`
4. Table - make horizontally scrollable

### **Products.tsx**
1. Product grid - 1 column on mobile, 2 on tablet, 4 on desktop
2. Product cards - reduce padding
3. Add product form - optimize inputs

### **SalesRecords.tsx**
1. Date filters - stack on mobile
2. Table - horizontal scroll
3. Stats cards - 2 columns mobile, 4 desktop

### **Settings.tsx**
1. Tab list - horizontal scroll on mobile
2. Forms - full width inputs
3. Toggles - larger touch targets

### **Profile.tsx**
1. Avatar upload - larger button on mobile
2. Form - stack fields on mobile
3. Password fields - show/hide toggle

---

## ✅ Testing Checklist

After updates, test each page:

- [ ] No horizontal scroll (except tables)
- [ ] All buttons minimum 44px height
- [ ] Text readable (not too small)
- [ ] Forms work with mobile keyboards
- [ ] Cards have appropriate padding
- [ ] Icons properly sized
- [ ] Grids respond correctly

---

## 🚀 Quick Commands

### **1. Update All Pages at Once**

```bash
# Backup first!
git add .
git commit -m "Before mobile optimization"

# Then apply regex patterns
```

### **2. Test on Mobile**

```bash
# After updates
cargo tauri android dev
```

---

## 💡 Pro Tips

1. **Work in Batches:** Update 2-3 pages at a time
2. **Test Frequently:** Build Android after each batch
3. **Git Commits:** Commit after each page
4. **Revert if Needed:** `git revert` if something breaks
5. **Use Preview:** VS Code's Replace Preview is your friend

---

## 📊 Progress Tracker

Track your updates:

```
[ ] Sales.tsx (Priority 1)
[ ] Inventory.tsx (Priority 1)  
[ ] Dashboard.tsx (mostly done via layout)
[ ] SalesRecords.tsx
[ ] Products.tsx
[ ] Users.tsx
[ ] Settings.tsx
[ ] Profile.tsx
[ ] Reports.tsx
[ ] MasterData.tsx
```

---

## 🎯 Estimated Time

- Regex replacements: **10 minutes**
- Manual fixes (tables, forms): **30 minutes**
- Haptics (all buttons): **20 minutes**
- Testing: **30 minutes**

**Total: ~90 minutes** for complete mobile optimization

---

## ❓ Need Help?

If a pattern doesn't work:
1. Check VS Code regex is enabled
2. Try without capturing groups
3. Do manual find-replace for that section
4. Test in small batches

Let's start! Apply Step 1 now 🚀
