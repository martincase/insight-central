import React from 'react';
import { Wallet, type LucideIcon } from 'lucide-react';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';
import type { DateFilter } from '@/types/dashboard';

export interface AddonSectionProps {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  brandName: string;
  merchantToken: string;
  config: Record<string, any> | null;
  readOnly?: boolean;
}

export interface AddonDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  Section: React.LazyExoticComponent<React.ComponentType<AddonSectionProps>>;
}

const BudgetsSection = React.lazy(() =>
  import('@/components/budgets/BudgetsSection').then((m) => ({ default: m.BudgetsSection })),
);

export const ADDON_REGISTRY: Record<string, AddonDefinition> = {
  budgets: {
    key: 'budgets',
    label: 'Budgets',
    icon: Wallet,
    Section: BudgetsSection,
  },
};

export function getAddonDefinition(key: string): AddonDefinition | undefined {
  return ADDON_REGISTRY[key];
}
