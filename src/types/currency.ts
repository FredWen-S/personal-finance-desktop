export type BaseCurrency = "CNY" | "USD" | "JPY" | "EUR" | "GBP" | "HKD";

export interface ExchangeRate {
  id?: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  note?: string | null;
  updated_at: string;
}

export interface ExchangeRateInput {
  from_currency: string;
  to_currency: string;
  rate: number;
  note?: string | null;
}

export interface CurrencyConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
}
