-- Product / marketing analytics events (Meta Pixel mirror + internal reporting)
CREATE TABLE IF NOT EXISTS app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  device_id text NOT NULL,
  user_id text,
  phone_number text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_event_name ON app_events (event_name);
CREATE INDEX IF NOT EXISTS idx_app_events_device_id ON app_events (device_id);
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON app_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_events_phone_number ON app_events (phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events (created_at DESC);
