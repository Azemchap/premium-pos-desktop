/**
 * Financial calculation utilities - Professional grade
 * Uses arbitrary-precision arithmetic to prevent rounding errors
 * All monetary calculations should use these utilities
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9,
});

/**
 * Create a Decimal from various input types
 */
export function decimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Add two or more monetary values with precision
 */
export function add(...values: (string | number | Decimal)[]): Decimal {
  return values.reduce<Decimal>((sum, val) => sum.plus(val), decimal(0));
}

/**
 * Subtract monetary values with precision
 */
export function subtract(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return decimal(a).minus(b);
}

/**
 * Multiply monetary values with precision
 */
export function multiply(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return decimal(a).times(b);
}

/**
 * Divide monetary values with precision
 */
export function divide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return decimal(a).dividedBy(b);
}

/**
 * Calculate percentage of a value
 * @param value - The base value
 * @param percentage - Percentage (e.g., 15 for 15%)
 */
export function percentage(value: string | number | Decimal, percentage: string | number | Decimal): Decimal {
  return decimal(value).times(percentage).dividedBy(100);
}

/**
 * Apply tax to a subtotal
 * @param subtotal - The pre-tax amount
 * @param taxRate - Tax rate as decimal (e.g., 0.15 for 15%)
 */
export function applyTax(subtotal: string | number | Decimal, taxRate: string | number | Decimal): Decimal {
  return decimal(subtotal).times(decimal(1).plus(taxRate));
}

/**
 * Calculate tax amount from subtotal
 * @param subtotal - The pre-tax amount
 * @param taxRate - Tax rate as decimal (e.g., 0.15 for 15%)
 */
export function calculateTax(subtotal: string | number | Decimal, taxRate: string | number | Decimal): Decimal {
  return decimal(subtotal).times(taxRate);
}

/**
 * Apply discount to a value
 * @param value - The original value
 * @param discountPercentage - Discount percentage (e.g., 10 for 10% off)
 */
export function applyDiscount(value: string | number | Decimal, discountPercentage: string | number | Decimal): Decimal {
  const discountAmount = percentage(value, discountPercentage);
  return decimal(value).minus(discountAmount);
}

/**
 * Calculate discount amount
 * @param value - The original value
 * @param discountPercentage - Discount percentage (e.g., 10 for 10% off)
 */
export function calculateDiscount(value: string | number | Decimal, discountPercentage: string | number | Decimal): Decimal {
  return percentage(value, discountPercentage);
}

/**
 * Round to 2 decimal places (for display)
 */
export function toMoney(value: string | number | Decimal): string {
  return decimal(value).toFixed(2);
}

/**
 * Round to specified decimal places
 */
export function toFixed(value: string | number | Decimal, decimals: number = 2): string {
  return decimal(value).toFixed(decimals);
}

/**
 * Convert to number (use carefully - may lose precision)
 */
export function toNumber(value: string | number | Decimal): number {
  return decimal(value).toNumber();
}

/**
 * Format as currency string
 * @param value - The monetary value
 * @param currencySymbol - Currency symbol (default: $)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(
  value: string | number | Decimal,
  currencySymbol: string = '$',
  decimals: number = 2
): string {
  const formatted = decimal(value).toFixed(decimals);
  const [integer, fraction] = formatted.split('.');
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol}${withCommas}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Calculate line item total (quantity × price)
 */
export function lineItemTotal(quantity: string | number | Decimal, price: string | number | Decimal): Decimal {
  return multiply(quantity, price);
}

/**
 * Calculate cart subtotal from line items
 */
export function cartSubtotal(items: Array<{ quantity: string | number; price: string | number }>): Decimal {
  return items.reduce(
    (total, item) => total.plus(lineItemTotal(item.quantity, item.price)),
    decimal(0)
  );
}

/**
 * Calculate cart total with tax
 */
