-- Paid astrology reports (/shaadi and /milan). Only the API (service role) reads or writes this table.
CREATE TABLE IF NOT EXISTS astro_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('shaadi', 'milan')),
  device_id text NOT NULL,
  input jsonb NOT NULL,
  facts jsonb NOT NULL,
  narrative jsonb,
  palm jsonb,
  portrait text,
  has_portrait boolean NOT NULL DEFAULT false,
  paid boolean NOT NULL DEFAULT false,
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_astro_reports_device_id ON astro_reports (device_id);
CREATE INDEX IF NOT EXISTS idx_astro_reports_created_at ON astro_reports (created_at DESC);

-- RLS on with no policies: anon/authenticated keys get nothing; the service role bypasses RLS.
ALTER TABLE astro_reports ENABLE ROW LEVEL SECURITY;
