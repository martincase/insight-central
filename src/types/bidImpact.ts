export interface BidImpactData {
  keyword_id: string;
  keyword_text: string;
  match_type: string | null;
  sellername: string;
  ad_group_name: string | null;
  campaign_name: string | null;
  bid_change_date: string;
  previous_bid: number;
  new_bid: number;
  bid_change_pct: number;
  change_direction: 'increase' | 'decrease';
  
  // Before snapshot
  before_snapshot_date: string | null;
  impressions_before: number;
  clicks_before: number;
  spend_before: number;
  sales_before: number;
  acos_before: number;
  
  // After snapshot
  after_snapshot_date: string | null;
  impressions_after: number | null;
  clicks_after: number | null;
  spend_after: number | null;
  sales_after: number | null;
  acos_after: number | null;
  
  // Analysis metrics
  days_since_change: number | null;
  data_maturity_pct: number;
  
  // Delta percentages
  impressions_delta_pct: number | null;
  clicks_delta_pct: number | null;
  sales_delta_pct: number | null;
  acos_delta_pct: number | null;
  
  impact_verdict: 'positive' | 'negative' | 'neutral' | 'no_data' | 'pending';
}

export interface BidImpactSummary {
  totalBidChanges: number;
  withAnalysisData: number;
  avgDataMaturity: number;
  positiveImpacts: number;
  negativeImpacts: number;
  neutralImpacts: number;
  winRate: number;
  avgSalesLiftOnIncrease: number;
  avgAcosChangeOnDecrease: number;
}

export interface BidImpactFilters {
  seller: string;
  verdict: 'all' | 'positive' | 'negative' | 'neutral' | 'no_data' | 'pending';
  direction: 'all' | 'increase' | 'decrease';
  minMaturity: number;
  analysisStatus: 'all' | 'ready' | 'pending';
}
