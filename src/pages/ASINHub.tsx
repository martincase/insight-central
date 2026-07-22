import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, ExternalLink, Star, StarHalf, TrendingUp, TrendingDown, Minus,
  ShoppingCart, Users, Eye, Percent, BarChart3, Store, Target, Package,
  UserCheck, Search, ChevronRight, Copy, Check, Tag, Zap, Award,
  DollarSign, Loader2, Image as ImageIcon, ShieldCheck, Truck, AlertTriangle, Info
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { AuthGate } from '@/components/AuthGate';
import { ASINLink } from '@/components/common/ASINLink';

// ── Helpers ──

const rawImgUrl = (url: any): string => {
  if (!url) return '';
  if (typeof url === 'object' && url.link) return String(url.link);
  if (typeof url === 'string') return url;
  return String(url);
};

const ImgWithFallback = ({ src, fallbacks = [], alt, className, onClick }: {
  src: string; fallbacks?: string[]; alt: string; className?: string; onClick?: (e: React.MouseEvent) => void;
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setCurrentSrc(src); setFallbackIndex(0); setHidden(false); }, [src]);
  if (hidden || !currentSrc) return null;
  return (
    <img src={currentSrc} alt={alt} className={className} onClick={onClick}
      onError={() => {
        if (fallbackIndex < fallbacks.length) {
          setCurrentSrc(fallbacks[fallbackIndex]);
          setFallbackIndex(prev => prev + 1);
        } else setHidden(true);
      }}
    />
  );
};

