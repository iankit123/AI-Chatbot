-- Payment ledger (pending → success/failed/cancelled). Gateway-agnostic IDs.
-- Run after 0002_profiles_payment.sql.

ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS payment_gateway text,
  ADD COLUMN IF NOT EXISTS gateway_order_id text,
  ADD COLUMN IF NOT EXISTS gateway_payment_id text,
  ADD COLUMN IF NOT EXISTS credits_allocated numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- status: pending | success | failed | cancelled
ALTER TABLE payment_attempts
  ALTER COLUMN status SET DEFAULT 'pending';

-- payment_gateway examples: razorpay (today), stripe, payu, etc.
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway_order
  ON payment_attempts (payment_gateway, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_device_status
  ON payment_attempts (device_id, status);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_credits numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocked_photo_packs text[] NOT NULL DEFAULT '{}'::text[];
