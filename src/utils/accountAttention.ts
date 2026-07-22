import type { AccountData } from '@/types/dashboard';

export interface AttentionInfo {
  needsAttention: boolean;
  reasons: string[];
}

/**
 * Determine if an account needs attention based on:
 *  - active performance alert config
 *  - significant week-over-week sales decline (>= 15%)
 *  - ACOS rising > 5pp WoW
 *  - red status indicator
 */
export const getAccountAttention = (account: AccountData): AttentionInfo => {
  const reasons: string[] = [];
  if (account.alert_config?.enabled) reasons.push('Active alert');
  if (account.statusColor === 'red') reasons.push('Status: red');

  const prev = account.previousPeriod;
  if (prev) {
    if (prev.sales > 0) {
      const change = ((account.sales - prev.sales) / prev.sales) * 100;
      if (change <= -15) reasons.push(`Sales ${change.toFixed(0)}% WoW`);
    }
    if (prev.acos > 0 && account.acos - prev.acos >= 5) {
      reasons.push(`ACOS +${(account.acos - prev.acos).toFixed(1)}pp WoW`);
    }
  }

  return { needsAttention: reasons.length > 0, reasons };
};

export const buildAttentionMap = (accounts: AccountData[]): Record<string, AttentionInfo> => {
  const map: Record<string, AttentionInfo> = {};
  for (const a of accounts) map[a.id] = getAccountAttention(a);
  return map;
};
