-- Track chat message spend so wallet sync (sum of payments) minus spent = balance.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_spent numeric(12, 2) NOT NULL DEFAULT 0;
