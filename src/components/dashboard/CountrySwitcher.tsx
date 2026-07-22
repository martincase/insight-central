import { BrandCountry } from '@/hooks/useBrandCountries';
import { getCountryFlagImage, getCountryName } from '@/utils/countryUtils';
import { cn } from '@/lib/utils';

export type CountryScope = string; // 'GB' | 'DE' | ... | 'ALL_EU' | 'ALL'

interface CountrySwitcherProps {
  countries: BrandCountry[];
  scope: CountryScope;
  onChange: (scope: CountryScope) => void;
  className?: string;
}

export function CountrySwitcher({ countries, scope, onChange, className }: CountrySwitcherProps) {
  if (!countries || countries.length < 2) return null;
  const hasEu = countries.some((c) => c.region === 'EU');

  const options: Array<{ value: string; label: string; flag?: string | null }> = countries.map((c) => ({
    value: c.country_code,
    label: getCountryName(c.country_code),
    flag: getCountryFlagImage(c.country_code),
  }));

  if (hasEu) options.push({ value: 'ALL_EU', label: 'All EU' });
  if (countries.length >= 2) options.push({ value: 'ALL', label: 'All countries' });

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
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            {opt.value === 'ALL_EU' ? (
              <img src="/flags/eu.svg" alt="" className="h-3.5 w-5 object-cover rounded-sm" />
            ) : opt.value === 'ALL' ? (
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
