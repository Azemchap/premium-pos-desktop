// src/hooks/useCurrency.ts - React hook for currency management
import { useState, useEffect } from 'react';
import { currencyFormatter, CurrencyCode, Currency } from '@/lib/currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(currencyFormatter.getCurrency());

  useEffect(() => {
    // Listen for currency changes
    const handleCurrencyChange = (event: CustomEvent<CurrencyCode>) => {
      setCurrencyState(currencyFormatter.getCurrency());
    };

    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  const changeCurrency = (code: CurrencyCode) => {
    currencyFormatter.setCurrency(code);
    setCurrencyState(currencyFormatter.getCurrency());
  };

  const format = (amount: number, options?: { showSymbol?: boolean; showCode?: boolean }) => {
    return currencyFormatter.format(amount, options);
  };

  const parse = (formatted: string) => {
    return currencyFormatter.parse(formatted);
  };

  return {
    currency,
    changeCurrency,
    format,
    parse,
    symbol: currency.symbol,
    code: currency.code,
    availableCurrencies: currencyFormatter.getAvailableCurrencies(),
  };
}
