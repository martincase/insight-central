
import type { AccountData } from '@/types/dashboard';

export interface TargetNotification {
  accountId: string;
  accountName: string;
  metric: string;
  current: number;
  target: number;
  type: 'above' | 'below';
  isGood: boolean;
}

export const checkTargets = (accounts: AccountData[]): TargetNotification[] => {
  const notifications: TargetNotification[] = [];

  accounts.forEach(account => {
    if (!account.targets) return;

    const { targets } = account;

    // Sales target (higher is better)
    if (targets.sales && targets.sales > 0) {
      const isAbove = account.sales >= targets.sales;
      notifications.push({
        accountId: account.id,
        accountName: account.name,
        metric: 'Sales',
        current: account.sales,
        target: targets.sales,
        type: isAbove ? 'above' : 'below',
        isGood: isAbove
      });
    }

    // PPC Sales target (higher is better)
    if (targets.ppcSales && targets.ppcSales > 0) {
      const isAbove = account.ppcSales >= targets.ppcSales;
      notifications.push({
        accountId: account.id,
        accountName: account.name,
        metric: 'PPC Sales',
        current: account.ppcSales,
        target: targets.ppcSales,
        type: isAbove ? 'above' : 'below',
        isGood: isAbove
      });
    }

    // PPC Spend target (lower is better)
    if (targets.ppcSpend && targets.ppcSpend > 0) {
      const isAbove = account.ppcSpend > targets.ppcSpend;
      notifications.push({
        accountId: account.id,
        accountName: account.name,
        metric: 'PPC Spend',
        current: account.ppcSpend,
        target: targets.ppcSpend,
        type: isAbove ? 'above' : 'below',
        isGood: !isAbove // Lower is better for spend
      });
    }

    // ACOS target (lower is better)
    if (targets.acos && targets.acos > 0) {
      const isAbove = account.acos > targets.acos;
      notifications.push({
        accountId: account.id,
        accountName: account.name,
        metric: 'ACOS',
        current: account.acos,
        target: targets.acos,
        type: isAbove ? 'above' : 'below',
        isGood: !isAbove // Lower is better for ACOS
      });
    }

    // TACOS target (lower is better)
    if (targets.tacos && targets.tacos > 0) {
      const isAbove = account.tacos > targets.tacos;
      notifications.push({
        accountId: account.id,
        accountName: account.name,
        metric: 'TACOS',
        current: account.tacos,
        target: targets.tacos,
        type: isAbove ? 'above' : 'below',
        isGood: !isAbove // Lower is better for TACOS
      });
    }
  });

  return notifications;
};
