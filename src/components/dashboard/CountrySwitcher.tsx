import { BrandCountry } from '@/hooks/useBrandCountries';
import { getCountryFlagImage, getCountryName } from '@/utils/countryUtils';
import { cn } from '@/lib/utils';
import { makeScope } from '@/utils/scope';

export type CountryScope = string; // 'GB' | 'DE' | 'GB#Vendor' | 'ALL_EU' | 'ALL' | 'ALL#Vendor'

interface CountrySwitcherProps {
  countries: BrandCountry[];
  scope: CountryScope;
  onChange: (scope: CountryScope) => void;
  className?: string;
  /** Vendor / Seller, when the client trades through more than one account. */
  arms?: string[];
  /** Named on the whole-business pill so it reads as one company, not a list. */
  clientName?: string | null;
}

interface Option {
  value: string;
  label: string;
  flag?: string | null;
  /** Rendered slightly apart — these are totals, not marketplaces. */
  isTotal?: boolean;
}

export function CountrySwitcher({
  countries,
  scope,
  onChange,
  className,
  arms,
  clientName,
}: CountrySwitcherProps) {
  if (!countries || countries.length < 2) return null;

  const hasEu = countries.some((c) => c.region === 'EU');
  const hasNonEu = countries.some((c) => c.region !== 'EU');
  const multiArm = (arms?.length ?? 0) >= 2;

  const options: Option[] = [];

  if (!multiArm) {
    // Unchanged: one arm, one pill per marketplace.
    countries.forEach((c) => options.push({
      value: c.scope,
      label: getCountryName(c.country_code) || c.country_name,
      flag: getCountryFlagImage(c.country_code),
    }));
    if (hasEu) options.push({ value: 'ALL_EU', label: 'All EU', isTotal: true });
    if (countries.length >= 2) options.push({ value: 'ALL', label: 'All countries', isTotal: true });
  } else {
    // Two arms of one business. Every marketplace pill names its arm, because
    // Portwest and S Green both have a UK·Vendor AND a UK·Seller and the two
    // are different numbers the client reads as separate lines every month.
    // They are never quietly added together under a single "United Kingdom".
    arms!.forEach((arm) => {
      const inArm = countries.filter((c) => c.arm === arm);
      inArm.forEach((c) => options.push({
        value: c.scope,
        label: `${getCountryName(c.country_code) || c.country_name} · ${arm}`,
        flag: getCountryFlagImage(c.country_code),
      }));
      // An arm-wide total only says something new once the arm spans markets —
      // Portwest's twelve vendor markets, but not S Green's single UK vendor
      // account, where it would just repeat the pill next to it.
      if (inArm.length >= 2) {
        options.push({ value: makeScope('ALL', arm), label: `All ${arm.toLowerCase()} markets`, isTotal: true });
      }
    });
    // An EU rollup across arms only adds anything when there is non-EU trade to
    // exclude; otherwise it is the whole business under a second name.
    if (hasEu && hasNonEu) options.push({ value: 'ALL_EU', label: 'All EU', isTotal: true });
    options.push({
      value: 'ALL',
      label: clientName ? `${clientName} — whole business` : 'Whole business',
      isTotal: true,
    });
  }

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm',
        className,
      )}
      role="tablist"
      aria-label="Country scope"
    >
      {options.map((opt) => {
        const active = scope === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap',
              active
                // Selected-market pill: cyan-500 gave white text only 2.43:1.
                // cyan-700 measures 5.36:1 and keeps the same blue→cyan identity.
                ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white shadow-sm'
                : opt.isTotal
                  ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-dashed border-gray-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            {opt.value === 'ALL_EU' ? (
              <img src="/flags/eu.svg" alt="" className="h-3.5 w-5 object-cover rounded-sm" />
            ) : opt.value.startsWith('ALL') ? (
              <img src="/flags/world.svg" alt="" className="h-3.5 w-5 object-cover rounded-sm" />
            ) : opt.flag ? (
              <img src={opt.flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />
            ) : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
