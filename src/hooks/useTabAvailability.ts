import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isVendorAccount } from '@/utils/vendorUtils';

export interface TabAvailability {
  brandAnalytics: boolean;
  profitLoss: boolean;
  searchTerms: boolean;
  adProducts: boolean;
  inventory: boolean;
}

export interface TabAvailabilityState {
  availability: TabAvailability;
  ready: boolean;
}

const empty: TabAvailability = {
  brandAnalytics: false,
  profitLoss: false,
  searchTerms: false,
  adProducts: false,
  inventory: false,
};

export function useTabAvailability(
  accountName: string | null | undefined,
  merchantToken: string | null | undefined,
  profileId: number | null | undefined
): TabAvailabilityState {
  const [availability, setAvailability] = useState<TabAvailability>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!accountName && !merchantToken) return;
    let cancelled = false;
    setAvailability(empty);
    setReady(false);

    const tasks: Array<Promise<void>> = [];

    const probe = (key: keyof TabAvailability, run: () => Promise<boolean>) => {
      const p = (async () => {
        try {
          const has = await run();
          if (cancelled) return;
          setAvailability((prev) => ({ ...prev, [key]: has }));
        } catch {
          // leave as false
        }
      })();
      tasks.push(p);
    };

    if (accountName) {
      probe('brandAnalytics', async () => {
        const { data } = await supabase
          .from('vw_python_kw_weekly' as any)
          .select('account_name')
          .eq('account_name', accountName)
          .limit(1);
        return !!(data && data.length > 0);
      });
      probe('profitLoss', async () => {
        const { data } = await supabase
          .from('vw_python_financial_weekly' as any)
          .select('account_name')
          .eq('account_name', accountName)
          .limit(1);
        return !!(data && data.length > 0);
      });
    }

    if (profileId != null) {
      probe('searchTerms', async () => {
        const { data } = await supabase
          .from('amazon_api_search_terms_performance' as any)
          .select('profile_id')
          .eq('profile_id', profileId)
          .limit(1);
        return !!(data && data.length > 0);
      });
      probe('adProducts', async () => {
        const { data } = await supabase
          .from('amazon_api_advertised_product_performance' as any)
          .select('profile_id')
          .eq('profile_id', profileId)
          .limit(1);
        return !!(data && data.length > 0);
      });
    } else {
      setAvailability((p) => ({ ...p, searchTerms: true, adProducts: true }));
    }

    if (merchantToken) {
      probe('inventory', async () => {
        if (isVendorAccount(merchantToken)) {
          const { data } = await supabase
            .from('vendor_inventory_data')
            .select('account_id')
            .eq('account_id', merchantToken)
            .limit(1);
          return !!(data && data.length > 0);
        }
        const { data } = await supabase
          .from('fba_inventory_data' as any)
          .select('account_name')
          .eq('account_name', merchantToken)
          .limit(1);
        return !!(data && data.length > 0);
      });
    }

    Promise.allSettled(tasks).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [accountName, merchantToken, profileId]);

  return { availability, ready };
}
