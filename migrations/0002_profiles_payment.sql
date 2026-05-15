-- User profiles (guest device + optional phone sign-in)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  phone_number text,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles (phone_number);

-- Payment ledger (see 0003_payment_ledger.sql for status/credits columns)
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  phone_number text,
  amount_rupees numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  companion_id text,
  rate_note text,
  status text NOT NULL DEFAULT 'technical_error_shown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_device_id ON payment_attempts (device_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_phone ON payment_attempts (phone_number);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created ON payment_attempts (created_at DESC);
