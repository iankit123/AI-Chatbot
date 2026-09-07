-- Where are users actually paying? Paste into the Supabase SQL editor.
-- Change the '5 days' interval below if you want a different window.

-- 1) chat vs image vs audio
SELECT
  CASE product_type
    WHEN 'chat_recharge'  THEN 'chat'
    WHEN 'voice_chat'     THEN 'audio'
    WHEN 'photo_pack'     THEN 'image'
    WHEN 'premium_photo'  THEN 'image'
    ELSE 'other'
  END                                   AS bucket,
  count(*)                              AS payments,
  sum(amount_rupees)                    AS revenue_rupees,
  round(100.0 * sum(amount_rupees) / sum(sum(amount_rupees)) OVER (), 1) AS pct_revenue
FROM payment_attempts
WHERE status = 'success'
  AND created_at >= now() - interval '5 days'
GROUP BY 1
ORDER BY revenue_rupees DESC;

-- 2) exact product type
SELECT product_type, count(*) AS payments, sum(amount_rupees) AS revenue_rupees
FROM payment_attempts
WHERE status = 'success'
  AND created_at >= now() - interval '5 days'
GROUP BY 1
ORDER BY revenue_rupees DESC;

-- 3) which profile / character (companion_id)
SELECT
  lower(coalesce(companion_id, '(none)')) AS companion,
  count(*)                                AS payments,
  sum(amount_rupees)                      AS revenue_rupees
FROM payment_attempts
WHERE status = 'success'
  AND created_at >= now() - interval '5 days'
GROUP BY 1
ORDER BY revenue_rupees DESC;

-- 4) which paying users, and what each of them bought
SELECT
  pa.phone_number,
  pr.name,
  pa.device_id,
  count(*)                          AS payments,
  sum(pa.amount_rupees)             AS revenue_rupees,
  array_agg(DISTINCT pa.product_type) AS products,
  array_agg(DISTINCT lower(pa.companion_id)) FILTER (WHERE pa.companion_id IS NOT NULL) AS companions
FROM payment_attempts pa
LEFT JOIN profiles pr ON pr.device_id = pa.device_id
WHERE pa.status = 'success'
  AND pa.created_at >= now() - interval '5 days'
GROUP BY 1, 2, 3
ORDER BY revenue_rupees DESC;

-- 5) product x companion cross-tab (the "what for whom" view)
SELECT
  lower(coalesce(companion_id, '(none)')) AS companion,
  count(*) FILTER (WHERE product_type = 'chat_recharge')                     AS chat,
  count(*) FILTER (WHERE product_type = 'voice_chat')                        AS audio,
  count(*) FILTER (WHERE product_type IN ('photo_pack', 'premium_photo'))    AS image,
  sum(amount_rupees)                                                          AS revenue_rupees
FROM payment_attempts
WHERE status = 'success'
  AND created_at >= now() - interval '5 days'
GROUP BY 1
ORDER BY revenue_rupees DESC;

-- 6) raw rows, newest first (sanity check against Razorpay dashboard)
SELECT created_at, amount_rupees, product_type, companion_id, phone_number, device_id,
       rate_note, gateway_payment_id
FROM payment_attempts
WHERE status = 'success'
  AND created_at >= now() - interval '5 days'
ORDER BY created_at DESC;

-- 7) conversion check: how many attempts never completed
SELECT status, count(*), sum(amount_rupees) AS rupees
FROM payment_attempts
WHERE created_at >= now() - interval '5 days'
GROUP BY 1
ORDER BY 2 DESC;
