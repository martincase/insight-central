import { cn } from '@/lib/utils';
import { getCountryFlagImage, getCountryName } from '@/utils/countryUtils';
import { scopeArea } from '@/utils/scope';

/**
 * One flag, one size, one fallback — everywhere.
 *
 * We only hold artwork for a handful of markets (GB/US/DE/FR/AU/IT/ES plus the
 * EU and world marks). Portwest also trades in NL, BE, IE, SE and PL, and those
 * used to render as bare text sitting next to flagged siblings, which read as a
 * bug rather than a decision. Anything without artwork now gets a country-code
 * chip of exactly the same footprint, so a list of markets stays on one grid
 * whichever ones the client happens to sell in.
 *
 * Accepts a full scope token as well as a country code, so 'GB#Vendor' →
 * British flag, 'ALL#Vendor' → world, 'ALL_EU' → EU.
 */

const SIZES = {
  /** Inline with body text: menu rows, table cells, pills. */
  sm: { box: 'h-3.5 w-5', text: 'text-[8px]' },
  /** The page header beside the client name. */
  lg: { box: 'w-6 h-4 md:w-10 md:h-7', text: 'text-[9px] md:text-xs' },
} as const;

interface CountryFlagProps {
  /** 'GB', 'ALL', 'ALL_EU', or a scope token such as 'GB#Vendor'. */
  code?: string | null;
  size?: keyof typeof SIZES;
  /** Extra classes — merged onto whichever of the two forms renders. */
  className?: string;
  /** Only set this where the flag is the sole label for something. */
  alt?: string;
}

export function CountryFlag({ code, size = 'sm', className, alt = '' }: CountryFlagProps) {
  const area = scopeArea(code).toUpperCase();
  const dims = SIZES[size];

  const src =
    area === 'ALL_EU' ? '/flags/eu.svg'
    : area === 'ALL' ? '/flags/world.svg'
    : getCountryFlagImage(area);

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(dims.box, 'flex-shrink-0 object-cover rounded-sm', className)}
      />
    );
  }

  // No artwork. A code chip keeps the row aligned instead of leaving a hole.
  if (area.length !== 2) return null;
  return (
    <span
      role="img"
      aria-label={alt || getCountryName(area)}
      title={getCountryName(area)}
      className={cn(
        dims.box,
        dims.text,
        'flex-shrink-0 inline-flex items-center justify-center rounded-sm border border-gray-300',
        'bg-gray-100 font-semibold uppercase leading-none tracking-tight text-gray-600',
        className,
      )}
    >
      {area}
    </span>
  );
}
