# 🎨 Premium Design System Guide

## Overview
This document outlines the comprehensive design system used throughout the Premium POS Desktop application. All pages and components follow these consistent patterns to deliver a world-class, professional user experience.

## Design Philosophy

### Core Principles
1. **Consistency** - Unified visual language across all pages
2. **Clarity** - Clear hierarchy and intuitive interactions
3. **Responsiveness** - Optimized for mobile, tablet, and desktop
4. **Performance** - Smooth animations and fast load times
5. **Accessibility** - High contrast and readable typography

---

## 🎯 Design Tokens

### Gradients
```typescript
gradients: {
  header: "from-primary/10 via-primary/5 to-background",
  card: "from-card to-card/50",
  cardAlt: "from-muted/30 to-muted/10",
  primary: "from-primary to-primary/70",
  subtle: "from-muted/50 to-muted/30",
  total: "from-primary/10 to-primary/5",
}
```

### Borders
- **Default**: `border border-border/50`
- **Strong**: `border-2 border-border/50`
- **Primary**: `border-2 border-primary/20`
- **Hover**: `hover:border-primary/50`

### Shadows
- **Small**: `shadow-sm`
- **Medium**: `shadow-md`
- **Large**: `shadow-lg`
- **XL**: `shadow-xl`
- **2XL**: `shadow-2xl`
- **Hover**: `hover:shadow-xl`

### Rounded Corners
- **Small**: `rounded-lg`
- **Medium**: `rounded-xl`
- **Large**: `rounded-2xl`
- **Full**: `rounded-full`

### Transitions
- **Default**: `transition-all duration-300`
- **Fast**: `transition-all duration-200`
- **Slow**: `transition-all duration-500`

---

## 📐 Component Patterns

### 1. Page Headers
Use the `PageHeader` component for consistent page titles:

```tsx
<PageHeader
  icon={Package}
  title="Products"
  subtitle="Manage your product catalog and pricing"
  badge={{ text: "1,234 items", variant: "secondary" }}
  actions={
    <Button onClick={handleAction}>
      <Plus className="w-4 h-4 mr-2" />
      Add Product
    </Button>
  }
/>
```

**Features:**
- Gradient background with animated blur orbs
- Icon badge with gradient background
- Responsive title sizing
- Optional badge and action buttons
- Subtitle support

---

### 2. Data Tables
Use the `DataTable` component for responsive, feature-rich tables:

```tsx
<DataTable
  data={products}
  columns={[
    { key: "name", label: "Product", render: (item) => <div>{item.name}</div> },
    { key: "sku", label: "SKU", mobileHidden: true },
    { key: "price", label: "Price", tabletHidden: true },
  ]}
  keyExtractor={(item) => item.id}
  isLoading={loading}
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
  onRowClick={handleRowClick}
/>
```

**Features:**
- Responsive column visibility (`mobileHidden`, `tabletHidden`)
- Built-in pagination
- Loading skeletons
- Empty states
- Row hover effects
- Click handlers
- Custom cell rendering

---

### 3. Responsive Columns

**Desktop (1024px+):**
- Show all relevant columns
- Full data display
- Comfortable spacing

**Tablet (768px - 1023px):**
- Hide less critical columns
- Maintain readability
- Moderate spacing

**Mobile (< 768px):**
- Show only essential columns (typically 2-3)
- Stack information vertically when needed
- Large touch targets

**Example Column Configuration:**
```tsx
columns: [
  { key: "name", label: "Name" }, // Always visible
  { key: "sku", label: "SKU", mobileHidden: true }, // Hidden on mobile
  { key: "category", label: "Category", tabletHidden: true }, // Hidden on tablet & mobile
  { key: "price", label: "Price" }, // Always visible
  { key: "actions", label: "Actions" }, // Always visible
]
```

---

## 🎨 Page Structure

