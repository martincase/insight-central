import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface FxRow {
  quote: string;
  rate: number;
  rateDate: string;
  source: string | null;
}

interface ReportingBasisNoteProps {
  /**
   * Currencies (other than GBP) whose figures are converted into GBP anywhere on the
   * page. Empty means nothing is converted and we say so explicitly.
   */
  convertedCurrencies?: string[];
  className?: string;
}

const formatRateDate = (iso: string): string => {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return format(dt, 'd MMM yyyy');
  } catch {
    return iso;
  }
};

/**
 * Compact, collapsible statement of what the numbers on this page actually are:
 * revenue basis, VAT treatment, ad attribution windows, period basis and the exact
 * FX rate (with its date) used for any GBP conversion.
 *
 * The collapsed line must never compete with the numbers — one small grey line.
 */
export const ReportingBasisNote = ({ convertedCurrencies = [], className = '' }: ReportingBasisNoteProps) => {
  const [open, setOpen] = useState(false);
  const [fx, setFx] = useState<FxRow[] | null>(null);
  const [fxFailed, setFxFailed] = useState(false);

  // Stable primitive key so the effect does not re-fire on array identity alone.
  const currencyKey = useMemo(
    () => Array.from(new Set(convertedCurrencies.filter((c) => c && c.toUpperCase() !== 'GBP').map((c) => c.toUpperCase()))).sort().join(','),
    [convertedCurrencies],
  );

  useEffect(() => {
    if (!currencyKey) {
      setFx(null);
      setFxFailed(false);
      return;
    }
    const wanted = currencyKey.split(',');
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('fx_rates')
          .select('quote, rate, rate_date, source')
          .in('quote', wanted)
          .order('rate_date', { ascending: false })
          .limit(200);
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setFxFailed(true);
          return;
        }
        // Keep the most recent row per currency, EUR first (the most material for
        // these accounts), then alphabetical.
        const seen = new Set<string>();
        const rows: FxRow[] = [];
        for (const r of data as any[]) {
          if (seen.has(r.quote)) continue;
          seen.add(r.quote);
          rows.push({ quote: r.quote, rate: Number(r.rate), rateDate: r.rate_date, source: r.source ?? null });
        }
        rows.sort((a, b) => {
          if (a.quote === 'EUR') return -1;
          if (b.quote === 'EUR') return 1;
          return a.quote.localeCompare(b.quote);
        });
        setFx(rows);
        setFxFailed(false);
      } catch {
        if (!cancelled) setFxFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currencyKey]);

  /** The single rate_date shared by every rate, or null if they disagree. */
  const singleRateDate = useMemo(() => {
    if (!fx || fx.length === 0) return null;
    const dates = new Set(fx.map((r) => r.rateDate));
    return dates.size === 1 ? fx[0].rateDate : null;
  }, [fx]);

  const fxSummary = useMemo(() => {
    if (!currencyKey) return null;
    if (!fx || fx.length === 0) return null;
    const first = fx[0];
    return `${first.quote}→GBP ${first.rate.toFixed(4)} @ ${formatRateDate(first.rateDate)}${fx.length > 1 ? ` (+${fx.length - 1} more)` : ''}`;
  }, [fx, currencyKey]);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 md:px-4 md:py-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[11px] md:text-xs leading-snug text-gray-600">
          <span className="font-semibold text-gray-700">Basis:</span>{' '}
          Amazon ordered revenue, inclusive of VAT, on an ordered basis (not shipped or settled)
          <span className="hidden sm:inline">
            {' · '}ads: Sponsored Products 7-day, Sponsored Brands &amp; Display 14-day attribution
          </span>
          {fxSummary ? <>{' · '}{fxSummary}</> : null}
        </span>
        <span className="flex flex-shrink-0 items-center gap-1 text-[11px] md:text-xs text-blue-700">
          <span className="hidden sm:inline">{open ? 'Hide' : 'Details'}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2 text-[11px] md:text-xs leading-relaxed text-gray-600">
          <p>
            <span className="font-semibold text-gray-700">Revenue.</span>{' '}
            Amazon ordered revenue, inclusive of VAT, on an ordered basis — not shipped or settled, so it will
            not tie to a remittance report or settlement statement.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Advertising.</span>{' '}
            Advertising combines Sponsored Products (7-day attribution) with Sponsored Brands and Sponsored
            Display (14-day attribution).
          </p>
          <p>
            <span className="font-semibold text-gray-700">Not a profit figure.</span>{' '}
            Sales shown here are gross revenue: they are not net of returns, refunds or Amazon fees, and no COGS
            or margin is deducted. Profit &amp; Loss, where enabled, is the only view that applies costs.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Period.</span>{' '}
            Dates are calendar days in the marketplace's local reporting time. Presets such as “Last 14 Days”
            are rolling windows and can straddle two calendar months, so they will not match a month-end figure.
            The most recent day or two can still be incomplete while Amazon finalises reporting, so treat them
            as estimated.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Currency / FX.</span>{' '}
            {!currencyKey && <>All figures are shown in GBP as reported by Amazon — no exchange-rate conversion is applied.</>}
            {currencyKey && fx && fx.length > 0 && (
              <>
                Non-GBP marketplaces are converted to GBP at the daily rate held in our FX table:{' '}
                {fx.map((r, i) => (
                  <span key={r.quote}>
                    {i > 0 ? ', ' : ''}
                    <span className="font-medium text-gray-700">
                      {r.quote}&rarr;GBP {r.rate.toFixed(6)}
                    </span>
                    {!singleRateDate ? ` (${formatRateDate(r.rateDate)})` : ''}
                  </span>
                ))}
                {singleRateDate ? ` as at ${formatRateDate(singleRateDate)}` : ''}
                {fx[0].source ? ` (source: ${fx[0].source})` : ''}. The whole period is converted at this single
                rate, not at each day's rate, so the GBP total will move as the rate moves.
              </>
            )}
            {currencyKey && (fxFailed || (fx && fx.length === 0)) && (
              <>
                Non-GBP marketplaces are converted to GBP, but the exchange rate and its date could not be
                loaded just now. Please ask your account manager to confirm the rate before relying on the GBP
                total.
              </>
            )}
            {currencyKey && !fx && !fxFailed && <>Loading the exchange rate used for GBP conversion…</>}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportingBasisNote;
