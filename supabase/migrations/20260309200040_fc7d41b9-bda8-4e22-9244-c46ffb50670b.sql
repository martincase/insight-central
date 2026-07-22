-- Allow public read access to research sessions
CREATE POLICY "Allow public read access"
ON public.jungle_scout_research_sessions
FOR SELECT
USING (true);

-- Allow public read access to PPC gap analysis results
CREATE POLICY "Allow public read access"
ON public.jungle_scout_ppc_gap_analysis_results
FOR SELECT
USING (true);