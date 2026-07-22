-- Grant SELECT permissions on mv_bid_change_history to anon and authenticated roles
GRANT SELECT ON mv_bid_change_history TO anon;
GRANT SELECT ON mv_bid_change_history TO authenticated;