const Stars = ({ rating, count }: { rating: number | null; count?: number }) => {
  if (!rating) return <span className="text-muted-foreground text-xs">N/A</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(full)].map((_, i) => <Star key={`f${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
      {half && <StarHalf className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
      <span className="text-sm ml-1.5 font-medium">{rating}</span>
      {count !== undefined && <span className="text-sm text-muted-foreground ml-1">({count.toLocaleString()} reviews)</span>}
    </span>
  );
};

const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0, naText }: { value: number; prefix?: string; suffix?: string; decimals?: number; naText?: string }) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (!value) { setDisplayed(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplayed(value); clearInterval(timer); }
      else setDisplayed(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  if (naText && value === 0) return <span>{naText}</span>;
  return <span>{prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed).toLocaleString()}{suffix}</span>;
};

const MiniSparkline = ({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) => {
  if (!data || data.length < 2) return null;
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const DataDot = ({ hasData, label }: { hasData: boolean; label: string }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <div className={`h-2 w-2 rounded-full ${hasData ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
    <span className={hasData ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
  </div>
);

const EmptyState = ({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon className="h-12 w-12 text-muted-foreground/30 mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
    {children}
  </div>
);

const getRankColor = (rank: number | null) => {
  if (!rank) return 'text-muted-foreground';
  if (rank <= 3) return 'text-emerald-600 font-bold';
  if (rank <= 10) return 'text-yellow-600 font-semibold';
  if (rank <= 20) return 'text-orange-500';
  return 'text-red-500';
};

const VendorBanner = ({ accountName }: { accountName: string }) => (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-amber-200 font-medium text-sm">This appears to be a Vendor product</p>
      <p className="text-amber-200/60 text-xs mt-1">
        Sales data is not available through the Seller Central API. Data source: <span className="font-semibold text-amber-300">{accountName}</span>
      </p>
    </div>
  </div>
);

// ── Main Component ──

const ASINHub = () => {
  const { asin } = useParams<{ asin: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [perfPeriod, setPerfPeriod] = useState<7 | 30 | 60 | 90>(30);
  const [perfMetric, setPerfMetric] = useState<'sales' | 'units_sold' | 'page_views' | 'conversion_rate' | 'buy_box_percentage'>('sales');
  const [searchAsin, setSearchAsin] = useState('');
  const [fetchingOffers, setFetchingOffers] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [variantMode, setVariantMode] = useState<'this' | 'all'>('this');

  const copyAsin = () => {
    if (asin) navigator.clipboard.writeText(asin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Fetch action handlers ──

  const fetchOffersData = useCallback(async () => {
    if (!asin) return;
    setFetchingOffers(true);
    try {
      await supabase.functions.invoke('searchapi-amazon-offers', {
        body: { asin, amazon_domain: 'amazon.co.uk' },
      });
      // Wait for cache to populate
      await new Promise(resolve => setTimeout(resolve, 2500));
      queryClient.invalidateQueries({ queryKey: ['asin-hub-offers', asin] });
    } catch (e) {
      console.error('Error fetching offers:', e);
    } finally {
      setFetchingOffers(false);
    }
  }, [asin, queryClient]);

  const fetchProductData = useCallback(async () => {
    if (!asin) return;
    setFetchingProduct(true);
    try {
      await supabase.functions.invoke('searchapi-amazon-product', {
        body: { asin, amazon_domain: 'amazon.co.uk' },
      });
      await new Promise(resolve => setTimeout(resolve, 2500));
      queryClient.invalidateQueries({ queryKey: ['asin-hub-product', asin] });
    } catch (e) {
      console.error('Error fetching product:', e);
    } finally {
      setFetchingProduct(false);
    }
  }, [asin, queryClient]);

  // ── Data Queries ──

  const { data: productData, isLoading: loadingProduct } = useQuery({
    queryKey: ['asin-hub-product', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('searchapi_cache')
        .select('response_json, created_at')
        .eq('engine', 'amazon_product')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return null;
      const match = data.find((r: any) => {
        const params = typeof r.response_json === 'string' ? JSON.parse(r.response_json) : r.response_json;
        const p = params?.product || params;
        return p?.asin === asin;
      });
      if (!match) return null;
      const json = typeof match.response_json === 'string' ? JSON.parse(match.response_json) : match.response_json;
      return { ...json, _cached_at: match.created_at };
    },
    enabled: !!asin,
  });

  const { data: offersData, isLoading: loadingOffers } = useQuery({
    queryKey: ['asin-hub-offers', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('searchapi_cache')
        .select('response_json, created_at')
        .eq('engine', 'amazon_offers')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return null;
      const match = data.find((r: any) => {
        const params = typeof r.response_json === 'string' ? JSON.parse(r.response_json) : r.response_json;
        const p = params?.product || params;
        return p?.asin === asin;
      });
      if (!match) return null;
      const json = typeof match.response_json === 'string' ? JSON.parse(match.response_json) : match.response_json;
      return { ...json, _cached_at: match.created_at };
    },
    enabled: !!asin,
  });

  const { data: dailySalesData, isLoading: loadingDailySales } = useQuery({
    queryKey: ['asin-hub-daily', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_asin_data' as any)
        .select('record_date, sales, units_sold, page_views, buy_box_percentage, conversion_rate, product_title, account_name, parent_asin, child_asin')
        .or(`parent_asin.eq.${asin},child_asin.eq.${asin}`)
        .order('record_date', { ascending: false })
        .limit(90);
      return (data as any[]) || [];
    },
    enabled: !!asin,
  });

  // Parent ASIN query - find parent for this child
  const { data: parentAsinInfo } = useQuery({
    queryKey: ['asin-hub-parent', asin],
    queryFn: async () => {
      // Check if this ASIN is a child - find its parent
      const { data: asChild } = await supabase
        .from('daily_asin_data' as any)
        .select('parent_asin, child_asin')
        .eq('child_asin', asin!)
        .limit(1);
      
      if (asChild && asChild.length > 0 && (asChild[0] as any).parent_asin && (asChild[0] as any).parent_asin !== asin) {
        // This is a child ASIN - find how many siblings
        const parentAsin = (asChild[0] as any).parent_asin;
        const { data: siblings } = await supabase
          .from('daily_asin_data' as any)
          .select('child_asin')
          .eq('parent_asin', parentAsin);
        const uniqueChildren = new Set((siblings || []).map((s: any) => s.child_asin));
        return { type: 'child' as const, parentAsin, variantCount: uniqueChildren.size };
      }

      // Check if this ASIN is a parent
      const { data: asParent } = await supabase
        .from('daily_asin_data' as any)
        .select('child_asin')
        .eq('parent_asin', asin!);
      
      if (asParent && asParent.length > 0) {
        const uniqueChildren = new Set((asParent || []).map((s: any) => s.child_asin));
        if (uniqueChildren.size > 0) {
          return { type: 'parent' as const, parentAsin: asin!, variantCount: uniqueChildren.size };
        }
      }

      return null;
    },
    enabled: !!asin,
  });

  // All variants aggregated data
  const { data: allVariantsData } = useQuery({
    queryKey: ['asin-hub-all-variants', parentAsinInfo?.parentAsin],
    queryFn: async () => {
      if (!parentAsinInfo?.parentAsin) return [];
      const { data } = await supabase
        .from('daily_asin_data' as any)
        .select('record_date, sales, units_sold, page_views, buy_box_percentage, conversion_rate, product_title, account_name, child_asin')
        .eq('parent_asin', parentAsinInfo.parentAsin)
        .order('record_date', { ascending: false })
        .limit(1000);
      return (data as any[]) || [];
    },
    enabled: !!parentAsinInfo?.parentAsin && variantMode === 'all',
  });

  const { data: keywordsData, isLoading: loadingKeywords } = useQuery({
    queryKey: ['asin-hub-keywords', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('jungle_scout_keywords_by_asin' as any)
        .select('keyword, organic_rank, sponsored_rank, overall_rank, monthly_search_volume_exact, monthly_search_volume_broad, monthly_trend, quarterly_trend, ppc_bid_exact, ppc_bid_broad, relevancy_score, ease_of_ranking_score, dominant_category')
        .eq('asin', asin!)
        .order('monthly_search_volume_exact', { ascending: false })
        .limit(200);
      return (data as any[]) || [];
    },
    enabled: !!asin,
  });

  const { data: costData, isLoading: loadingCost } = useQuery({
    queryKey: ['asin-hub-cost', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('asin_cost_prices' as any)
        .select('*')
        .eq('asin', asin!)
        .limit(1);
      return (data as any[])?.[0] || null;
    },
    enabled: !!asin,
  });

  const { data: searchRankData } = useQuery({
    queryKey: ['asin-hub-search-ranks', asin],
    queryFn: async () => {
      const { data } = await supabase
        .from('searchapi_cache')
        .select('response_json, query_params, created_at')
        .eq('engine', 'amazon_search')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!data) return [];
      const results: { keyword: string; position: number; isSponsored: boolean; date: string }[] = [];
      for (const row of data) {
        const json = typeof row.response_json === 'string' ? JSON.parse(row.response_json) : row.response_json;
        const params = typeof row.query_params === 'string' ? JSON.parse(row.query_params) : row.query_params;
        const keyword = params?.search_query || params?.q || '';
        const organicResults = json?.organic_results || [];
        for (const r of organicResults) {
          if (r.asin === asin) {
            results.push({ keyword, position: r.position, isSponsored: !!r.is_sponsored, date: row.created_at });
          }
        }
      }
      return results;
    },
    enabled: !!asin,
  });

  // ── Derived Data ──

  const product = productData?.product || productData;
  const offers = offersData?.offers || offersData?.offer_results || [];
  const buyboxWinner = offers.find((o: any) => o.is_buybox_winner);

  const mainImage = useMemo(() => {
    if (!product) return '';
    const images = Array.isArray(product.images) ? product.images.map((i: any) => rawImgUrl(i)) : [];
    const noPlus = images.find((u: string) => !u.includes('+'));
    if (noPlus) return noPlus;
    return rawImgUrl(product.main_image) || images[0] || '';
  }, [product]);

  const allImages = useMemo(() => {
    if (!product?.images) return [];
    return (Array.isArray(product.images) ? product.images : []).map((i: any) => rawImgUrl(i)).filter(Boolean);
  }, [product]);

  const brandName = useMemo(() => {
    if (!product) return '';
    const bs = product.brand_store?.text;
    if (bs) {
      if (bs.startsWith('Brand: ')) return bs.replace('Brand: ', '');
      if (bs.startsWith('Visit the ')) return bs.replace('Visit the ', '').replace(' Store', '');
      return bs;
    }
    return product.brand || '';
  }, [product]);

  const dailySorted = useMemo(() => {
    if (!dailySalesData) return [];
    return [...dailySalesData].sort((a: any, b: any) => a.record_date.localeCompare(b.record_date));
  }, [dailySalesData]);

  // Aggregated variant data
  const aggregatedDaily = useMemo(() => {
    if (variantMode !== 'all' || !allVariantsData || allVariantsData.length === 0) return dailySorted;
    
    // Group by record_date, sum sales/units/page_views, avg buy_box/conversion
    const byDate: Record<string, { sales: number; units_sold: number; page_views: number; buy_box_percentage: number; conversion_rate: number; count: number; record_date: string; account_name: string; product_title: string }> = {};
    for (const row of allVariantsData) {
      const d = row.record_date;
      if (!byDate[d]) {
        byDate[d] = { sales: 0, units_sold: 0, page_views: 0, buy_box_percentage: 0, conversion_rate: 0, count: 0, record_date: d, account_name: row.account_name, product_title: row.product_title };
      }
      byDate[d].sales += row.sales || 0;
      byDate[d].units_sold += row.units_sold || 0;
      byDate[d].page_views += row.page_views || 0;
      byDate[d].buy_box_percentage += row.buy_box_percentage || 0;
      byDate[d].conversion_rate += row.conversion_rate || 0;
      byDate[d].count += 1;
    }
    return Object.values(byDate)
      .map(d => ({
        ...d,
        buy_box_percentage: d.count > 0 ? d.buy_box_percentage / d.count : 0,
        conversion_rate: d.count > 0 ? d.conversion_rate / d.count : 0,
      }))
      .sort((a, b) => a.record_date.localeCompare(b.record_date));
  }, [variantMode, allVariantsData, dailySorted]);

  const activeDaily = variantMode === 'all' && aggregatedDaily.length > 0 ? aggregatedDaily : dailySorted;

  const filteredDaily = useMemo(() => {
    const cutoff = format(subDays(new Date(), perfPeriod), 'yyyy-MM-dd');
    return activeDaily.filter((d: any) => d.record_date >= cutoff);
  }, [activeDaily, perfPeriod]);

  const latestDaily = activeDaily.length > 0 ? activeDaily[activeDaily.length - 1] : null;
  const prevDaily = activeDaily.length > 1 ? activeDaily[activeDaily.length - 2] : null;
  const accountName = (latestDaily as any)?.account_name || '';

  // Detect if all sales are zero (vendor product)
  const isVendorProduct = useMemo(() => {
    if (!dailySalesData || dailySalesData.length === 0) return false;
    return dailySalesData.every((d: any) => (d.sales || 0) === 0 && (d.units_sold || 0) === 0);
  }, [dailySalesData]);

  const sparkline = (key: string) => activeDaily.slice(-30).map((d: any) => d[key] ?? 0);

  const hasProduct = !!product;
  const hasOffers = offers.length > 0;
  const hasDailySales = activeDaily.length > 0;
  const hasKeywords = (keywordsData?.length ?? 0) > 0;
  const hasCost = !!costData;

  const isLoading = loadingProduct || loadingOffers || loadingDailySales || loadingKeywords || loadingCost;

  const lastUpdated = useMemo(() => {
    const dates = [productData?._cached_at, offersData?._cached_at, (latestDaily as any)?.record_date].filter(Boolean);
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  }, [productData, offersData, latestDaily]);

  // Get variants from SearchAPI product data
  const productVariants = product?.variants || [];

  if (!asin) return null;

  return (
    <AuthGate>
      <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,6%)] via-[hsl(220,40%,10%)] to-[hsl(225,50%,8%)] text-foreground">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-[hsl(222,47%,8%)]/80 border-b border-white/10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-5 w-px bg-white/20" />
              <Link to="/" className="text-white/60 hover:text-white text-sm">Dashboard</Link>
              <ChevronRight className="h-3 w-3 text-white/40" />
              <span className="text-white text-sm font-medium">ASIN Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Jump to ASIN..."
                value={searchAsin}
                onChange={e => setSearchAsin(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter' && searchAsin.length >= 10) navigate(`/asin/${searchAsin}`); }}
                className="w-44 h-8 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm"
              />
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => { if (searchAsin.length >= 10) navigate(`/asin/${searchAsin}`); }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-purple-600/20" />
          <div className="container mx-auto px-4 py-8 relative">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Product Image */}
              <div className="flex-shrink-0">
                {mainImage ? (
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden p-3 cursor-pointer"
                    onClick={() => setLightboxImg(mainImage)}>
                    <ImgWithFallback src={mainImage} fallbacks={allImages} alt={asin} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-white/20" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <button onClick={copyAsin}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-mono text-sm hover:bg-white/20 transition-colors">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {asin}
                  </button>
                  {brandName && (
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30">{brandName}</Badge>
                  )}
                  {accountName && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 hover:bg-purple-500/30">{accountName}</Badge>
                  )}
                  {isVendorProduct && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30">Vendor</Badge>
                  )}

                  {/* Parent/Child ASIN badges */}
                  {parentAsinInfo?.type === 'child' && (
                    <Link to={`/asin/${parentAsinInfo.parentAsin}`}>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/30 cursor-pointer">
                        Child of {parentAsinInfo.parentAsin}
                      </Badge>
                    </Link>
                  )}
                  {parentAsinInfo?.type === 'parent' && (
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
                      Parent — {parentAsinInfo.variantCount} variants
                    </Badge>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-white mb-3 line-clamp-2">
                  {product?.title || (latestDaily as any)?.product_title || 'Loading...'}
                </h1>

                <div className="flex items-center gap-4 mb-4">
                  {product?.rating && <Stars rating={product.rating} count={product.reviews} />}
                  {product?.bought_past_month && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                      <TrendingUp className="h-3 w-3 mr-1" />{product.bought_past_month}
                    </Badge>
                  )}
                </div>

                {product?.link && (
                  <a href={product.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> View on Amazon
                  </a>
                )}

                {/* Variant Toggle */}
                {parentAsinInfo && (
                  <div className="flex items-center gap-1 mt-3 bg-white/5 rounded-lg p-0.5 w-fit border border-white/10">
                    <button
                      onClick={() => setVariantMode('this')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${variantMode === 'this' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'}`}
                    >
                      This Variant
                    </button>
                    <button
                      onClick={() => setVariantMode('all')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${variantMode === 'all' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'}`}
                    >
                      All Variants
                    </button>
                  </div>
                )}

                {/* Data Source Indicators & Last Updated */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <DataDot hasData={hasProduct} label="Product" />
                  <DataDot hasData={hasOffers} label="Offers" />
                  <DataDot hasData={hasDailySales} label="Daily Sales" />
                  <DataDot hasData={hasKeywords} label="Keywords" />
                  <DataDot hasData={hasCost} label="Cost" />
                  {lastUpdated && (
                    <span className="text-xs text-white/40 ml-2">
                      Updated {format(new Date(lastUpdated), 'dd MMM yyyy HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="container mx-auto px-4 -mt-2 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard icon={<DollarSign className="h-4 w-4" />} label="Buybox Price"
              value={product?.buybox?.price?.value ?? product?.price?.value ?? 0}
              prefix={product?.buybox?.price?.symbol || product?.price?.symbol || '£'}
              decimals={2}
              originalPrice={product?.original_price?.value}
              originalSymbol={product?.original_price?.symbol || '£'}
            />
            <KPICard icon={<Users className="h-4 w-4" />} label="Total Sellers"
              value={offers.length} />
            <KPICard icon={<ShieldCheck className="h-4 w-4" />} label="Buy Box %"
              value={(latestDaily as any)?.buy_box_percentage ?? 0} suffix="%"
              prevValue={(prevDaily as any)?.buy_box_percentage}
              sparkline={sparkline('buy_box_percentage')} />
            <KPICard icon={<ShoppingCart className="h-4 w-4" />} label="Daily Sales"
              value={(latestDaily as any)?.sales ?? 0} prefix="£" decimals={0}
              prevValue={(prevDaily as any)?.sales}
              sparkline={sparkline('sales')}
              naText={isVendorProduct ? 'N/A (Vendor)' : undefined} />
            <KPICard icon={<Eye className="h-4 w-4" />} label="Page Views"
              value={(latestDaily as any)?.page_views ?? 0}
              prevValue={(prevDaily as any)?.page_views}
              sparkline={sparkline('page_views')} />
            <KPICard icon={<Percent className="h-4 w-4" />} label="Conversion"
              value={(latestDaily as any)?.conversion_rate ?? 0} suffix="%" decimals={1}
              prevValue={(prevDaily as any)?.conversion_rate}
              sparkline={sparkline('conversion_rate')} />
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="container mx-auto px-4 pb-12">
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-6 flex flex-wrap gap-1">
              <TabsTrigger value="sales" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60 rounded-lg gap-1.5">
                <BarChart3 className="h-4 w-4" /> Sales & Performance
              </TabsTrigger>
              <TabsTrigger value="offers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60 rounded-lg gap-1.5">
                <Store className="h-4 w-4" /> Sellers & Offers
              </TabsTrigger>
              <TabsTrigger value="keywords" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60 rounded-lg gap-1.5">
                <Target className="h-4 w-4" /> Keywords & Ranking
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60 rounded-lg gap-1.5">
                <Package className="h-4 w-4" /> Product Details
              </TabsTrigger>
              <TabsTrigger value="competitive" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60 rounded-lg gap-1.5">
                <UserCheck className="h-4 w-4" /> Competitive Intel
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Sales & Performance ── */}
            <TabsContent value="sales">
              {hasDailySales ? (
                <div className="space-y-6">
                  {/* Vendor product banner */}
                  {isVendorProduct && <VendorBanner accountName={accountName} />}

                  {/* Data source label */}
                  {accountName && (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Info className="h-3 w-3" />
                      Data source: <span className="text-white/60 font-medium">{accountName}</span>
                      {variantMode === 'all' && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px] px-1.5 py-0">All Variants</Badge>}
                    </div>
                  )}

                  <GlassCard>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {(['sales', 'units_sold', 'page_views', 'conversion_rate', 'buy_box_percentage'] as const).map(m => (
                          <Button key={m} size="sm" variant={perfMetric === m ? 'default' : 'ghost'}
                            onClick={() => setPerfMetric(m)}
                            className={perfMetric === m ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}>
                            {m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {([7, 30, 60, 90] as const).map(p => (
                          <Button key={p} size="sm" variant={perfPeriod === p ? 'default' : 'ghost'}
                            onClick={() => setPerfPeriod(p)}
                            className={perfPeriod === p ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}>
                            {p}d
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredDaily}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="record_date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                            tickFormatter={(v: string) => { try { return format(parseISO(v), 'dd MMM'); } catch { return v; } }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(222,47%,12%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                          <Area type="monotone" dataKey={perfMetric} stroke="hsl(210, 100%, 60%)" fill="url(#areaGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total Sales (period)" value={isVendorProduct ? 'N/A' : `£${filteredDaily.reduce((s: number, d: any) => s + (d.sales || 0), 0).toLocaleString()}`} />
                    <StatCard label="Total Units" value={isVendorProduct ? 'N/A' : filteredDaily.reduce((s: number, d: any) => s + (d.units_sold || 0), 0).toLocaleString()} />
                    <StatCard label="Avg Buy Box %" value={`${(filteredDaily.reduce((s: number, d: any) => s + (d.buy_box_percentage || 0), 0) / (filteredDaily.length || 1)).toFixed(1)}%`} />
                    <StatCard label="Avg Conversion" value={`${(filteredDaily.reduce((s: number, d: any) => s + (d.conversion_rate || 0), 0) / (filteredDaily.length || 1)).toFixed(2)}%`} />
                  </div>
                </div>
              ) : (
                <EmptyState icon={BarChart3} title="No Sales Data" description="No Jungle Scout daily sales data found for this ASIN." />
              )}
            </TabsContent>

            {/* ── Tab 2: Sellers & Offers ── */}
            <TabsContent value="offers">
              {hasOffers ? (
                <div className="space-y-6">
                  {buyboxWinner && (
                    <GlassCard className="border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="h-5 w-5 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">Buybox Winner</span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {buyboxWinner.price?.raw || `£${buyboxWinner.price?.value}`}
                          </div>
                          <div className="text-sm text-white/60 mt-1">
                            {buyboxWinner.fulfillment?.third_party_seller?.name
                              ? <a href={buyboxWinner.fulfillment.third_party_seller.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">{buyboxWinner.fulfillment.third_party_seller.name}</a>
                              : buyboxWinner.fulfillment?.sold_by || 'Amazon'}
                            {buyboxWinner.fulfillment?.is_sold_by_amazon && <Badge className="ml-2 bg-orange-500/20 text-orange-300 border-orange-400/30">Amazon</Badge>}
                          </div>
                        </div>
                        <div className="text-right text-sm text-white/50">
                          {buyboxWinner.condition?.text && <div>{buyboxWinner.condition.text}</div>}
                          {buyboxWinner.fulfillment?.fastest_delivery?.text && <div>{buyboxWinner.fulfillment.fastest_delivery.text}</div>}
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  <GlassCard>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-white/50">#</TableHead>
                            <TableHead className="text-white/50">Buybox</TableHead>
                            <TableHead className="text-white/50">Price</TableHead>
                            <TableHead className="text-white/50">Condition</TableHead>
                            <TableHead className="text-white/50">Seller</TableHead>
                            <TableHead className="text-white/50">Ships From</TableHead>
                            <TableHead className="text-white/50">Delivery</TableHead>
                            <TableHead className="text-white/50">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {offers.map((offer: any, i: number) => (
                            <TableRow key={i} className={`border-white/5 ${offer.is_buybox_winner ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                              <TableCell className="text-white/70 font-mono">{offer.position}</TableCell>
                              <TableCell>{offer.is_buybox_winner ? <Check className="h-4 w-4 text-emerald-400" /> : <span className="text-white/20">—</span>}</TableCell>
                              <TableCell className="text-white font-semibold">{offer.price?.raw || `£${offer.price?.value}`}</TableCell>
                              <TableCell>
                                <Badge className={offer.condition?.is_new ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'}>
                                  {offer.condition?.text || 'New'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {offer.fulfillment?.third_party_seller?.name ? (
                                  <div>
                                    <a href={offer.fulfillment.third_party_seller.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm">
                                      {offer.fulfillment.third_party_seller.name}
                                    </a>
                                    {offer.fulfillment.third_party_seller.positive_feedback_percent && (
                                      <div className="text-xs text-white/40">{offer.fulfillment.third_party_seller.positive_feedback_percent}% positive</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-white/70">{offer.fulfillment?.sold_by || 'Amazon'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-white/60 text-sm">{offer.fulfillment?.ships_from || '—'}</TableCell>
                              <TableCell className="text-white/60 text-sm">{offer.fulfillment?.fastest_delivery?.text || '—'}</TableCell>
                              <TableCell className="text-white/60 text-sm">
                                {offer.minimum_order_quantity && offer.maximum_order_quantity
                                  ? `${offer.minimum_order_quantity}-${offer.maximum_order_quantity}`
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCard>
                </div>
              ) : (
                <EmptyState icon={Store} title="No Offers Data" description="No SearchAPI offers data cached for this ASIN.">
                  <Button
                    onClick={fetchOffersData}
                    disabled={fetchingOffers}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {fetchingOffers ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching...</> : <><Store className="h-4 w-4 mr-2" /> Fetch Offers Data</>}
                  </Button>
                </EmptyState>
              )}
            </TabsContent>

            {/* ── Tab 3: Keywords & Ranking ── */}
            <TabsContent value="keywords">
              <div className="space-y-6">
                {/* Search rank positions from SearchAPI */}
                {searchRankData && searchRankData.length > 0 && (
                  <GlassCard>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Search className="h-4 w-4 text-cyan-400" /> Search Rank Positions (SearchAPI)
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-white/50">Keyword</TableHead>
                            <TableHead className="text-white/50">Position</TableHead>
                            <TableHead className="text-white/50">Type</TableHead>
                            <TableHead className="text-white/50">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchRankData.map((r, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5">
                              <TableCell className="text-white">{r.keyword}</TableCell>
                              <TableCell className={getRankColor(r.position)}>#{r.position}</TableCell>
                              <TableCell>
                                <Badge className={r.isSponsored ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'}>
                                  {r.isSponsored ? 'Sponsored' : 'Organic'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white/50 text-sm">{format(new Date(r.date), 'dd MMM HH:mm')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCard>
                )}

                {hasKeywords ? (
                  <GlassCard>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-400" /> Jungle Scout Keywords ({keywordsData!.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-white/50">Keyword</TableHead>
                            <TableHead className="text-white/50">Organic</TableHead>
                            <TableHead className="text-white/50">Sponsored</TableHead>
                            <TableHead className="text-white/50">Search Vol</TableHead>
                            <TableHead className="text-white/50">Trend</TableHead>
                            <TableHead className="text-white/50">PPC Bid</TableHead>
                            <TableHead className="text-white/50">Relevancy</TableHead>
                            <TableHead className="text-white/50">Ease</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {keywordsData!.map((kw: any, i: number) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5">
                              <TableCell className="text-white text-sm max-w-[200px] truncate">{kw.keyword}</TableCell>
                              <TableCell className={getRankColor(kw.organic_rank)}>
                                {kw.organic_rank ? `#${kw.organic_rank}` : '—'}
                              </TableCell>
                              <TableCell className={getRankColor(kw.sponsored_rank)}>
                                {kw.sponsored_rank ? `#${kw.sponsored_rank}` : '—'}
                              </TableCell>
                              <TableCell className="text-white/70">{kw.monthly_search_volume_exact?.toLocaleString() || '—'}</TableCell>
                              <TableCell>
                                {kw.monthly_trend != null ? (
                                  <span className={kw.monthly_trend > 0 ? 'text-emerald-400' : kw.monthly_trend < 0 ? 'text-red-400' : 'text-white/50'}>
                                    {kw.monthly_trend > 0 ? '+' : ''}{kw.monthly_trend}%
                                  </span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-white/70">
                                {kw.ppc_bid_exact ? `£${kw.ppc_bid_exact.toFixed(2)}` : '—'}
                              </TableCell>
                              <TableCell>
                                {kw.relevancy_score != null ? (
                                  <Badge className={kw.relevancy_score >= 7 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : kw.relevancy_score >= 4 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'}>
                                    {kw.relevancy_score}/10
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-white/70">{kw.ease_of_ranking_score ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCard>
                ) : (
                  !searchRankData?.length && (
                    <EmptyState icon={Target} title="No Keywords Data" description="No Jungle Scout keyword data found for this ASIN.">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button disabled className="bg-white/10 text-white/40 cursor-not-allowed">
                              <Target className="h-4 w-4 mr-2" /> Request Keywords
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>Coming soon</p></TooltipContent>
                      </Tooltip>
                    </EmptyState>
                  )
                )}
              </div>
            </TabsContent>

            {/* ── Tab 4: Product Details ── */}
            <TabsContent value="details">
              {hasProduct ? (
                <div className="space-y-6">
                  {/* Feature Bullets */}
                  {product.feature_bullets && product.feature_bullets.length > 0 && (
                    <GlassCard>
                      <h3 className="text-white font-semibold mb-3">Feature Bullets</h3>
                      <ul className="space-y-2">
                        {product.feature_bullets.map((b: string, i: number) => (
                          <li key={i} className="flex gap-2 text-white/80 text-sm">
                            <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  )}

                  {/* Image Gallery */}
                  {allImages.length > 0 && (
                    <GlassCard>
                      <h3 className="text-white font-semibold mb-3">Images ({allImages.length})</h3>
                      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {allImages.map((img: string, i: number) => (
                          <div key={i} className="aspect-square rounded-lg bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-blue-400/50 transition-colors p-1"
                            onClick={() => setLightboxImg(img)}>
                            <ImgWithFallback src={img} alt={`Image ${i + 1}`} className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Variants */}
                  {productVariants.length > 0 && (
                    <GlassCard>
                      <h3 className="text-white font-semibold mb-3">Variants ({productVariants.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {productVariants.slice(0, 24).map((v: any, i: number) => (
                          <Link key={i} to={`/asin/${v.asin}`} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/30 transition-colors">
                            {v.image && <ImgWithFallback src={rawImgUrl(v.image)} alt={v.title || v.asin} className="w-12 h-12 object-contain" />}
                            <span className="text-xs text-white/70 text-center line-clamp-2">{v.title || v.asin}</span>
                            {v.asin && <span className="text-[10px] font-mono text-blue-400">{v.asin}</span>}
                            {v.price?.raw && <span className="text-xs font-semibold text-white">{v.price.raw}</span>}
                          </Link>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Reviews */}
                  {product.top_reviews && product.top_reviews.length > 0 && (
                    <GlassCard>
                      <h3 className="text-white font-semibold mb-3">Top Reviews</h3>
                      <div className="space-y-4">
                        {product.top_reviews.slice(0, 5).map((r: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                              <Stars rating={r.rating} />
                              <span className="text-white font-medium text-sm">{r.title}</span>
                            </div>
                            <p className="text-white/60 text-sm line-clamp-3">{r.body}</p>
                            <div className="text-xs text-white/30 mt-1">{r.author} — {r.date?.raw}</div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              ) : (
                <EmptyState icon={Package} title="No Product Details" description="No SearchAPI product data cached for this ASIN.">
                  <Button
                    onClick={fetchProductData}
                    disabled={fetchingProduct}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {fetchingProduct ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching...</> : <><Package className="h-4 w-4 mr-2" /> Fetch Product Data</>}
                  </Button>
                </EmptyState>
              )}
            </TabsContent>

            {/* ── Tab 5: Competitive Intel ── */}
            <TabsContent value="competitive">
              <EmptyState icon={UserCheck} title="Competitive Intelligence" description="Run a competitor analysis from the Jungle Scout tab to populate this section with competitive data.">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled className="bg-white/10 text-white/40 cursor-not-allowed">
                        <UserCheck className="h-4 w-4 mr-2" /> Request Analysis
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p>Coming soon</p></TooltipContent>
                </Tooltip>
              </EmptyState>
            </TabsContent>
          </Tabs>
        </div>

        {/* Lightbox */}
        {lightboxImg && (
          <Dialog open onOpenChange={() => setLightboxImg(null)}>
            <DialogContent className="max-w-3xl p-2 bg-[hsl(222,47%,10%)] border-white/10">
              <ImgWithFallback src={lightboxImg} fallbacks={allImages} alt="Product" className="w-full h-auto max-h-[80vh] object-contain" />
            </DialogContent>
          </Dialog>
        )}
      </div>
      </TooltipProvider>
    </AuthGate>
  );
};

// ── Subcomponents ──

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 ${className}`}>
    {children}
  </div>
);

const KPICard = ({ icon, label, value, prefix = '', suffix = '', decimals = 0, prevValue, sparkline, originalPrice, originalSymbol, naText }: {
  icon: React.ReactNode; label: string; value: number; prefix?: string; suffix?: string; decimals?: number;
  prevValue?: number; sparkline?: number[]; originalPrice?: number; originalSymbol?: string; naText?: string;
}) => {
  const trend = prevValue != null && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 hover:bg-white/[0.06] transition-colors">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
        {icon} {label}
      </div>
      <div className="flex items-end justify-between gap-1">
        <div>
          <div className="text-xl font-bold text-white">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} naText={naText} />
          </div>
          {originalPrice != null && originalPrice !== value && (
            <div className="text-xs text-white/40 line-through">{originalSymbol}{originalPrice.toFixed(2)}</div>
          )}
          {trend != null && !naText && (
            <div className={`flex items-center gap-0.5 text-xs mt-0.5 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40'}`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        {sparkline && !naText && <MiniSparkline data={sparkline} />}
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
    <div className="text-xs text-white/50 mb-1">{label}</div>
    <div className="text-lg font-bold text-white">{value}</div>
  </div>
);

export default ASINHub;
