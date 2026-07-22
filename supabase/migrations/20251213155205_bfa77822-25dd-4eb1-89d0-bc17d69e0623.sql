-- Grant SELECT access on the bid change history view to anon and authenticated roles
GRANT SELECT ON public.vw_bid_change_history TO anon;
GRANT SELECT ON public.vw_bid_change_history TO authenticated;