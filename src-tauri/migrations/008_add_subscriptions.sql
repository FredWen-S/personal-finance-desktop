CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT,
  category TEXT NOT NULL,
  account_id INTEGER,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  start_date TEXT,
  next_billing_date TEXT,
  trial_end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  auto_renew INTEGER NOT NULL DEFAULT 1,
  reminder_days INTEGER NOT NULL DEFAULT 7,
  url TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  transaction_id INTEGER,
  paid_date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_next_billing_date
  ON subscriptions(status, next_billing_date);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id
  ON subscription_payments(subscription_id);