export function cartTotal(
  items: Array<{ quantity: string | number; price: string | number }>,
  taxRate: string | number | Decimal
): { subtotal: Decimal; tax: Decimal; total: Decimal } {
  const subtotal = cartSubtotal(items);
  const tax = calculateTax(subtotal, taxRate);
  const total = subtotal.plus(tax);

  return { subtotal, tax, total };
}

/**
 * Calculate cart total with discount and tax
 */
export function cartTotalWithDiscount(
  items: Array<{ quantity: string | number; price: string | number }>,
  discountPercentage: string | number | Decimal,
  taxRate: string | number | Decimal
): { subtotal: Decimal; discount: Decimal; discountedSubtotal: Decimal; tax: Decimal; total: Decimal } {
  const subtotal = cartSubtotal(items);
  const discount = calculateDiscount(subtotal, discountPercentage);
  const discountedSubtotal = subtotal.minus(discount);
  const tax = calculateTax(discountedSubtotal, taxRate);
  const total = discountedSubtotal.plus(tax);

  return { subtotal, discount, discountedSubtotal, tax, total };
}

/**
 * Compare two monetary values
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compare(a: string | number | Decimal, b: string | number | Decimal): number {
  return decimal(a).comparedTo(b);
}

/**
 * Check if value is greater than another
 */
export function greaterThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return decimal(a).greaterThan(b);
}

/**
 * Check if value is less than another
 */
export function lessThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return decimal(a).lessThan(b);
}

/**
 * Check if values are equal
 */
export function equals(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return decimal(a).equals(b);
}

/**
 * Get absolute value
 */
export function abs(value: string | number | Decimal): Decimal {
  return decimal(value).abs();
}

/**
 * Get maximum of multiple values
 */
export function max(...values: (string | number | Decimal)[]): Decimal {
  return Decimal.max(...values.map(v => decimal(v)));
}

/**
 * Get minimum of multiple values
 */
export function min(...values: (string | number | Decimal)[]): Decimal {
  return Decimal.min(...values.map(v => decimal(v)));
}

/**
 * Calculate profit margin percentage
 * @param cost - Cost price
 * @param sellingPrice - Selling price
 * @returns Profit margin as percentage
 */
export function profitMargin(cost: string | number | Decimal, sellingPrice: string | number | Decimal): Decimal {
  const profit = subtract(sellingPrice, cost);
  return divide(profit, sellingPrice).times(100);
}

/**
 * Calculate markup percentage
 * @param cost - Cost price
 * @param sellingPrice - Selling price
 * @returns Markup as percentage
 */
export function markup(cost: string | number | Decimal, sellingPrice: string | number | Decimal): Decimal {
  const profit = subtract(sellingPrice, cost);
  return divide(profit, cost).times(100);
}

/**
 * Calculate selling price from cost and desired margin
 * @param cost - Cost price
 * @param marginPercentage - Desired profit margin (e.g., 30 for 30%)
 */
export function sellingPriceFromMargin(cost: string | number | Decimal, marginPercentage: string | number | Decimal): Decimal {
  return divide(cost, subtract(100, marginPercentage).dividedBy(100));
}

/**
 * Calculate average
 */
export function average(...values: (string | number | Decimal)[]): Decimal {
  const sum = add(...values);
  return divide(sum, values.length);
}

/**
 * Ensure value is non-negative (clamp to 0)
 */
export function nonNegative(value: string | number | Decimal): Decimal {
  const val = decimal(value);
  return val.lessThan(0) ? decimal(0) : val;
}

/**
 * Round up to nearest cent
 */
export function ceilToCent(value: string | number | Decimal): Decimal {
  return decimal(value).toDecimalPlaces(2, Decimal.ROUND_UP);
}

/**
 * Round down to nearest cent
 */
export function floorToCent(value: string | number | Decimal): Decimal {
  return decimal(value).toDecimalPlaces(2, Decimal.ROUND_DOWN);
}

/**
 * Safe division that returns 0 if divisor is 0
 */
export function safeDivide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  const divisor = decimal(b);
  if (divisor.isZero()) {
    return decimal(0);
  }
  return decimal(a).dividedBy(divisor);
}
