UPDATE exchange_rates
SET rate = 6.77,
    updated_at = datetime('now')
WHERE from_currency = 'USD'
  AND to_currency = 'CNY';

INSERT INTO exchange_rates (from_currency, to_currency, rate, note, updated_at)
SELECT 'USD', 'CNY', 6.77, 'v0.1.1 default rate correction', datetime('now')
WHERE NOT EXISTS (
  SELECT 1
  FROM exchange_rates
  WHERE from_currency = 'USD'
    AND to_currency = 'CNY'
);

UPDATE exchange_rates
SET rate = 1.0 / 6.77,
    updated_at = datetime('now')
WHERE from_currency = 'CNY'
  AND to_currency = 'USD';

INSERT INTO exchange_rates (from_currency, to_currency, rate, note, updated_at)
SELECT 'CNY', 'USD', 1.0 / 6.77, 'v0.1.1 default rate correction', datetime('now')
WHERE NOT EXISTS (
  SELECT 1
  FROM exchange_rates
  WHERE from_currency = 'CNY'
    AND to_currency = 'USD'
);
