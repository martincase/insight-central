import { supabase } from '@/integrations/supabase/client';
import type { AccountData } from '@/types/dashboard';

/**
 * Load the account roster from Supabase `accounts_master` (active accounts only).
 * Downstream sales/traffic/PPC matching is unchanged — this only swaps the roster source.
 */
export async function fetchAccountsFromSheet(): Promise<AccountData[]> {
  try {
    const { data, error } = await supabase
      .from('accounts_master')
      .select('account_name, merchant_token, ppc_account_name, account_type, share_code, ppc_sellername')
      .eq('status', 'active')
      .order('account_name', { ascending: true });

    if (error) {
      console.error('Error fetching accounts from Supabase:', error);
      return [];
    }

    const rows = data || [];

    const accounts: AccountData[] = rows
      .map((row: any) => {
        const name = row.account_name?.trim();
        const merchantToken = row.merchant_token?.trim();

        if (!name || !merchantToken) return null;

        const typeRaw = (row.account_type || '').toString().toLowerCase();
        const type: 'seller' | 'vendor' = typeRaw === 'vendor' ? 'vendor' : 'seller';

        return {
          id: `${merchantToken}-${name.replace(/\s+/g, '-')}`,
          name,
          sales: 0,
          ppcSpend: 0,
          ppcSales: 0,
          acos: 0,
          tacos: 0,
          unitsOrdered: 0,
          pageViews: 0,
          buyBoxPercentage: 0,
          conversionRate: 0,
          sellerCentralLink: '',
          merchantToken,
          ppcAccountName: row.ppc_account_name?.trim() || undefined,
          ppc_sellername: row.ppc_sellername || null,
          type,
          status: 'active' as const,
          isStarred: false,
          shareCode: row.share_code?.trim() || undefined,
        } as AccountData;
      })
      .filter(Boolean) as AccountData[];

    console.log(`📊 Loaded ${accounts.length} active accounts from Supabase accounts_master`);
    return accounts;
  } catch (error) {
    console.error('Error fetching accounts from Supabase:', error);
    return [];
  }
}
