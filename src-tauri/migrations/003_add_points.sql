CREATE TABLE IF NOT EXISTS point_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  tier TEXT,
  expire_date TEXT,
  value_per_point REAL DEFAULT 0,
  institution TEXT,
  account_number TEXT,
  login_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  points REAL NOT NULL,
  description TEXT,
  related_cash_value REAL,
  expire_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(program_id) REFERENCES point_programs(id)
);
