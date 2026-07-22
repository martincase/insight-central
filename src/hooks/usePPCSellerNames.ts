import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePPCSellerNamesResult {
  sellerNames: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePPCSellerNames(): UsePPCSellerNamesResult {
  const [sellerNames, setSellerNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellerNames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch seller names from the lookup table
      const { data, error: queryError } = await supabase
        .from('ppc_seller_names')
        .select('sellername')
        .order('sellername');

      if (queryError) throw queryError;

      const names = data?.map(row => row.sellername).filter(Boolean) || [];
      setSellerNames(names);
    } catch (err) {
      console.error('Error fetching PPC seller names:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch seller names');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellerNames();
  }, [fetchSellerNames]);

  return {
    sellerNames,
    isLoading,
    error,
    refetch: fetchSellerNames
  };
}
