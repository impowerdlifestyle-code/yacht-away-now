-- api/affiliates.js and api/affiliate-portal.js now store and look up affiliate
-- emails in lowercase. Rows saved before that with capitals would stop matching
-- at login. Check for case-only duplicates first; this returns no rows when safe:
--   select lower(email), count(*) from public.affiliates group by 1 having count(*) > 1;
update public.affiliates set email = lower(email) where email <> lower(email);
