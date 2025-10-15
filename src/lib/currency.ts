// src/lib/currency.ts - World-class currency formatting system

export type CurrencyCode = 'USD' | 'XAF';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    name: 'Central African CFA Franc',
    locale: 'fr-CM',
    decimalPlaces: 0, // CFA typically doesn't use decimals
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
};

class CurrencyFormatter {
  private currentCurrency: Currency;

  constructor() {
    // Load from localStorage or default to USD
    const savedCurrency = localStorage.getItem('app_currency') as CurrencyCode;
    this.currentCurrency = CURRENCIES[savedCurrency] || CURRENCIES.USD;
  }

  /**
   * Set the active currency for the entire app
   */
  setCurrency(code: CurrencyCode): void {
    this.currentCurrency = CURRENCIES[code];
    localStorage.setItem('app_currency', code);
    // Dispatch custom event for reactivity
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: code }));
  }

  /**
   * Get current currency
   */
  getCurrency(): Currency {
    return this.currentCurrency;
  }

  /**
   * Format amount with current currency
   */
  format(amount: number, options?: { showSymbol?: boolean; showCode?: boolean }): string {
    const { showSymbol = true, showCode = false } = options || {};
    
    const formatted = this.formatNumber(amount);
    
    if (this.currentCurrency.code === 'USD') {
      // USD: $1,234.56
      return showSymbol ? `${this.currentCurrency.symbol}${formatted}` : formatted;
    } else {
      // XAF: 1 234 FCFA (symbol after amount)
      const result = showSymbol ? `${formatted} ${this.currentCurrency.symbol}` : formatted;
      return showCode ? `${result} (${this.currentCurrency.code})` : result;
    }
  }

  /**
   * Format number according to currency rules
   */
  private formatNumber(amount: number): string {
    const { decimalPlaces, thousandsSeparator, decimalSeparator } = this.currentCurrency;
    
    // Round to appropriate decimal places
    const rounded = Number(amount.toFixed(decimalPlaces));
    
    // Split into integer and decimal parts
    const parts = rounded.toFixed(decimalPlaces).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands separators
    const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // Combine with decimal part if applicable
    if (decimalPlaces > 0) {
      return `${withSeparators}${decimalSeparator}${decimalPart}`;
    }
    
    return withSeparators;
  }

  /**
   * Parse formatted string back to number
   */
  parse(formattedAmount: string): number {
    const { thousandsSeparator, decimalSeparator } = this.currentCurrency;
    
    // Remove currency symbols and code
    let cleaned = formattedAmount
      .replace(this.currentCurrency.symbol, '')
      .replace(this.currentCurrency.code, '')
      .trim();
    
    // Replace separators
    cleaned = cleaned
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
    
    return parseFloat(cleaned) || 0;
  }

  /**
   * Get currency symbol
   */
  getSymbol(): string {
    return this.currentCurrency.symbol;
  }

  /**
   * Get currency code
   */
  getCode(): CurrencyCode {
    return this.currentCurrency.code;
  }

  /**
   * Get all available currencies
   */
  getAvailableCurrencies(): Currency[] {
    return Object.values(CURRENCIES);
  }

  /**
   * Format for display in inputs (without symbol)
   */
  formatInput(amount: number): string {
    return this.format(amount, { showSymbol: false });
  }

  /**
   * Format for receipts and documents
   */
  formatReceipt(amount: number): string {
    return this.format(amount, { showSymbol: true, showCode: false });
  }

  /**
   * Convert between currencies (placeholder for future implementation)
   */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    // TODO: Implement actual currency conversion with exchange rates
    // For now, just return the amount as-is
    if (from === to) return amount;
    
    // Placeholder conversion rates (should be dynamic in production)
    const rates: Record<string, number> = {
      'USD_XAF': 600, // 1 USD = 600 XAF (approximate)
      'XAF_USD': 1 / 600,
    };
    
    const key = `${from}_${to}`;
    return amount * (rates[key] || 1);
  }
}

// Export singleton instance
export const currencyFormatter = new CurrencyFormatter();

// Export helper functions for easy use
export const formatCurrency = (amount: number, options?: { showSymbol?: boolean; showCode?: boolean }) => 
  currencyFormatter.format(amount, options);

export const parseCurrency = (formatted: string) => 
  currencyFormatter.parse(formatted);

export const getCurrencySymbol = () => 
  currencyFormatter.getSymbol();

export const getCurrencyCode = () => 
  currencyFormatter.getCode();

export const setCurrency = (code: CurrencyCode) => 
  currencyFormatter.setCurrency(code);

export const getCurrentCurrency = () => 
  currencyFormatter.getCurrency();
