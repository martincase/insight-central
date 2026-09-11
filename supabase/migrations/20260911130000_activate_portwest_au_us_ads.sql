-- Activate Amazon Ads collection for Portwest Australia and Portwest USA (vendor).
--
-- Why these were empty
-- --------------------
-- Both markets had vendor sales in vendor_daily_metrics but not a single row of ad
-- performance in any table - amazon_api_campaigns_performance, the SB/SD equivalents,
-- ad groups, or the legacy Windsor feed. The cause was the same one-row flag that
-- had silenced Workwear Depot US: amazon-api-fetch-report selects profiles with
-- .eq("active", true), and both profiles were active = false, so the pull skipped
-- them. Our shared AMAZON_ADS_REFRESH_TOKEN could see them the whole time -
-- amazon-api-fetch-profiles listed both again on 2026-09-11.
--
-- These accounts are NOT dormant
-- ------------------------------
-- amazon_api_campaigns_config, which is populated independently of the performance
-- pull, showed live campaigns in both (pulled 2026-09-07):
--
--   Portwest Australia (AU, vendor, AUD)   50 ENABLED SP campaigns, AUD 1,632/day budget
--                                          22 PAUSED, 5 ARCHIVED
--   Portwest -Industrial (US, vendor, USD) 22 ENABLED SP campaigns, USD 825/day budget
--                                          26 PAUSED, 1 ARCHIVED
--
-- So Portwest has been advertising at scale in both markets with no reporting on our
-- side at all. Australia is their third-largest market by revenue (AUD 467,468 over
-- Mar-Aug 2026) and had zero advertising visibility.
--
-- Both accounts run Sponsored Products only - there are no SB or SD campaigns in
-- either - so the backfill covers spCampaigns and nothing else.
--
-- Backfill
-- --------
-- Queued 8 report requests (4 chunks x 2 profiles) covering 2026-06-08 to 2026-09-10,
-- chunked to Amazon's 31-day maximum and floored at fn_ads_retention_start('spCampaigns')
-- = current_date - 95. All 8 accepted, 0 errors. Anything earlier than 8 June is beyond
-- Amazon's Sponsored Products retention and is permanently unavailable.
--
-- Ongoing collection needs no further action: the daily spCampaigns cron and the weekly
-- reconcile waves both run for every active profile, so these two are now included.
--
-- Rollback
-- --------
--   update amazon_api_profiles set active = false
--   where profile_id in (2503601742396098, 3529318683273502);

update amazon_api_profiles
set active = true
where profile_id in (
  2503601742396098,   -- Portwest Australia,   AU, vendor, ENTITY4HTQW89ICM9N
  3529318683273502    -- Portwest -Industrial, US, vendor, ENTITY2Z8YKGS9DFLTQ
);
