// src/hooks/useCurrency.ts - React hook for real currency conversion
import { useState, useEffect } from 'react';
import { currencyFormatter, CurrencyCode, Currency, convertCurrency } from '@/lib/currency';

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

  const format = (amountInUSD: number, options?: { showSymbol?: boolean; showCode?: boolean }) => {
    return currencyFormatter.format(amountInUSD, options);
  };

  const parse = (formatted: string) => {
    return currencyFormatter.parse(formatted);
  };

  return {
    currency,
    changeCurrency,
    format,
    parse,
    convert: convertCurrency,
    symbol: currency.symbol,
    code: currency.code,
    availableCurrencies: currencyFormatter.getAvailableCurrencies(),
  };
}
