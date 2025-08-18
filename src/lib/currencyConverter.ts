import { type Currency } from './currency';

interface ExchangeRates {
  [key: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
  baseCurrency: string;
}

// Cache exchange rates for 1 hour (3600000 milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;
const STORAGE_KEY = 'exchange_rates_cache';

/**
 * Fetches exchange rates from fxratesapi.com API
 * Free API with no registration required
 */
async function fetchExchangeRates(baseCurrency: Currency): Promise<ExchangeRates> {
  const response = await fetch(
    `https://api.fxratesapi.com/latest?base=${baseCurrency}&currencies=USD,SGD,IDR`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Exchange rate API returned an error');
  }
  
  return data.rates;
}

/**
 * Gets cached exchange rates or fetches new ones if cache is expired
 */
async function getExchangeRates(baseCurrency: Currency): Promise<ExchangeRates> {
  try {
    // Check cache first
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const cachedData: CachedRates = JSON.parse(cached);
      const now = Date.now();
      
      // Use cache if it's fresh and for the same base currency
      if (
        now - cachedData.timestamp < CACHE_DURATION && 
        cachedData.baseCurrency === baseCurrency
      ) {
        return cachedData.rates;
      }
    }
    
    // Fetch fresh rates
    const rates = await fetchExchangeRates(baseCurrency);
    
    // Cache the results
    const cacheData: CachedRates = {
      rates,
      timestamp: Date.now(),
      baseCurrency
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
    
    return rates;
  } catch (error) {
    console.error('Failed to get exchange rates:', error);
    
    // Try to use stale cache as fallback
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const cachedData: CachedRates = JSON.parse(cached);
      if (cachedData.baseCurrency === baseCurrency) {
        console.warn('Using stale exchange rates as fallback');
        return cachedData.rates;
      }
    }
    
    // If no cache available, return 1:1 rates as last resort
    console.warn('Using 1:1 exchange rates as fallback');
    return {
      USD: 1,
      SGD: 1,
      IDR: 1
    };
  }
}

/**
 * Converts an amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  // No conversion needed for same currency
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    // Get exchange rates with 'toCurrency' as base
    // This way we get direct conversion rates to the target currency
    const rates = await getExchangeRates(toCurrency);
    
    // Get the rate for the source currency
    // Since rates are relative to base currency, we need to invert
    const rate = rates[fromCurrency];
    if (!rate) {
      console.error(`Exchange rate not found for ${fromCurrency}`);
      return amount; // Return original amount as fallback
    }
    
    // Convert: amount in fromCurrency * (1/rate) = amount in toCurrency
    const convertedAmount = amount / rate;
    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return amount; // Return original amount as fallback
  }
}

/**
 * Converts multiple amounts to a target currency
 * Useful for batch processing expenses
 */
export async function convertAmounts(
  amounts: { amount: number; currency: Currency }[],
  targetCurrency: Currency
): Promise<number[]> {
  const conversions = amounts.map(({ amount, currency }) =>
    convertCurrency(amount, currency, targetCurrency)
  );
  
  return Promise.all(conversions);
}

/**
 * Converts an expense amount to the target currency
 */
export async function convertExpenseAmount(
  expense: { amount: number; currency: Currency },
  targetCurrency: Currency
): Promise<number> {
  return convertCurrency(expense.amount, expense.currency, targetCurrency);
}

/**
 * Clears the exchange rate cache
 * Useful for testing or forcing fresh rates
 */
export function clearExchangeRateCache(): void {
  localStorage.removeItem(STORAGE_KEY);
}