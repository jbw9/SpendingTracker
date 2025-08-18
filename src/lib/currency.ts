export type Currency = 'USD' | 'IDR' | 'SGD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    decimals: 0,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimals: 2,
  },
};

export const DEFAULT_CURRENCY: Currency = 'USD';

export const CURRENCY_STORAGE_KEY = 'spending_tracker_currency';

export function formatCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const currencyInfo = CURRENCIES[currency];
  
  if (currency === 'IDR') {
    // For IDR, format with thousands separator but no decimals
    const rounded = Math.round(amount);
    const formatted = rounded.toLocaleString('id-ID');
    return `${currencyInfo.symbol} ${formatted}`;
  }
  
  // For USD and SGD, use standard decimal formatting with proper rounding
  const rounded = Math.round(amount * 100) / 100; // Round to 2 decimal places
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: currencyInfo.decimals,
    maximumFractionDigits: currencyInfo.decimals,
  });
  
  return `${currencyInfo.symbol}${formatted}`;
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES[currency].symbol;
}

export function getCurrencyName(currency: Currency): string {
  return CURRENCIES[currency].name;
}

export function getUserCurrency(): Currency {
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return (stored as Currency) || DEFAULT_CURRENCY;
}

export function setUserCurrency(currency: Currency): void {
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
}

export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES);
}