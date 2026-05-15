-- Persist Kundli birth form per profile (phone-linked users).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kundli_birth_details jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_kundli_birth
  ON profiles ((kundli_birth_details IS NOT NULL))
  WHERE kundli_birth_details IS NOT NULL;
