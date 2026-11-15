-- Price shown for each report (pricing test 19/49/99). NULL on older rows = the product's default price.
ALTER TABLE astro_reports ADD COLUMN IF NOT EXISTS price_rupees integer;
