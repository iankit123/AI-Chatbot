-- If you already ran an older 0003 with razorpay_order_id / razorpay_payment_id, run this once.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_attempts' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE payment_attempts RENAME COLUMN razorpay_order_id TO gateway_order_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_attempts' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE payment_attempts RENAME COLUMN razorpay_payment_id TO gateway_payment_id;
  END IF;
END $$;

ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS payment_gateway text;

UPDATE payment_attempts
SET payment_gateway = 'razorpay'
WHERE payment_gateway IS NULL
  AND (gateway_order_id IS NOT NULL OR gateway_payment_id IS NOT NULL);

DROP INDEX IF EXISTS idx_payment_attempts_razorpay_order;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway_order
  ON payment_attempts (payment_gateway, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
