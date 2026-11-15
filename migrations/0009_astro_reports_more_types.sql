-- /wapas and /business reports share the astro_reports table.
ALTER TABLE astro_reports DROP CONSTRAINT IF EXISTS astro_reports_report_type_check;
ALTER TABLE astro_reports ADD CONSTRAINT astro_reports_report_type_check
  CHECK (report_type IN ('shaadi', 'milan', 'wapas', 'business'));
