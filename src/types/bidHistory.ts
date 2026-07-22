export interface BidChangeData {
  campaign_id: number;
  ad_group_id: number;
  keyword_id: number;
  keyword_text: string;
  sellername: string;
  snapshot_date: string;
  previous_bid: number;
  new_bid: number;
  bid_change: number;
  bid_change_pct: number;
}

export interface BidHistoryTimelinePoint {
  date: string;
  bid: number;
  isChange: boolean;
  changeAmount?: number;
  changePct?: number;
}

export interface BidHistoryTimelineData {
  keyword_id: number;
  keyword_text: string;
  sellername: string;
  dataPoints: BidHistoryTimelinePoint[];
}

export interface BidHistoryFilters {
  sellers: string[];
  keywords: string[];
  dateRange: { from: Date; to: Date } | null;
  changeDirection: 'all' | 'increases' | 'decreases';
  minChangePercent: number | null;
}

export interface BidHistorySummary {
  totalChanges: number;
  increases: number;
  decreases: number;
  avgChangeAmount: number;
  avgChangePct: number;
  dateFrom?: string;
  dateTo?: string;
}

export type BidHistorySortField = 
  | 'snapshot_date'
  | 'keyword_text'
  | 'bid_change'
  | 'bid_change_pct'
  | 'new_bid';
