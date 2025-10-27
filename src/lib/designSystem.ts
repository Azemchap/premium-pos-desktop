/**
 * Premium Design System
 * Consistent design tokens and utilities for the entire application
 */

export const designTokens = {
  // Gradients
  gradients: {
    header: "from-primary/10 via-primary/5 to-background",
    card: "from-card to-card/50",
    cardAlt: "from-muted/30 to-muted/10",
    primary: "from-primary to-primary/70",
    subtle: "from-muted/50 to-muted/30",
    total: "from-primary/10 to-primary/5",
  },

  // Borders
  borders: {
    default: "border border-border/50",
    strong: "border-2 border-border/50",
    primary: "border-2 border-primary/20",
    hover: "hover:border-primary/50",
  },

  // Shadows
  shadows: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    "2xl": "shadow-2xl",
    hover: "hover:shadow-xl",
  },

  // Rounded corners
  rounded: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },

  // Transitions
  transitions: {
    default: "transition-all duration-300",
    fast: "transition-all duration-200",
    slow: "transition-all duration-500",
  },

  // Spacing
  spacing: {
    card: "p-6",
    cardSm: "p-4",
    cardLg: "p-8",
    section: "space-y-6",
    sectionLg: "space-y-8",
  },

  // Typography
  typography: {
    h1: "text-2xl md:text-3xl font-bold",
    h2: "text-xl md:text-2xl font-bold",
    h3: "text-lg md:text-xl font-semibold",
    body: "text-sm md:text-base",
    small: "text-xs md:text-sm",
    gradient: "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
  },

  // Interactive elements
  interactive: {
    hover: "hover:bg-primary/5 transition-all duration-200",
    active: "active:scale-95",
    focus: "focus:ring-2 focus:ring-primary/50 focus:outline-none",
  },

  // Table styles
  table: {
    container: "rounded-xl border-2 border-border/50 overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow duration-300",
    header: "bg-gradient-to-r from-muted/50 to-muted/30 border-b-2 border-border/50",
    headerCell: "px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-foreground uppercase tracking-wider",
    row: "hover:bg-primary/5 transition-all duration-200",
    cell: "px-4 md:px-6 py-4 text-sm md:text-base",
  },

  // Status colors
  status: {
    success: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    warning: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    error: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    info: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  },
};

/**
 * Utility function to combine class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Premium card wrapper classes
 */
export function cardClasses(variant: "default" | "gradient" | "outline" = "default"): string {
  const base = `${designTokens.rounded.md} ${designTokens.spacing.card} ${designTokens.shadows.lg} ${designTokens.transitions.default}`;
  
  switch (variant) {
    case "gradient":
      return cn(base, `bg-gradient-to-br ${designTokens.gradients.card} ${designTokens.borders.strong}`);
    case "outline":
      return cn(base, `bg-card ${designTokens.borders.strong}`);
    default:
      return cn(base, `bg-card ${designTokens.borders.default}`);
  }
}

/**
 * Button classes helper
 */
export function buttonClasses(variant: "primary" | "secondary" | "outline" = "primary"): string {
  const base = `${designTokens.rounded.sm} px-4 py-2 font-semibold ${designTokens.transitions.fast} ${designTokens.interactive.focus} ${designTokens.interactive.active}`;
  
  switch (variant) {
    case "primary":
      return cn(base, "bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg");
    case "secondary":
      return cn(base, "bg-muted text-foreground hover:bg-muted/80");
    case "outline":
      return cn(base, "border-2 border-primary text-primary hover:bg-primary/10");
    default:
      return base;
  }
}

/**
 * Status badge classes
 */
export function statusBadgeClasses(status: "success" | "warning" | "error" | "info" | "default" = "default"): string {
  const base = `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold`;
  
  switch (status) {
    case "success":
      return cn(base, designTokens.status.success);
    case "warning":
      return cn(base, designTokens.status.warning);
    case "error":
      return cn(base, designTokens.status.error);
    case "info":
      return cn(base, designTokens.status.info);
    default:
      return cn(base, "text-foreground bg-muted");
  }
}

/**
 * Responsive column visibility classes
 */
export const responsiveColumns = {
  mobileOnly: "md:hidden",
  tabletUp: "hidden md:table-cell",
  desktopOnly: "hidden lg:table-cell",
  hideOnMobile: "hidden md:table-cell",
  hideOnTablet: "hidden lg:table-cell",
};

/**
 * Empty state classes
 */
export function emptyStateClasses(): string {
  return cn(
    cardClasses("outline"),
    "text-center py-12 space-y-4"
  );
}

/**
 * Modal/Dialog classes
 */
export const modalClasses = {
  overlay: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50",
  content: cn(
    cardClasses("gradient"),
    "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto z-50"
  ),
  header: "border-b border-border/50 pb-4 mb-4",
  footer: "border-t border-border/50 pt-4 mt-4 flex justify-end gap-2",
};

/**
 * Form input classes
 */
export function inputClasses(): string {
  return cn(
    "w-full px-4 py-2",
    designTokens.rounded.sm,
    designTokens.borders.default,
    designTokens.transitions.fast,
    "bg-background",
    "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
  );
}
