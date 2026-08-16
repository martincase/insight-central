import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/** How the rate on screen was arrived at. Mirrors rpc_fx_basis. */
type FxBasis = 'period_average' | 'spot_asof' | 'latest_spot';

interface FxRow {
  quote: string;
  rate: number;
  rateDate: string;
  basis: FxBasis | null;
  /** How many published rates the average is built from. */
  observations: number | null;
  source: string | null;
}

interface ReportingBasisNoteProps {
  /**
   * Currencies (other than GBP) whose figures are converted into GBP anywhere on the
   * page. Empty means nothing is converted and we say so explicitly.
   */
  convertedCurrencies?: string[];
  /**
   * The period on screen, as yyyy-MM-dd. The rate depends on it — July's figures
   * are converted at July's average — so the note must be told which window it is
   * describing rather than reaching for today's spot.
   */
  periodStart?: string;
  periodEnd?: string;
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
 * "the July 2026 average" for a whole calendar month, "the period average" for
 * anything else — the phrase the client email footer uses, so the two read alike.
 */
const describePeriod = (start?: string, end?: string): string => {
  if (!start || !end) return 'the period average';
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  if (!sy || !ey) return 'the period average';
  const wholeMonth =
    sy === ey && sm === em && sd === 1 && ed === new Date(ey, em, 0).getDate();
  if (!wholeMonth) return 'the period average';
  return `the ${format(new Date(sy, sm - 1, 1), 'MMMM yyyy')} average`;
};

/**
 * Compact, collapsible statement of what the numbers on this page actually are:
 * revenue basis, VAT treatment, ad attribution windows, period basis and the exact
 * FX rate — with its basis and date — used for any GBP conversion.
 *
 * The FX line is not decoration. The monthly client email converts a month at the
 * mean of every rate published inside it and prints that in its footer; the
 * dashboard behind the email's button now does the same, and has to say so, or a
 * client reading £1,202,913 in the email and £1,202,913 on screen has no way of
 * knowing the two were computed on the same basis rather than agreeing by luck.
 *
 * The collapsed line must never compete with the numbers — one small grey line.
 */
export const ReportingBasisNote = ({
  convertedCurrencies = [],
  periodStart,
  periodEnd,
  className = '',
}: ReportingBasisNoteProps) => {
  const [open, setOpen] = useState(false);
  const [fx, setFx] = useState<FxRow[] | null>(null);
  const [fxFailed, setFxFailed] = useState(false);

  // Stable primitive key so the effect does not re-fire on array identity alone.
  const currencyKey = useMemo(
    () => Array.from(new Set(convertedCurrencies.filter((c) => c && c.toUpperCase() !== 'GBP').map((c) => c.toUpperCase()))).sort().join(','),
    [convertedCurrencies],
  );

  useEffect(() => {
    if (!currencyKey || !periodStart || !periodEnd) {
      setFx(null);
      setFxFailed(false);
      return;
    }
    const wanted = currencyKey.split(',');
    let cancelled = false;
    (async () => {
      try {
        // rpc_fx_basis returns exactly the rate the RPCs behind these numbers
        // used, for exactly this window — not a second, independently-derived
        // figure that could drift from the one the totals were built on.
        const { data, error } = await (supabase.rpc as any)('rpc_fx_basis', {
          p_start: periodStart,
          p_end: periodEnd,
          p_quotes: wanted,
        });
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setFxFailed(true);
          return;
        }
        const rows: FxRow[] = (data as any[])
          .filter((r) => r.rate != null)
          .map((r) => ({
            quote: r.quote,
            rate: Number(r.rate),
            rateDate: r.rate_date,
            basis: (r.basis as FxBasis) ?? null,
            observations: r.observations != null ? Number(r.observations) : null,
            source: r.source ?? null,
          }));
        if (rows.length === 0) {
          setFxFailed(true);
          return;
        }
        setFx(rows);
        setFxFailed(false);
      } catch {
        if (!cancelled) setFxFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currencyKey, periodStart, periodEnd]);

  /** The single rate_date shared by every rate, or null if they disagree. */
  const singleRateDate = useMemo(() => {
    if (!fx || fx.length === 0) return null;
    const dates = new Set(fx.map((r) => r.rateDate));
    return dates.size === 1 ? fx[0].rateDate : null;
  }, [fx]);

  /** Null when the currencies on screen were not all resolved the same way. */
  const singleBasis = useMemo<FxBasis | null>(() => {
    if (!fx || fx.length === 0) return null;
    const bases = new Set(fx.map((r) => r.basis));
    return bases.size === 1 ? fx[0].basis : null;
  }, [fx]);

  const periodPhrase = useMemo(() => describePeriod(periodStart, periodEnd), [periodStart, periodEnd]);

  const basisPhrase = useMemo(() => {
    if (singleBasis === 'period_average') return periodPhrase;
    if (singleBasis === 'spot_asof') return 'the last rate published in the period';
    if (singleBasis === 'latest_spot') return "today's rate";
    return 'the rate held for this period';
  }, [singleBasis, periodPhrase]);

  const fxSummary = useMemo(() => {
    if (!currencyKey) return null;
    if (!fx || fx.length === 0) return null;
    const first = fx[0];
    // "EUR→GBP 0.8536 · July 2026 average · +4 more" — the rate, then the basis
    // that produced it. Never the rate alone: an unlabelled number here is what
    // let the page and the email disagree without either of them saying so.
    const label = basisPhrase.replace(/^the /, '');
    return `${first.quote}→GBP ${first.rate.toFixed(4)} · ${label}${fx.length > 1 ? ` · +${fx.length - 1} more` : ''}`;
  }, [fx, currencyKey, basisPhrase]);

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
                Non-GBP marketplaces are converted to GBP at {basisPhrase}:{' '}
                {fx.map((r, i) => (
                  <span key={r.quote}>
                    {i > 0 ? ', ' : ''}
                    <span className="font-medium text-gray-700">
                      {r.quote}&rarr;GBP {r.rate.toFixed(6)}
                    </span>
                    {!singleRateDate ? ` (to ${formatRateDate(r.rateDate)})` : ''}
                  </span>
                ))}
                {singleRateDate ? ` (rates to ${formatRateDate(singleRateDate)})` : ''}
                {fx[0].source ? `, source ${fx[0].source}` : ''}.{' '}
                {singleBasis === 'period_average' && (
                  <>
                    The rate is the mean of every rate published inside the period
                    {fx[0].observations ? ` (${fx[0].observations} publications for ${fx[0].quote})` : ''}, so the
                    whole period converts at one rate rather than each day at its own. This is the same basis your
                    monthly performance email uses, and a full calendar month here will match that email exactly.
                  </>
                )}
                {singleBasis === 'spot_asof' && (
                  <>
                    No rate was published inside this period — a single day falling on a weekend or a holiday — so
                    the last rate published on or before it is used.
                  </>
                )}
                {singleBasis === 'latest_spot' && (
                  <>
                    We hold no rate from inside this period, so the most recent rate available is used. This will
                    not tie to a monthly performance email.
                  </>
                )}
                {!singleBasis && (
                  <>
                    The currencies on this page did not all resolve the same way; the basis shown against each rate
                    above is the one applied to it.
                  </>
                )}
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
