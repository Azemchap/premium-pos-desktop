// Real Currency Converter with Exchange Rates

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'XAF' | 'NGN' | 'CAD' | 'JPY' | 'CNY';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number; // Exchange rate relative to USD (1 USD = X currency)
  decimals: number;
}

// Real exchange rates (Base: USD = 1.0)
// Updated: January 2025
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rate: 1.0,
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 0.92, // 1 USD = 0.92 EUR
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rate: 0.79, // 1 USD = 0.79 GBP
    decimals: 2,
  },
  XAF: {
    code: 'XAF',
    symbol: 'F',
    name: 'Central African CFA Franc',
    rate: 605.0, // 1 USD = 605 XAF (approx)
    decimals: 0, // XAF doesn't use decimals
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    rate: 850.0, // 1 USD = 850 NGN (approx)
    decimals: 2,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rate: 1.35, // 1 USD = 1.35 CAD
    decimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rate: 145.0, // 1 USD = 145 JPY
    decimals: 0,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    rate: 7.2, // 1 USD = 7.2 CNY
    decimals: 2,
  },
};

class CurrencyFormatter {
  private currentCurrency: Currency;
  // private baseCurrency: Currency = CURRENCIES.USD; // All prices stored in USD

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
   * Convert amount from base currency (USD) to current display currency
   */
  convertFromBase(amountInUSD: number): number {
    return amountInUSD * this.currentCurrency.rate;
  }

  /**
   * Convert amount from current display currency to base currency (USD)
   */
  convertToBase(amount: number): number {
    return amount / this.currentCurrency.rate;
  }

  /**
   * Convert between any two currencies
   */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount;
    
    const fromCurrency = CURRENCIES[from];
    const toCurrency = CURRENCIES[to];
    
    // Convert to USD first, then to target currency
    const amountInUSD = amount / fromCurrency.rate;
    return amountInUSD * toCurrency.rate;
  }

  /**
   * Format amount with current currency
   * Assumes amount is in USD (base currency) and converts it
   */
  format(amountInUSD: number, options?: { showSymbol?: boolean; showCode?: boolean }): string {
    const { showSymbol = true, showCode = false } = options || {};
    
    // Convert from USD to current display currency
    const convertedAmount = this.convertFromBase(amountInUSD);
    const formatted = this.formatNumber(convertedAmount);
    
    let result = formatted;
    
    if (showSymbol) {
      if (this.currentCurrency.code === 'XAF') {
        // XAF: Amount first, then symbol (e.g., "10,000 FCFA")
        result = `${formatted} ${this.currentCurrency.symbol}`;
      } else {
        // Most currencies: Symbol first (e.g., "$100.00", "€92.00")
        result = `${this.currentCurrency.symbol}${formatted}`;
      }
    }
    
    if (showCode) {
      result = `${result} ${this.currentCurrency.code}`;
    }
    
    return result;
  }

  /**
   * Format number according to currency rules
   */
  private formatNumber(amount: number): string {
    const { decimals } = this.currentCurrency;
    
    // Round to appropriate decimal places
    const rounded = Number(amount.toFixed(decimals));
    
    // Split into integer and decimal parts
    const parts = rounded.toFixed(decimals).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands separators
    const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Combine with decimal part if applicable
    if (decimals > 0) {
      return `${withSeparators}.${decimalPart}`;
    }
    
    return withSeparators;
  }

  /**
   * Parse formatted string back to number (in current currency)
   */
  parse(formattedAmount: string): number {
    // Remove currency symbols and code
    let cleaned = formattedAmount
      .replace(this.currentCurrency.symbol, '')
      .replace(this.currentCurrency.code, '')
      .trim();
    
    // Remove thousand separators and parse
    cleaned = cleaned.replace(/,/g, '');
    
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
  formatInput(amountInUSD: number): string {
    return this.format(amountInUSD, { showSymbol: false });
  }

  /**
   * Format for receipts and documents
   */
  formatReceipt(amountInUSD: number): string {
    return this.format(amountInUSD, { showSymbol: true, showCode: false });
  }
}

// Export singleton instance
export const currencyFormatter = new CurrencyFormatter();

// Export helper functions for easy use
export const formatCurrency = (amountInUSD: number, options?: { showSymbol?: boolean; showCode?: boolean }) => 
  currencyFormatter.format(amountInUSD, options);

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

export const convertCurrency = (amount: number, from: CurrencyCode, to: CurrencyCode) =>
  currencyFormatter.convert(amount, from, to);
