export interface DataSourceInfo {
  type: 'live' | 'banked' | 'hybrid';
  liveDataRange?: { from: Date; to: Date };
  bankedDataRange?: { from: Date; to: Date };
  lastSyncTime?: Date;
  hasGaps: boolean;
  missingDates?: Date[];
}

export interface HybridDataStatus {
  sales: DataSourceInfo;
  ppc: DataSourceInfo;
  asin: DataSourceInfo;
  campaign: DataSourceInfo;
  inventory: DataSourceInfo;
  vendor: DataSourceInfo;
}

export interface DataCoverageWarning {
  type: 'gap' | 'stale' | 'missing';
  message: string;
  dateRange?: { from: Date; to: Date };
  severity: 'low' | 'medium' | 'high';
}