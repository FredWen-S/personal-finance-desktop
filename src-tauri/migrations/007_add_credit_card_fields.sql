ALTER TABLE accounts ADD COLUMN credit_limit REAL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN statement_day INTEGER;
ALTER TABLE accounts ADD COLUMN due_day INTEGER;
ALTER TABLE accounts ADD COLUMN card_network TEXT;
ALTER TABLE accounts ADD COLUMN last_four TEXT;