### Standard Page Layout
```tsx
export default function PageName() {
  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        icon={IconComponent}
        title="Page Title"
        subtitle="Page description"
      />

      {/* 2. Statistics Cards (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats cards */}
      </div>

      {/* 3. Filters & Search */}
      <Card className="p-6">
        {/* Search and filter controls */}
      </Card>

      {/* 4. Data Table */}
      <DataTable
        data={data}
        columns={columns}
        // ...props
      />
    </div>
  );
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Mobile-First Approach
1. Design for mobile first
2. Progressively enhance for larger screens
3. Use responsive classes: `text-sm md:text-base lg:text-lg`
4. Stack layouts vertically on mobile: `flex-col md:flex-row`

### Touch Optimization
- Minimum touch target: 44x44px
- Adequate spacing between interactive elements
- Large, clear buttons
- Swipe-friendly interfaces

---

## 🎭 Animations

### Standard Transitions
```css
transition-all duration-300 /* Default smooth transition */
transition-all duration-200 /* Fast interactions */
hover:scale-105 /* Subtle hover scale */
active:scale-95 /* Press feedback */
```

### Loading States
- Use `Skeleton` components for content loading
- Animated blur orbs for decorative effects
- Spin animations for loaders
- Pulse effects for notifications

---

## 🌈 Color Usage

### Status Colors
- **Success**: Green (600 light, 400 dark)
- **Warning**: Yellow (600 light, 400 dark)
- **Error**: Red (600 light, 400 dark)
- **Info**: Blue (600 light, 400 dark)

### Status Badges
```tsx
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Neutral</Badge>
```

---

## 📊 Table Guidelines

### What to Show
**Always Display:**
- Primary identifier (name, ID)
- Key metrics (price, quantity, status)
- Actions column

**Show on Desktop Only:**
- Secondary details
- Timestamps
- Extended descriptions
- Multiple price points

**Show on Tablet:**
- Essential identifiers
- Primary metrics
- Actions

**Show on Mobile:**
- Name/primary field only
- Price or key metric
- Actions (as menu or buttons)

### Table Styling
```tsx
// Container
className="rounded-xl border-2 border-border/50 overflow-hidden bg-card shadow-lg"

// Header
className="bg-gradient-to-r from-muted/50 to-muted/30 border-b-2"

// Header Cell
className="px-6 py-4 text-sm font-semibold uppercase tracking-wider"

// Row
className="hover:bg-primary/5 transition-all duration-200"

// Cell
className="px-6 py-4 text-base"
```

---

## 🔧 Forms & Inputs

### Form Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-2">
    <Label htmlFor="field">Field Label *</Label>
    <Input
      id="field"
      placeholder="Enter value"
      className={errors.field ? "border-red-500" : ""}
    />
    {errors.field && (
      <p className="text-xs text-red-500">{errors.field}</p>
    )}
  </div>
</div>
```

### Input Styling
- 2-column layout on desktop, 1-column on mobile
- Clear labels with required indicators
- Inline validation messages
- Consistent spacing (gap-6)
- Focus states with ring effects

---

## 🎯 Modals & Dialogs

### Standard Modal Structure
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Modal description</DialogDescription>
    </DialogHeader>

    {/* Content */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form fields */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 📦 Cards

### Card Variants

**Default Card:**
```tsx
<Card className="p-6 shadow-lg">
  <CardContent>{/* content */}</CardContent>
</Card>
```

**Gradient Card:**
```tsx
<Card className="bg-gradient-to-br from-card to-card/50 border-2 shadow-xl">
  <CardContent>{/* content */}</CardContent>
</Card>
```

**Interactive Card:**
```tsx
<Card className="p-6 hover:shadow-2xl hover:border-primary/50 transition-all duration-300 cursor-pointer">
  <CardContent>{/* content */}</CardContent>
</Card>
```

---

## 🚀 Performance

### Best Practices
1. **Lazy Loading** - Load images and components on demand
2. **Pagination** - Limit table rows (20-50 per page)
3. **Debouncing** - Delay search queries (300ms)
4. **Memoization** - Use `useMemo` for expensive calculations
5. **Virtual Scrolling** - For very long lists (1000+ items)

---

## ✅ Checklist for New Pages

- [ ] Use `PageHeader` component
- [ ] Implement responsive design (mobile-first)
- [ ] Use `DataTable` for tables with responsive columns
- [ ] Add loading states (skeletons)
- [ ] Add empty states with clear CTAs
- [ ] Include proper error handling
- [ ] Add appropriate spacing (space-y-6)
- [ ] Use consistent border styles (border-2)
- [ ] Apply gradient backgrounds where appropriate
- [ ] Add smooth transitions (duration-300)
- [ ] Test on mobile, tablet, and desktop
- [ ] Verify touch targets (min 44px)
- [ ] Check color contrast for accessibility
- [ ] Add proper TypeScript types
- [ ] Handle loading and error states

---

## 📝 Code Style

### TypeScript
- Use explicit types
- Avoid `any` type
- Use interfaces for objects
- Use type unions for variants

### React
- Use functional components
- Prefer hooks over class components
- Extract reusable logic into custom hooks
- Keep components focused and small

### CSS
- Use Tailwind utility classes
- Avoid custom CSS when possible
- Use responsive prefixes (md:, lg:)
- Follow mobile-first approach

---

## 🎊 Future Enhancements

### Planned Improvements
1. **Dark Mode** - Enhanced dark theme support
2. **Animations** - More micro-interactions
3. **Charts** - Premium chart designs
4. **Widgets** - Reusable dashboard widgets
5. **Themes** - Multiple color schemes
6. **Accessibility** - Enhanced ARIA support
7. **i18n** - Internationalization support

---

## 📞 Support

For questions or suggestions about the design system, consult this guide or review the `designSystem.ts` file for implementation details.

---

**Last Updated:** October 2024  
**Version:** 1.0.0  
**Author:** Premium POS Team
