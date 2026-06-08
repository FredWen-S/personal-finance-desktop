CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL CHECK (rate > 0),
  note TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(from_currency, to_currency)
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('base_currency', 'CNY', datetime('now'));

INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate, note, updated_at)
VALUES
  ('CNY', 'CNY', 1, 'Default same-currency rate', datetime('now')),
  ('USD', 'USD', 1, 'Default same-currency rate', datetime('now')),
  ('CNY', 'USD', 0.14, 'Manual default rate', datetime('now')),
  ('USD', 'CNY', 7.20, 'Manual default rate', datetime('now'));
