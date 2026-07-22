import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMasterListings,
  fetchAccountMapping,
  type MasterProduct,
} from '@/utils/productLookupService';

export function useProductLookup(merchantToken?: string) {
  const [productMap, setProductMap] = useState<Map<string, MasterProduct> | null>(null);
  const [accountMap, setAccountMap] = useState<Map<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestedTokens = useRef(new Set<string>());

  // Load account mapping once on mount.
  useEffect(() => {
    let mounted = true;
    fetchAccountMapping()
      .then(accounts => { if (mounted) setAccountMap(accounts); })
      .catch(err => { if (mounted) setError(err instanceof Error ? err : new Error(String(err))); });
    return () => { mounted = false; };
  }, []);

  // Lazily load product titles for the current merchantToken.
  useEffect(() => {
    if (!merchantToken) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchMasterListings(merchantToken)
      .then(products => {
        if (!mounted) return;
        // Merge into the local map so previously-loaded tokens stay available.
        setProductMap(prev => {
          const next = new Map(prev || []);
          products.forEach((v, k) => next.set(k, v));
          return next;
        });
        setError(null);
      })
      .catch(err => { if (mounted) setError(err instanceof Error ? err : new Error(String(err))); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [merchantToken]);

  // Trigger a lazy fetch when getProductName is called with a token we haven't loaded yet.
  const ensureLoaded = useCallback((token: string) => {
    if (!token || requestedTokens.current.has(token)) return;
    requestedTokens.current.add(token);
    fetchMasterListings(token).then(products => {
      setProductMap(prev => {
        const next = new Map(prev || []);
        products.forEach((v, k) => next.set(k, v));
        return next;
      });
    }).catch(() => { /* ignore */ });
  }, []);

  const getAccountNameByToken = useCallback((token: string): string => {
    return accountMap?.get(token) || '';
  }, [accountMap]);

  const getProductName = useCallback((asin: string, token: string): string => {
    ensureLoaded(token);
    if (!productMap) return 'Loading...';
    const cacheKey = `${token}|${asin}`;
    const product = productMap.get(cacheKey);
    return product?.title || asin;
  }, [productMap, ensureLoaded]);

  const getProductInfo = useCallback((asin: string, token: string): MasterProduct | undefined => {
    ensureLoaded(token);
    const cacheKey = `${token}|${asin}`;
    return productMap?.get(cacheKey);
  }, [productMap, ensureLoaded]);

  return {
    productMap,
    accountMap,
    loading,
    error,
    getAccountNameByToken,
    getProductName,
    getProductInfo,
  };
}
