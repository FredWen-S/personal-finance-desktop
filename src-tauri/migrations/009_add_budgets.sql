CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  base_currency TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(month, category, base_currency)
);

CREATE INDEX IF NOT EXISTS idx_budgets_month_base_currency
  ON budgets(month, base_currency);
