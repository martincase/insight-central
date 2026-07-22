export interface SearchTermData {
  customer_search_term: string;
  sellername: string;
  campaign_count: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_sales: number;
  total_orders: number;
  ctr: number;
  acos: number;
  roas: number;
}

export type SearchTermType = 'all' | 'keywords' | 'asins';

export interface SearchTermFilters {
  sellers: string[];
  minImpressions: number;
  acosMin: number | null;
  acosMax: number | null;
  searchTermType: SearchTermType;
  searchTerm: string;
}

export type SortField = 
  | 'customer_search_term'
  | 'campaign_count'
  | 'total_impressions'
  | 'total_clicks'
  | 'total_spend'
  | 'total_sales'
  | 'total_orders'
  | 'ctr'
  | 'acos'
  | 'roas';

export type SortDirection = 'asc' | 'desc';

export interface SearchTermInsight {
  label: string;
  value: string;
  metric: string;
  searchTerm: string;
}

// Keyword Theme Analysis Types
export interface KeywordThemeData {
  keyword_text: string;
  match_type: string;
  sellername: string;
  campaign_count: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_sales: number;
  total_orders: number;
  ctr: number;
  acos: number;
}

export interface KeywordThemeFilters {
  sellers: string[];
  matchTypes: string[];
  minImpressions: number;
  acosMin: number | null;
  acosMax: number | null;
  searchTerm: string;
}

export type KeywordSortField = 
  | 'keyword_text'
  | 'match_type'
  | 'campaign_count'
  | 'total_impressions'
  | 'total_clicks'
  | 'total_spend'
  | 'total_sales'
  | 'total_orders'
  | 'ctr'
  | 'acos';

// Search Term → Keyword Mapping Types
export interface SearchTermKeywordMapData {
  customer_search_term: string;
  keyword_text: string;
  match_type: string;
  sellername: string;
  campaign_name: string;
  ad_group_name: string;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_sales: number;
  total_orders: number;
  ctr: number;
  acos: number;
  is_negative_candidate: boolean;
}

export interface SearchTermKeywordMapFilters {
  matchTypes: string[];
  minSpend: number;
  showNegativeCandidatesOnly: boolean;
  searchTerm: string;
  keywordText: string;
}

export type MappingViewMode = 'all' | 'by-keyword' | 'by-search-term';

export type MappingSortField = 
  | 'customer_search_term'
  | 'keyword_text'
  | 'match_type'
  | 'total_impressions'
  | 'total_clicks'
  | 'total_spend'
  | 'total_sales'
  | 'acos';

export interface MatchTypeSummary {
  match_type: string;
  total_mappings: number;
  total_impressions: number;
  total_clicks: number;
  total_orders: number;
  total_spend: number;
  total_sales: number;
  avg_acos: number;
  avg_cpc: number;
  avg_ctr: number;
  conversion_rate: number;
}
