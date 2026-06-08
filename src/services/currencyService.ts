import { getDatabase } from "./db";
import type { ExchangeRate, ExchangeRateInput } from "../types/currency";

const BASE_CURRENCY_KEY = "base_currency";
const DEFAULT_BASE_CURRENCY = "CNY";

export async function getBaseCurrency(): Promise<string> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM app_settings WHERE key = $1 LIMIT 1",
    [BASE_CURRENCY_KEY]
  );

  return rows[0]?.value ?? DEFAULT_BASE_CURRENCY;
}

export async function setBaseCurrency(currency: string): Promise<void> {
  const normalizedCurrency = normalizeCurrency(currency);
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO app_settings (key, value, updated_at)
    VALUES ($1, $2, $3)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at`,
    [BASE_CURRENCY_KEY, normalizedCurrency, now]
  );
}

export async function listExchangeRates(): Promise<ExchangeRate[]> {
  const db = await getDatabase();

  return db.select<ExchangeRate[]>(
    `SELECT id, from_currency, to_currency, rate, note, updated_at
    FROM exchange_rates
    ORDER BY from_currency ASC, to_currency ASC`
  );
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const normalizedFromCurrency = normalizeCurrency(fromCurrency);
  const normalizedToCurrency = normalizeCurrency(toCurrency);

  if (normalizedFromCurrency === normalizedToCurrency) {
    return 1;
  }

  const db = await getDatabase();
  const rows = await db.select<Array<{ rate: number }>>(
    `SELECT rate
    FROM exchange_rates
    WHERE from_currency = $1
      AND to_currency = $2
    LIMIT 1`,
    [normalizedFromCurrency, normalizedToCurrency]
  );

  const rate = rows[0]?.rate;

  if (!rate) {
    throw new Error(
      `缺少汇率：${normalizedFromCurrency} -> ${normalizedToCurrency}`
    );
  }

  return Number(rate);
}

export async function upsertExchangeRate(
  input: ExchangeRateInput
): Promise<void> {
  const fromCurrency = normalizeCurrency(input.from_currency);
  const toCurrency = normalizeCurrency(input.to_currency);
  const rate = Number(input.rate);

  if (!fromCurrency) {
    throw new Error("from_currency 必填");
  }

  if (!toCurrency) {
    throw new Error("to_currency 必填");
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("rate 必须大于 0");
  }

  if (fromCurrency === toCurrency && rate !== 1) {
    throw new Error("同币种汇率必须为 1");
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO exchange_rates (
      from_currency,
      to_currency,
      rate,
      note,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(from_currency, to_currency) DO UPDATE SET
      rate = excluded.rate,
      note = excluded.note,
      updated_at = excluded.updated_at`,
    [fromCurrency, toCurrency, rate, input.note ?? null, now]
  );
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);

  return Number(amount || 0) * rate;
}

export async function convertAccountBalance(
  balance: number,
  currency: string
): Promise<number> {
  const baseCurrency = await getBaseCurrency();

  return convertAmount(balance, currency, baseCurrency);
}

function normalizeCurrency(currency: string): string {
  return String(currency || "").trim().toUpperCase();
}
