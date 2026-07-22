import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useTableSort } from '@/hooks/useTableSort';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import {
  Database, Eye, Star, StarHalf, Package, Search, MapPin, RefreshCw,
  ChevronDown, ChevronUp, Check, X, ShieldCheck, ExternalLink,
  Truck, Tag, Store, ThumbsUp, Image as ImageIcon, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// ── Helpers ──

const formatDate = (d: string | null) => d ? format(new Date(d), 'dd MMM yyyy HH:mm') : '—';

/** Extract raw image URL string from various formats (string, {link:...}, etc.) */
const rawImgUrl = (url: any): string => {
  if (!url) return '';
  if (typeof url === 'object' && url.link) return String(url.link);
  if (typeof url === 'string') return url;
  return String(url);
};

const Stars = ({ rating }: { rating: number | null }) => {
  if (!rating) return <span className="text-muted-foreground text-xs">N/A</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} stars`}>
      {[...Array(full)].map((_, i) => <Star key={`f${i}`} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
      {half && <StarHalf className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
      {[...Array(empty)].map((_, i) => <Star key={`e${i}`} className="h-3.5 w-3.5 text-muted-foreground/30" />)}
      <span className="text-xs ml-1 text-muted-foreground">({rating})</span>
    </span>
  );
};

const AvailabilityBadge = ({ text }: { text: string | null }) => {
  if (!text) return <span className="text-muted-foreground text-xs">—</span>;
  const inStock = text.toLowerCase().includes('in stock');
  return <Badge variant={inStock ? 'default' : 'destructive'} className={inStock ? 'bg-green-600 hover:bg-green-700' : ''}>{inStock ? 'In Stock' : text.length > 20 ? text.slice(0, 20) + '…' : text}</Badge>;
};

const BoolBadge = ({ val, yesLabel = 'Yes', noLabel = 'No' }: { val: boolean | null; yesLabel?: string; noLabel?: string }) =>
  val ? <Badge className="bg-green-600 hover:bg-green-700">{yesLabel}</Badge> : <Badge variant="secondary">{noLabel}</Badge>;

const truncate = (s: string | null, len = 40) => {
  if (!s) return '—';
  return s.length > len ? s.slice(0, len) + '…' : s;
};

/** Extract brand name from brand_store.text like "Brand: Amazon" -> "Amazon" */
const parseBrandName = (product: any): string => {
  const brandStoreText = product?.brand_store?.text;
  if (brandStoreText) {
    if (brandStoreText.startsWith('Brand: ')) return brandStoreText.replace('Brand: ', '');
    if (brandStoreText.startsWith('Visit the ')) return brandStoreText.replace('Visit the ', '').replace(' Store', '');
    return brandStoreText;
  }
  if (product?.brand && product.brand !== '—') return product.brand;
  return '—';
};

// ── Image components with fallback ──

/** Try to load img; on error, try fallback URLs from images array, then hide */
const ImgWithFallback = ({ src, fallbacks = [], alt, className, onClick }: {
  src: string; fallbacks?: string[]; alt: string; className?: string; onClick?: (e: React.MouseEvent) => void;
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => { setCurrentSrc(src); setFallbackIndex(0); setHidden(false); }, [src]);

  if (hidden || !currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => {
        if (fallbackIndex < fallbacks.length) {
          setCurrentSrc(fallbacks[fallbackIndex]);
          setFallbackIndex(prev => prev + 1);
        } else {
          setHidden(true);
        }
      }}
    />
  );
};

const ImageLightbox = ({ src, fallbacks, alt, onClose }: { src: string; fallbacks?: string[]; alt: string; onClose: () => void }) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-3xl p-2 bg-background">
      <ImgWithFallback src={src} fallbacks={fallbacks} alt={alt} className="w-full h-auto max-h-[80vh] object-contain" />
    </DialogContent>
  </Dialog>
);

const ClickableImage = ({ src, fallbacks, alt, className }: { src: string; fallbacks?: string[]; alt: string; className?: string }) => {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <ImgWithFallback
        src={src}
        fallbacks={fallbacks}
        alt={alt}
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      />
      {open && <ImageLightbox src={src} fallbacks={fallbacks} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
};

/** Get main image URL and fallback URLs from product data. Uses raw URLs - no encoding. */
const getMainImageWithFallbacks = (product: any): { src: string; fallbacks: string[] } => {
  const images: any[] = Array.isArray(product?.images) ? product.images : [];
  const allUrls = images.map((img: any) => rawImgUrl(img)).filter(Boolean);
  
  // Primary: use main_image raw URL directly (even with + characters)
  const mainImg = rawImgUrl(product?.main_image);
  
  if (mainImg) {
    // Fallbacks = all images that aren't the same as mainImg
    const fallbacks = allUrls.filter(u => u !== mainImg);
    return { src: mainImg, fallbacks };
  }
  
  // No main_image, use first from images array
  if (allUrls.length > 0) {
    return { src: allUrls[0], fallbacks: allUrls.slice(1) };
  }
  
  return { src: '', fallbacks: [] };
};

// ── Types ──

interface CacheEntry {
  id: string;
  engine: string;
  query_params: Record<string, any>;
  created_at: string;
  expires_at: string;
  brand_title?: string;
  account_id?: string;
  account_name?: string;
}

interface Snapshot {
  id: string;
  asin: string;
  domain: string;
  title: string;
  brand: string;
  price: number | null;
  original_price: number | null;
  rating: number | null;
  reviews_count: number | null;
  bought_past_month: string | null;
  buybox_seller: string | null;
  is_amazon_sold: boolean;
  availability: string | null;
  feature_bullets: any;
  reviews_json: any;
  images_json: any;
  snapshot_at: string;
}

interface RankCheck {
  id: string;
  asin: string;
  keyword: string;
  domain: string;
  position: number | null;
  is_sponsored: boolean;
  is_prime: boolean;
  price: number | null;
  page: number | null;
  total_results: number | null;
  checked_at: string;
  brand?: string;
}

interface AccountOption {
  id: string;
  account_name: string;
}

// ── Data fetching ──

const fetchAccounts = async (): Promise<AccountOption[]> => {
  const { data, error } = await supabase
    .from('accounts_master')
    .select('id, account_name')
    .order('account_name');
  if (error) throw error;
  return (data || []) as AccountOption[];
};

const fetchCacheEntries = async (): Promise<CacheEntry[]> => {
  const { data, error } = await supabase.rpc('get_cache_entries');
  if (error) throw error;
  const entries = (data || []) as CacheEntry[];

  // Fetch account_id from searchapi_cache for all entries
  const entryIds = entries.map(e => e.id);
  let accountMap: Record<string, string> = {};
  if (entryIds.length > 0) {
    const { data: cacheRows } = await supabase
      .from('searchapi_cache')
      .select('id, account_id')
      .in('id', entryIds);
    if (cacheRows) {
      cacheRows.forEach((row: any) => {
        if (row.account_id) accountMap[row.id] = row.account_id;
      });
    }
  }

  // Fetch account names for mapped account_ids
  const uniqueAccountIds = [...new Set(Object.values(accountMap))];
  let accountNameMap: Record<string, string> = {};
  if (uniqueAccountIds.length > 0) {
    const { data: accts } = await supabase
      .from('accounts_master')
      .select('id, account_name')
      .in('id', uniqueAccountIds);
    if (accts) {
      accts.forEach((a: any) => { accountNameMap[a.id] = a.account_name; });
    }
  }

  // Enrich entries
  entries.forEach(e => {
    e.account_id = accountMap[e.id] || undefined;
    e.account_name = e.account_id ? accountNameMap[e.account_id] : undefined;
  });

  const productAsins = entries
    .filter(e => e.engine === 'amazon_product')
    .map(e => e.query_params?.asin)
    .filter(Boolean);

  if (productAsins.length > 0) {
    const { data: snapshots } = await supabase
      .from('product_snapshots')
      .select('asin, brand, title')
      .in('asin', productAsins);
    const snapMap = new Map((snapshots || []).map(s => [s.asin, s]));
    entries.forEach(e => {
      if (e.engine === 'amazon_product') {
        const snap = snapMap.get(e.query_params?.asin);
        if (snap) e.brand_title = `${snap.brand || ''} - ${truncate(snap.title, 50)}`.replace(/^ - /, '');
      }
    });
  }
  return entries;
};

const fetchSnapshots = async (): Promise<Snapshot[]> => {
  const { data, error } = await supabase.rpc('get_all_snapshots');
  if (error) throw error;
  return (data || []) as Snapshot[];
};

const fetchRankChecks = async (snapshots: Snapshot[]): Promise<RankCheck[]> => {
  const { data, error } = await supabase.rpc('get_all_rank_checks');
  if (error) throw error;
  const checks = (data || []) as RankCheck[];
  const brandMap = new Map(snapshots.map(s => [s.asin, s.brand]));
  checks.forEach(c => { c.brand = brandMap.get(c.asin) || ''; });
  return checks;
};

// ── Detail Sub-components ──

const RawJsonToggle = ({ data }: { data: any }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-3 border-t pt-2">
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShow(!show)}>
        {show ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
        {show ? 'Hide' : 'Show'} Raw JSON
      </Button>
      {show && <pre className="text-xs p-3 overflow-auto max-h-72 bg-muted/30 rounded border mt-1">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

const ExpandableText = ({ text, lines = 3 }: { text: string; lines?: number }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className={`text-xs text-muted-foreground ${expanded ? '' : `line-clamp-${lines}`}`}>{text}</p>
      {text.length > 150 && (
        <button className="text-xs text-primary hover:underline mt-0.5" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};

const ReviewCard = ({ r }: { r: any }) => (
  <div className="border rounded-lg p-3 bg-background space-y-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      <Stars rating={r.rating} />
      <span className="font-semibold text-sm">{r.title || 'Untitled'}</span>
      {(r.is_verified || r.verified_purchase) && (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
          <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Verified
        </Badge>
      )}
    </div>
    <ExpandableText text={r.body || r.text || ''} />
    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
      <span>{r.profile?.name || r.author || r.reviewer_name || 'Anonymous'}</span>
      <span>•</span>
      <span>{r.date?.raw || r.date || ''}</span>
      {(r.helpful_votes ?? r.helpful_count) > 0 && (
        <span className="flex items-center gap-0.5 ml-1 text-muted-foreground">
          <ThumbsUp className="h-2.5 w-2.5" /> {r.helpful_votes ?? r.helpful_count}
        </span>
      )}
    </div>
  </div>
);

const CollapsiblePanel = ({ title, icon, children, defaultOpen = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg">
      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors" onClick={() => setOpen(!open)}>
        {icon}
        {title}
        <span className="ml-auto">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
};

// ── Product Detail Card (enhanced) ──

const ProductDetailCard = ({ data }: { data: any }) => {
  const product = data?.product || data?.product_result || data;
  const buybox = product?.buybox || {};
  const fulfillment = buybox?.fulfillment || {};
  const price = buybox?.price?.value ?? product?.price?.value ?? product?.price ?? null;
  const currency = buybox?.price?.currency ?? product?.price?.currency ?? product?.currency ?? '£';
  const originalPrice = buybox?.rrp?.value ?? product?.rrp?.value ?? null;
  const savePercentage = product?.save?.percentage ?? null;
  const soldBy = fulfillment?.sold_by || buybox?.sold_by || product?.buybox_seller || '—';
  const shipsFromVal = fulfillment?.ships_from || product?.ships_from || '—';
  const fulfilledBy = fulfillment?.fulfilled_by || buybox?.fulfilled_by || '—';
  
  const { src: mainImageSrc, fallbacks: mainImageFallbacks } = getMainImageWithFallbacks(product);
  const allImages: string[] = Array.isArray(product?.images) ? product.images.map((img: any) => rawImgUrl(img)).filter(Boolean) : [];
  const title = product?.title || '—';
  const brand = parseBrandName(product);
  const rating = product?.rating ?? null;
  const reviewsCount = typeof product?.reviews === 'number' ? product.reviews
    : product?.reviews_count ?? product?.ratings_total ?? 0;
  const boughtPastMonth = product?.bought_past_month || null;
  const availability = product?.availability?.raw || product?.availability || null;
  const bullets: string[] = Array.isArray(product?.feature_bullets)
    ? product.feature_bullets
    : (typeof product?.feature_bullets_flat === 'string' ? product.feature_bullets_flat.split('\n').filter(Boolean) : []);

  const reviewResults = data?.review_results || product?.review_results || {};
  const localReviews: any[] = Array.isArray(reviewResults?.local) ? reviewResults.local : [];
  const globalReviews: any[] = Array.isArray(reviewResults?.global) ? reviewResults.global : [];
  const topReviews: any[] = Array.isArray(product?.top_reviews) ? product.top_reviews : [];
  const hasReviews = localReviews.length > 0 || globalReviews.length > 0 || topReviews.length > 0;

  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];

  const standardDelivery = product?.standard_delivery?.text || null;
  const fastestDelivery = product?.fastest_delivery?.text || null;
  const secondaryBuybox = product?.secondary_buybox?.price?.raw || null;
  const mixedOffers = product?.mixed_offers_from?.price?.raw || null;
  const maxOrderQty = product?.maximum_order_quantity?.value ?? null;

  const searchAlias = product?.search_alias?.title || null;
  const amazonUrl = data?.search_metadata?.request_url || data?.request_info?.amazon_url || null;
  const has360 = product?.has_360_image ?? false;
  const brandStoreLink = product?.brand_store?.link || null;

  return (
    <div className="border rounded-lg p-5 mt-2 bg-muted/20 space-y-5">
      {/* Meta info bar */}
      {(searchAlias || amazonUrl || has360 || brandStoreLink) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
          {searchAlias && <Badge variant="outline">{searchAlias}</Badge>}
          {has360 && <Badge variant="outline" className="text-[10px]"><ImageIcon className="h-2.5 w-2.5 mr-0.5" />360°</Badge>}
          {amazonUrl && (
            <a href={amazonUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> View on Amazon
            </a>
          )}
          {brandStoreLink && (
            <a href={brandStoreLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Store className="h-3 w-3" /> Brand Store
            </a>
          )}
        </div>
      )}

      {/* Main product header */}
      <div className="flex gap-5">
        {mainImageSrc && (
          <div className="shrink-0">
            <ClickableImage src={mainImageSrc} fallbacks={mainImageFallbacks} alt={title} className="w-[200px] h-[200px] object-contain rounded-lg border bg-white p-2" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <h4 className="font-bold text-base leading-tight">{title}</h4>
          <p className="text-sm text-muted-foreground">Brand: <span className="font-medium text-foreground">{brand}</span></p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{price != null ? `${currency}${Number(price).toFixed(2)}` : '—'}</span>
              {originalPrice != null && originalPrice !== price && (
                <span className="text-sm text-muted-foreground line-through">{currency}{Number(originalPrice).toFixed(2)}</span>
              )}
              {savePercentage && (
                <Badge className="bg-red-600 hover:bg-red-700 text-[10px]">Save {savePercentage}%</Badge>
              )}
            </div>
            <Stars rating={rating} />
            <span className="text-sm text-muted-foreground">{reviewsCount?.toLocaleString()} reviews</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {boughtPastMonth && <span className="flex items-center gap-1">📦 {boughtPastMonth}</span>}
            <AvailabilityBadge text={availability} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span>Sold by: <span className="font-medium text-foreground">{soldBy}</span></span>
            {shipsFromVal !== '—' && <span>Ships from: <span className="font-medium text-foreground">{shipsFromVal}</span></span>}
            {fulfilledBy !== '—' && <span>Fulfilled by: <span className="font-medium text-foreground">{fulfilledBy}</span></span>}
          </div>
        </div>
      </div>

      {/* Image thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.slice(0, 8).map((img, i) => (
            <ClickableImage key={i} src={img} fallbacks={[]} alt={`Image ${i + 1}`} className="h-16 w-16 object-contain rounded border bg-white p-0.5 shrink-0" />
          ))}
        </div>
      )}

      {/* Feature Bullets */}
      {bullets.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Feature Bullets</p>
          <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
            {bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Delivery & Pricing collapsible */}
      {(standardDelivery || fastestDelivery || shipsFromVal !== '—' || secondaryBuybox || mixedOffers || maxOrderQty) && (
        <CollapsiblePanel title="Delivery & Pricing" icon={<Truck className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {standardDelivery && <div><span className="text-muted-foreground">Standard Delivery:</span> <span className="font-medium">{standardDelivery}</span></div>}
            {fastestDelivery && <div><span className="text-muted-foreground">Fastest Delivery:</span> <span className="font-medium">{fastestDelivery}</span></div>}
            {shipsFromVal !== '—' && <div><span className="text-muted-foreground">Ships from:</span> <span className="font-medium">{shipsFromVal}</span></div>}
            {secondaryBuybox && <div><span className="text-muted-foreground">Used from:</span> <span className="font-medium">{secondaryBuybox}</span></div>}
            {mixedOffers && <div><span className="text-muted-foreground">All offers from:</span> <span className="font-medium">{mixedOffers}</span></div>}
            {maxOrderQty && <div><span className="text-muted-foreground">Max order qty:</span> <span className="font-medium">{maxOrderQty}</span></div>}
          </div>
        </CollapsiblePanel>
      )}

      {/* Variants collapsible */}
      {variants.length > 0 && (
        <CollapsiblePanel title={`Variants (${variants.length})`} icon={<Tag className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-2">
            {variants.map((v: any, i: number) => {
              const isCurrent = v.is_current_product === true;
              const variantImage = rawImgUrl(v.main_image) || '';
              const variantTitle = v.title || v.value || v.name || `Variant ${i + 1}`;
              const variantAsin = v.asin || '';
              return (
                <div
                  key={i}
                  className={`border rounded-lg p-2 text-xs flex items-center gap-2 ${isCurrent ? 'ring-2 ring-primary bg-primary/5' : 'bg-background'}`}
                >
                  {variantImage && (
                    <ClickableImage src={variantImage} fallbacks={[]} alt={variantTitle} className="h-10 w-10 object-contain rounded" />
                  )}
                  <div>
                    <p className="font-medium">{variantTitle}</p>
                    {variantAsin && <p className="font-mono text-muted-foreground text-[10px]">{variantAsin}</p>}
                    {isCurrent && <Badge className="text-[9px] py-0 px-1 mt-0.5 bg-primary">Current</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsiblePanel>
      )}

      {/* Reviews collapsible */}
      {hasReviews && (
        <CollapsiblePanel title={`Reviews (${reviewsCount?.toLocaleString() || '—'})`} icon={<Star className="h-3.5 w-3.5" />}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Stars rating={rating} />
              <span className="text-muted-foreground">{reviewsCount?.toLocaleString()} total reviews</span>
            </div>

            {(localReviews.length > 0 || globalReviews.length > 0) ? (
              <Tabs defaultValue={localReviews.length > 0 ? 'local' : 'global'}>
                <TabsList className="h-8">
                  {localReviews.length > 0 && <TabsTrigger value="local" className="text-xs">UK Reviews ({localReviews.length})</TabsTrigger>}
                  {globalReviews.length > 0 && <TabsTrigger value="global" className="text-xs">Global Reviews ({globalReviews.length})</TabsTrigger>}
                </TabsList>
                {localReviews.length > 0 && (
                  <TabsContent value="local">
                    <div className="grid gap-3 md:grid-cols-2">
                      {localReviews.map((r: any, i: number) => <ReviewCard key={i} r={r} />)}
                    </div>
                  </TabsContent>
                )}
                {globalReviews.length > 0 && (
                  <TabsContent value="global">
                    <div className="grid gap-3 md:grid-cols-2">
                      {globalReviews.map((r: any, i: number) => <ReviewCard key={i} r={r} />)}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            ) : topReviews.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {topReviews.slice(0, 8).map((r: any, i: number) => <ReviewCard key={i} r={r} />)}
              </div>
            ) : null}
          </div>
        </CollapsiblePanel>
      )}

      <RawJsonToggle data={data} />
    </div>
  );
};

const SearchDetailCard = ({ data }: { data: any }) => {
  const organic: any[] = data?.organic_results || data?.search_results || (Array.isArray(data) ? data : []);
  const sponsored: any[] = data?.sponsored_results || [];
  const totalResults = data?.search_information?.total_results ?? organic.length;

  return (
    <div className="border rounded-lg p-5 mt-2 bg-muted/20 space-y-4">
      <p className="text-sm font-semibold">Search Results — {totalResults?.toLocaleString()} total results</p>
      {organic.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1 text-muted-foreground">Organic Results ({organic.length})</p>
          <SearchResultsTable results={organic} />
        </div>
      )}
      {sponsored.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1 text-muted-foreground flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">Sponsored</Badge> Sponsored Results ({sponsored.length})
          </p>
          <SearchResultsTable results={sponsored} sponsored />
        </div>
      )}
      <RawJsonToggle data={data} />
    </div>
  );
};

const CacheDetailView = ({ id }: { id: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['cache-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cache_detail', { p_id: id });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">Loading detail…</div>;
  if (!data) return <div className="p-4 text-muted-foreground text-sm">No data found.</div>;

  if (data.offers || data.offer_results) {
    return <OffersDetailCard data={data} />;
  }

  if (data.product || data.product_result || data.title || data.buybox) {
    return <ProductDetailCard data={data} />;
  }
  if (data.organic_results || data.search_results || Array.isArray(data)) {
    return <SearchDetailCard data={data} />;
  }

  return (
    <div className="border rounded-lg p-4 mt-2 bg-muted/20 space-y-2">
      <p className="text-sm text-muted-foreground">Unknown response format:</p>
      <pre className="text-xs p-3 overflow-auto max-h-96 bg-muted/30 rounded border">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

// ── Offers Detail Card ──

const OffersDetailCard = ({ data }: { data: any }) => {
  const product = data?.product || {};
  const offers: any[] = data?.offers || data?.offer_results || [];
  const pagination = data?.pagination || {};
  const title = product?.title || '—';
  const asin = product?.asin || '—';
  const productLink = product?.link || null;
  const rating = product?.rating ?? null;
  const reviewsCount = product?.reviews ?? product?.reviews_count ?? 0;
  const { src: mainImg, fallbacks: mainImgFallbacks } = getMainImageWithFallbacks(product);

  return (
    <div className="border rounded-lg p-5 mt-2 bg-muted/20 space-y-5">
      {/* Product header */}
      <div className="flex gap-4 items-start">
        {mainImg && (
          <ClickableImage src={mainImg} fallbacks={mainImgFallbacks} alt={title} className="w-16 h-16 object-contain rounded border bg-white p-1 shrink-0" />
        )}
        <div className="space-y-1">
          <h4 className="font-bold text-sm leading-tight">{title}</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {productLink ? (
              <a href={productLink} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline inline-flex items-center gap-1">
                {asin} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="font-mono">{asin}</span>
            )}
            <Stars rating={rating} />
            <span>{reviewsCount?.toLocaleString()} reviews</span>
          </div>
        </div>
      </div>

      {/* Offers table */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Store className="h-4 w-4" /> Offers ({offers.length})
          {pagination.total_pages > 1 && <span className="text-xs text-muted-foreground font-normal">Page {pagination.current} of {pagination.total_pages}</span>}
        </p>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-10">Buybox</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Ships From</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer: any, i: number) => {
                const isBuybox = offer.is_buybox_winner === true;
                const condition = offer.condition?.text || (offer.condition?.is_new ? 'New' : 'Used');
                const isNew = offer.condition?.is_new !== false;
                const seller = offer.fulfillment?.third_party_seller?.name || offer.fulfillment?.sold_by || '—';
                const sellerLink = offer.fulfillment?.third_party_seller?.link || null;
                const sellerRating = offer.fulfillment?.third_party_seller?.rating ?? null;
                const sellerFeedback = offer.fulfillment?.third_party_seller?.positive_feedback_percent ?? null;
                const sellerReviews = offer.fulfillment?.third_party_seller?.reviews ?? null;
                const shipsFrom = offer.fulfillment?.ships_from || '—';
                const delivery = offer.fulfillment?.fastest_delivery?.text || offer.fulfillment?.standard_delivery?.text || '—';
                const priceVal = offer.price?.raw || (offer.price?.value != null ? `${offer.price?.symbol || '£'}${offer.price.value}` : '—');
                const minQty = offer.minimum_order_quantity ?? null;
                const maxQty = offer.maximum_order_quantity ?? null;

                return (
                  <TableRow key={i} className={isBuybox ? 'bg-green-50 dark:bg-green-950/20 border-l-2 border-l-green-500' : ''}>
                    <TableCell className="font-mono text-xs font-bold">{offer.position || i + 1}</TableCell>
                    <TableCell>
                      {isBuybox ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-bold text-sm">{priceVal}</TableCell>
                    <TableCell>
                      <Badge variant={isNew ? 'default' : 'secondary'} className={isNew ? 'bg-green-600 hover:bg-green-700' : ''}>
                        {condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px]">
                      <div>
                        {sellerLink ? (
                          <a href={sellerLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                            {truncate(seller, 25)}
                          </a>
                        ) : (
                          <span className="font-medium">{truncate(seller, 25)}</span>
                        )}
                        {(sellerRating || sellerFeedback) && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {sellerRating && <span>Rating: {sellerRating}</span>}
                            {sellerFeedback && <span className="ml-1">({sellerFeedback}% positive)</span>}
                            {sellerReviews && <span className="ml-1">· {sellerReviews} reviews</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{shipsFrom}</TableCell>
                    <TableCell className="text-xs max-w-[150px]">{truncate(delivery, 30)}</TableCell>
                    <TableCell className="text-xs">
                      {minQty || maxQty ? `${minQty || 1}–${maxQty || '∞'}` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <RawJsonToggle data={data} />
    </div>
  );
};

const SearchResultsTable = ({ results, sponsored = false }: { results: any[]; sponsored?: boolean }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="overflow-auto max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-12">Image</TableHead>
            <TableHead>ASIN</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Recent Sales</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Prime</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, i) => {
            const isExpanded = expandedIdx === i;
            const priceVal = r.extracted_price ?? r.price?.value ?? r.price ?? null;
            const currency = r.price?.currency ?? r.currency ?? '£';
            const originalPrice = r.original_price?.value ?? null;
            const recentSales = r.recent_sales || r.bought_past_month || null;
            const coupon = r.coupon?.badge_text || r.coupon?.text || r.coupon || null;
            const isLimitedDeal = r.is_limited_time_deal === true;
            const isSmallBiz = r.is_small_business === true;
            const moreOffers = r.more_offers || null;
            const tags = Array.isArray(r.tags) ? r.tags : [];
            const brand = r.brand || '—';

            return (
              <React.Fragment key={i}>
                <TableRow className="cursor-pointer" onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                  <TableCell className="font-mono text-xs font-bold">{r.position || i + 1}</TableCell>
                  <TableCell>
                    {r.thumbnail ? (
                      <ClickableImage src={rawImgUrl(r.thumbnail)} fallbacks={[]} alt={r.title || ''} className="h-10 w-10 object-contain rounded" />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.asin || '—'}</TableCell>
                  <TableCell className="text-xs font-medium" title={brand}>{truncate(brand, 18)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{priceVal != null ? `${currency}${Number(priceVal).toFixed(2)}` : '—'}</span>
                      {originalPrice != null && originalPrice !== priceVal && (
                        <span className="line-through text-muted-foreground text-[10px]">{currency}{Number(originalPrice).toFixed(2)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Stars rating={r.rating} /></TableCell>
                  <TableCell className="text-xs">{(r.reviews_count ?? r.ratings_total)?.toLocaleString() || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[120px]" title={recentSales || ''}>{recentSales ? truncate(recentSales, 20) : '—'}</TableCell>
                  <TableCell>
                    {r.is_sponsored || sponsored ? (
                      <Badge variant="secondary" className="text-[10px]">Sponsored</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Organic</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.is_prime ? <Badge className="bg-blue-600 hover:bg-blue-700">Prime</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setExpandedIdx(isExpanded ? null : i); }}>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={11} className="bg-muted/30 p-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-sm mb-1">Product Details</p>
                          <p className="text-muted-foreground" title={r.title}><span className="font-medium text-foreground">Title:</span> {r.title || '—'}</p>
                          {r.asin && <p><span className="text-muted-foreground">ASIN:</span> <span className="font-mono">{r.asin}</span></p>}
                          {r.link && (
                            <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> View on Amazon
                            </a>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="font-semibold text-sm mb-1">Badges & Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {isLimitedDeal && <Badge className="bg-red-600 hover:bg-red-700 text-[10px]">⏰ Limited Deal</Badge>}
                            {isSmallBiz && <Badge className="bg-amber-600 hover:bg-amber-700 text-[10px]">🏪 Small Business</Badge>}
                            {typeof coupon === 'string' && coupon && <Badge className="bg-green-600 hover:bg-green-700 text-[10px]">🎟️ {coupon}</Badge>}
                            {tags.map((t: any, ti: number) => (
                              <Badge key={ti} variant="outline" className="text-[10px]">{typeof t === 'string' ? t : t?.text || JSON.stringify(t)}</Badge>
                            ))}
                            {!isLimitedDeal && !isSmallBiz && !coupon && tags.length === 0 && <span className="text-muted-foreground">None</span>}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="font-semibold text-sm mb-1">More Offers</p>
                          {moreOffers ? (
                            <div>
                              {moreOffers.offers_count && <p><span className="text-muted-foreground">Offers:</span> {moreOffers.offers_count}</p>}
                              {moreOffers.lowest_price?.raw && <p><span className="text-muted-foreground">Lowest:</span> <span className="font-semibold">{moreOffers.lowest_price.raw}</span></p>}
                              {moreOffers.link && (
                                <a href={moreOffers.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                                  <ExternalLink className="h-3 w-3" /> View all offers
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

// ── ASIN Lookup Form ──

const DOMAINS = [
  { value: 'amazon.co.uk', label: 'amazon.co.uk' },
  { value: 'amazon.com', label: 'amazon.com' },
  { value: 'amazon.de', label: 'amazon.de' },
  { value: 'amazon.fr', label: 'amazon.fr' },
  { value: 'amazon.es', label: 'amazon.es' },
  { value: 'amazon.it', label: 'amazon.it' },
];

const LOOKUP_TYPES = [
  { value: 'product', label: 'Product Details' },
  { value: 'search', label: 'Search by Keyword' },
  { value: 'offers', label: 'Offers / Sellers' },
];

const EDGE_FN_BASE = 'https://wgrephgnrldsyipbvjco.supabase.co/functions/v1';

const LookupForm = ({ accounts, defaultAccountId }: { accounts: AccountOption[]; defaultAccountId?: string }) => {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [domain, setDomain] = useState('amazon.co.uk');
  const [lookupType, setLookupType] = useState('product');
  const [accountId, setAccountId] = useState(defaultAccountId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultAccountId && !accountId) setAccountId(defaultAccountId);
  }, [defaultAccountId]);

  const isSearch = lookupType === 'search';

  const handleLookup = async () => {
    const val = inputValue.trim();
    if (!val) return;

    setLoading(true);
    try {
      let url = '';
      let body: Record<string, string> = {};

      if (lookupType === 'product') {
        url = `${EDGE_FN_BASE}/searchapi-amazon-product`;
        body = { asin: val, amazon_domain: domain };
      } else if (lookupType === 'search') {
        url = `${EDGE_FN_BASE}/searchapi-amazon-search`;
        body = { query: val, amazon_domain: domain };
      } else {
        url = `${EDGE_FN_BASE}/searchapi-amazon-offers`;
        body = { asin: val, amazon_domain: domain };
      }

      // Include account_id if selected (not the "all" placeholder)
      if (accountId && accountId !== '__all__') {
        body.account_id = accountId;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // If account_id was selected, update the most recent cache entry with it
      if (accountId && accountId !== '__all__') {
        // Find the most recent cache entry (just created by the edge function)
        const { data: recentCache } = await supabase
          .from('searchapi_cache')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (recentCache) {
          await supabase
            .from('searchapi_cache')
            .update({ account_id: accountId })
            .eq('id', recentCache.id);
        }
      }

      toast({ title: 'Lookup complete', description: 'Data refreshing…' });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['searchapi-cache-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['searchapi-snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['searchapi-rank-checks'] }),
      ]);
    } catch (err: any) {
      toast({ title: 'Lookup failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> New Lookup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isSearch ? 'Keyword' : 'ASIN'}
            </label>
            <Input
              placeholder={isSearch ? 'Enter keyword e.g. wireless earbuds' : 'Enter ASIN e.g. B09B96TG33'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <div className="w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Domain</label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOMAINS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lookup Type</label>
            <Select value={lookupType} onValueChange={setLookupType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOOKUP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Account (optional)</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleLookup} disabled={loading || !inputValue.trim()} className="min-w-[100px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Lookup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Section A: Recent API Lookups ──

const InlineAccountSelect = ({ entryId, currentAccountId, accounts, onUpdated }: {
  entryId: string; currentAccountId?: string; accounts: AccountOption[]; onUpdated: () => void;
}) => {
  const [saving, setSaving] = useState(false);
  const handleChange = async (val: string) => {
    if (val === '__none__') return;
    setSaving(true);
    try {
      await supabase.from('searchapi_cache').update({ account_id: val }).eq('id', entryId);
      toast({ title: 'Account assigned', description: 'Lookup tagged with account.' });
      onUpdated();
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return (
    <Select value={currentAccountId || '__none__'} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="h-6 text-[10px] w-[130px] px-1.5">
        <SelectValue placeholder="Assign…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" disabled>Assign account…</SelectItem>
        {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

const RecentLookups = ({ filterAccountId, accounts }: { filterAccountId?: string; accounts: AccountOption[] }) => {
  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['searchapi-cache-entries'],
    queryFn: fetchCacheEntries,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter by account if set
  const filteredEntries = filterAccountId && filterAccountId !== '__all__'
    ? entries.filter(e => e.account_id === filterAccountId)
    : entries;

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: filteredEntries,
    defaultSortField: 'created_at' as keyof CacheEntry,
    defaultSortDirection: 'desc',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Recent API Lookups</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cache entries found.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field={'engine' as keyof CacheEntry} currentField={sortField} direction={sortDirection} onSort={handleSort}>Type</SortableTableHead>
                  <TableHead>Query / ASIN</TableHead>
                  <TableHead>Brand / Title</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Domain</TableHead>
                  <SortableTableHead field={'created_at' as keyof CacheEntry} currentField={sortField} direction={sortDirection} onSort={handleSort}>Pulled At</SortableTableHead>
                  <TableHead>Cache</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map(entry => {
                  const isProduct = entry.engine === 'amazon_product';
                  const isOffers = entry.engine === 'amazon_offers';
                  const isSearchEntry = !isProduct && !isOffers;
                  const queryVal = isProduct || isOffers ? entry.query_params?.asin : (entry.query_params?.keyword || entry.query_params?.search_term || '—');
                  const fresh = new Date(entry.expires_at) > new Date();
                  const isExpanded = expandedId === entry.id;
                  const typeBadge = isProduct ? { icon: <Package className="h-3 w-3 mr-1" />, label: 'Product' }
                    : isOffers ? { icon: <Store className="h-3 w-3 mr-1" />, label: 'Offers' }
                    : { icon: <Search className="h-3 w-3 mr-1" />, label: 'Search' };
                  return (
                    <React.Fragment key={entry.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {typeBadge.icon}
                            {typeBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs" title={queryVal}>{truncate(queryVal, 30)}</TableCell>
                        <TableCell className="text-xs max-w-[200px]" title={entry.brand_title || queryVal}>{truncate(entry.brand_title || (isProduct ? queryVal : entry.query_params?.keyword) || '—', 40)}</TableCell>
                        <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                          {entry.account_name ? (
                            <Badge variant="outline" className="text-[10px]">{entry.account_name}</Badge>
                          ) : (
                            <InlineAccountSelect entryId={entry.id} accounts={accounts} onUpdated={() => refetch()} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{entry.query_params?.domain || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(entry.created_at)}</TableCell>
                        <TableCell>{fresh ? <Badge className="bg-green-600 hover:bg-green-700">Fresh</Badge> : <Badge variant="secondary">Expired</Badge>}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0 px-2 pb-2">
                            <CacheDetailView id={entry.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Section B: Product Snapshots ──

const ProductSnapshots = ({ snapshots }: { snapshots: Snapshot[] }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: snapshots,
    defaultSortField: 'snapshot_at' as keyof Snapshot,
    defaultSortDirection: 'desc',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Product Snapshots ({snapshots.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots found.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field={'brand' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>Brand</SortableTableHead>
                  <SortableTableHead field={'asin' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>ASIN</SortableTableHead>
                  <TableHead>Title</TableHead>
                  <SortableTableHead field={'price' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>Price</SortableTableHead>
                  <SortableTableHead field={'rating' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>Rating</SortableTableHead>
                  <SortableTableHead field={'reviews_count' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>Reviews</SortableTableHead>
                  <TableHead>Bought/Month</TableHead>
                  <TableHead>Buybox</TableHead>
                  <TableHead>Amazon Sold</TableHead>
                  <TableHead>Availability</TableHead>
                  <SortableTableHead field={'snapshot_at' as keyof Snapshot} currentField={sortField} direction={sortDirection} onSort={handleSort}>Snapshot</SortableTableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map(snap => {
                  const isExpanded = expandedId === snap.id;
                  return (
                    <React.Fragment key={snap.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : snap.id)}>
                        <TableCell className="font-medium text-xs">{snap.brand || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{snap.asin}</TableCell>
                        <TableCell className="max-w-[180px] text-xs" title={snap.title}>{truncate(snap.title, 35)}</TableCell>
                        <TableCell className="text-xs">{snap.price != null ? `£${snap.price.toFixed(2)}` : '—'}</TableCell>
                        <TableCell><Stars rating={snap.rating} /></TableCell>
                        <TableCell className="text-xs">{snap.reviews_count?.toLocaleString() || '—'}</TableCell>
                        <TableCell className="text-xs">{snap.bought_past_month || '—'}</TableCell>
                        <TableCell className="text-xs" title={snap.buybox_seller || ''}>{truncate(snap.buybox_seller, 20)}</TableCell>
                        <TableCell>{snap.is_amazon_sold ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}</TableCell>
                        <TableCell><AvailabilityBadge text={snap.availability} /></TableCell>
                        <TableCell className="text-xs">{formatDate(snap.snapshot_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={12} className="p-4 bg-muted/20">
                            <SnapshotDetail snap={snap} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SnapshotDetail = ({ snap }: { snap: Snapshot }) => {
  const bullets: string[] = Array.isArray(snap.feature_bullets) ? snap.feature_bullets : [];
  const reviews: any[] = Array.isArray(snap.reviews_json) ? snap.reviews_json : [];
  const images: any[] = Array.isArray(snap.images_json) ? snap.images_json : [];

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.slice(0, 6).map((img: any, i: number) => (
            <ClickableImage key={i} src={rawImgUrl(img)} fallbacks={[]} alt={`${snap.title} image ${i + 1}`} className="h-20 w-20 object-contain rounded border bg-white" />
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Feature Bullets:</p>
          <ul className="list-disc pl-5 text-xs space-y-0.5 text-muted-foreground">
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}
      {reviews.length > 0 && (
        <CollapsiblePanel title={`Reviews (${reviews.length})`} icon={<Star className="h-3 w-3" />}>
          <div className="grid gap-2 md:grid-cols-2">
            {reviews.slice(0, 6).map((r: any, i: number) => <ReviewCard key={i} r={r} />)}
          </div>
        </CollapsiblePanel>
      )}
      <div className="text-xs text-muted-foreground">
        Domain: {snap.domain} • Original Price: {snap.original_price != null ? `£${snap.original_price.toFixed(2)}` : '—'}
      </div>
    </div>
  );
};

// ── Section C: Rank Checks ──

const RankChecks = ({ snapshots }: { snapshots: Snapshot[] }) => {
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['searchapi-rank-checks'],
    queryFn: () => fetchRankChecks(snapshots),
    enabled: snapshots.length >= 0,
  });
  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: checks,
    defaultSortField: 'checked_at' as keyof RankCheck,
    defaultSortDirection: 'desc',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Rank Checks ({checks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rank checks found.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field={'asin' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>ASIN</SortableTableHead>
                  <SortableTableHead field={'brand' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Brand</SortableTableHead>
                  <SortableTableHead field={'keyword' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Keyword</SortableTableHead>
                  <TableHead>Domain</TableHead>
                  <SortableTableHead field={'position' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Position</SortableTableHead>
                  <SortableTableHead field={'page' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Page</SortableTableHead>
                  <TableHead>Sponsored</TableHead>
                  <SortableTableHead field={'total_results' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Total Results</SortableTableHead>
                  <SortableTableHead field={'checked_at' as keyof RankCheck} currentField={sortField} direction={sortDirection} onSort={handleSort}>Checked At</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map(check => (
                  <TableRow key={check.id}>
                    <TableCell className="font-mono text-xs">{check.asin}</TableCell>
                    <TableCell className="text-xs font-medium">{check.brand || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[150px]" title={check.keyword}>{truncate(check.keyword, 30)}</TableCell>
                    <TableCell className="text-xs">{check.domain}</TableCell>
                    <TableCell><span className="text-lg font-bold">{check.position ?? '—'}</span></TableCell>
                    <TableCell className="text-xs">{check.page ?? '—'}</TableCell>
                    <TableCell><BoolBadge val={check.is_sponsored} yesLabel="Sponsored" noLabel="Organic" /></TableCell>
                    <TableCell className="text-xs">{check.total_results?.toLocaleString() || '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(check.checked_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main Dashboard ──

interface SearchAPIDashboardProps {
  focusedAccountName?: string;
}

export const SearchAPIDashboard = ({ focusedAccountName }: SearchAPIDashboardProps) => {
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ['searchapi-snapshots'],
    queryFn: fetchSnapshots,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['searchapi-accounts'],
    queryFn: fetchAccounts,
  });

  // Find the account_id matching the focused account name
  const matchedAccount = focusedAccountName
    ? accounts.find(a => a.account_name.toLowerCase() === focusedAccountName.toLowerCase())
    : undefined;
  const defaultAccountId = matchedAccount?.id || '';

  return (
    <div className="space-y-6">
      <LookupForm accounts={accounts} defaultAccountId={defaultAccountId} />

      <CollapsibleSection title="Recent API Lookups" storageKey="searchapi_lookups" defaultOpen={true} icon={<Database className="h-5 w-5 text-muted-foreground" />}>
        <RecentLookups filterAccountId={defaultAccountId} accounts={accounts} />
      </CollapsibleSection>

      <CollapsibleSection title="Product Snapshots" storageKey="searchapi_snapshots" defaultOpen={true} icon={<Package className="h-5 w-5 text-muted-foreground" />}>
        {snapshotsLoading ? <p className="text-sm text-muted-foreground p-4">Loading snapshots…</p> : <ProductSnapshots snapshots={snapshots} />}
      </CollapsibleSection>

      <CollapsibleSection title="Rank Checks" storageKey="searchapi_ranks" defaultOpen={true} icon={<MapPin className="h-5 w-5 text-muted-foreground" />}>
        <RankChecks snapshots={snapshots} />
      </CollapsibleSection>
    </div>
  );
};
