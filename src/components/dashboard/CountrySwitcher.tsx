import { Fragment, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { BrandCountry } from '@/hooks/useBrandCountries';
import { getCountryName } from '@/utils/countryUtils';
import { cn } from '@/lib/utils';
import { makeScope, scopeArea, scopeArm } from '@/utils/scope';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { CountryFlag } from './CountryFlag';

export type CountryScope = string; // 'GB' | 'DE' | 'GB#Vendor' | 'ALL_EU' | 'ALL' | 'ALL#Vendor'

interface CountrySwitcherProps {
  countries: BrandCountry[];
  scope: CountryScope;
  onChange: (scope: CountryScope) => void;
  className?: string;
  /** Vendor / Seller, when the client trades through more than one account. */
  arms?: string[];
  /** Named on the whole-business option so it reads as one company, not a list. */
  clientName?: string | null;
}

interface Option {
  value: string;
  /** Full name, arm included — what the trigger and the inline pills print. */
  label: string;
  /** Name without the arm — inside an arm group the heading already says it. */
  shortLabel: string;
  /** Everything the search box should match on, including the token itself. */
  search: string;
  /** Rendered slightly apart — these are totals, not marketplaces. */
  isTotal?: boolean;
}

/** Names a British or American user is at least as likely to type as the real one. */
const SEARCH_ALIASES: Record<string, string> = {
  GB: 'UK Britain',
  US: 'USA America',
};

/** Country row: match the printed name, the arm, the token and the aliases. */
const marketSearch = (label: string, value: string, code: string): string =>
  `${label} ${value} ${SEARCH_ALIASES[code.toUpperCase()] ?? ''}`.trim();

interface OptionGroup {
  key: string;
  heading: string;
  options: Option[];
}

/**
 * Above this many options a wrapped row of pills stops being a control and
 * becomes wallpaper — Portwest's nineteen filled four lines on a laptop and
 * seven on a phone. Up to five, the pills are still the faster thing: every
 * choice is one click and nothing is hidden.
 */
const INLINE_LIMIT = 5;

/**
 * cmdk's stock scorer matches subsequences, which on a closed list of market
 * names is worse than useless: typing "seller" scored "NetherlandS · vEndor
 * nL..." above the actual seller markets. Every term must simply appear.
 * Equal scores leave the authored order alone — totals stay at the top.
 */
const matchOption = (value: string, search: string): number => {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const haystack = value.toLowerCase();
  return terms.every((t) => haystack.includes(t)) ? 1 : 0;
};

export function CountrySwitcher({
  countries,
  scope,
  onChange,
  className,
  arms,
  clientName,
}: CountrySwitcherProps) {
  const [open, setOpen] = useState(false);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const multiArm = (arms?.length ?? 0) >= 2;

  /**
   * The option set is unchanged from the pill version — same tokens, same
   * order, same rules about which rollups earn their place. Only the way it is
   * presented has changed. `flat` is the old single list; `groups` is that same
   * list arranged the way the data actually nests (arm → market), with the
   * totals lifted to the top.
   */
  const { flat, groups } = useMemo(() => {
    const flat: Option[] = [];
    const groups: OptionGroup[] = [];
    if (!countries || countries.length < 2) return { flat, groups };

    const hasEu = countries.some((c) => c.region === 'EU');
    const hasNonEu = countries.some((c) => c.region !== 'EU');

    // Totals first in the menu — a client who wants the whole business should
    // not scroll past twelve markets to find it.
    const overview: Option[] = [];

    if (!multiArm) {
      const markets: Option[] = countries.map((c) => {
        const name = getCountryName(c.country_code) || c.country_name;
        return {
          value: c.scope,
          label: name,
          shortLabel: name,
          search: marketSearch(name, c.scope, c.country_code),
        };
      });
      const allEu: Option | null = hasEu
        ? { value: 'ALL_EU', label: 'All EU', shortLabel: 'All EU', search: 'All EU ALL_EU Europe', isTotal: true }
        : null;
      const all: Option = {
        value: 'ALL',
        label: 'All countries',
        shortLabel: 'All countries',
        search: 'All countries ALL everything',
        isTotal: true,
      };

      flat.push(...markets);
      if (allEu) flat.push(allEu);
      flat.push(all);

      overview.push(all);
      if (allEu) overview.push(allEu);
      groups.push({ key: '_overview', heading: 'Overview', options: overview });
      groups.push({ key: '_markets', heading: 'Marketplaces', options: markets });
    } else {
      // Two arms of one business. Every marketplace option names its arm,
      // because Portwest and S Green both have a UK·Vendor AND a UK·Seller and
      // the two are different numbers the client reads as separate lines every
      // month. They are never quietly added together under a single "United
      // Kingdom". In the menu the group heading carries the arm, so the row
      // itself can print just the country.
      const armGroups: OptionGroup[] = [];

      arms!.forEach((arm) => {
        const inArm = countries.filter((c) => c.arm === arm);
        const markets: Option[] = inArm.map((c) => {
          const name = getCountryName(c.country_code) || c.country_name;
          const label = `${name} · ${arm}`;
          return {
            value: c.scope,
            label,
            shortLabel: name,
            search: marketSearch(label, c.scope, c.country_code),
          };
        });
        // An arm-wide total only says something new once the arm spans markets
        // — Portwest's twelve vendor markets, but not S Green's single UK
        // vendor account, where it would just repeat the option next to it.
        const armAll: Option | null =
          inArm.length >= 2
            ? {
                value: makeScope('ALL', arm),
                label: `All ${arm.toLowerCase()} markets`,
                shortLabel: `All ${arm.toLowerCase()} markets`,
                search: `All ${arm.toLowerCase()} markets ${makeScope('ALL', arm)}`,
                isTotal: true,
              }
            : null;

        flat.push(...markets);
        if (armAll) flat.push(armAll);

        if (markets.length || armAll) {
          armGroups.push({
            key: arm,
            heading: arm,
            options: armAll ? [armAll, ...markets] : markets,
          });
        }
      });

      // An EU rollup across arms only adds anything when there is non-EU trade
      // to exclude; otherwise it is the whole business under a second name.
      const allEu: Option | null =
        hasEu && hasNonEu
          ? { value: 'ALL_EU', label: 'All EU', shortLabel: 'All EU', search: 'All EU ALL_EU Europe', isTotal: true }
          : null;
      const wholeLabel = clientName ? `${clientName} — whole business` : 'Whole business';
      const all: Option = {
        value: 'ALL',
        label: wholeLabel,
        shortLabel: wholeLabel,
        search: `${wholeLabel} ALL everything all markets`,
        isTotal: true,
      };

      if (allEu) flat.push(allEu);
      flat.push(all);

      overview.push(all);
      if (allEu) overview.push(allEu);
      groups.push({ key: '_overview', heading: 'Overview', options: overview });
      groups.push(...armGroups);
    }

    return { flat, groups };
  }, [countries, multiArm, arms, clientName]);

  /** What the caption and the trigger's accessible name call this control. */
  const caption = multiArm ? 'Business scope' : 'Country scope';

  const current = flat.find((o) => o.value === scope) ?? null;
  /** A scope the registry no longer lists still has to read as something. */
  const currentLabel =
    current?.label ??
    (() => {
      const area = scopeArea(scope);
      const arm = scopeArm(scope);
      const name =
        area === 'ALL_EU' ? 'All EU'
        : area === 'ALL' ? (multiArm && !arm ? 'Whole business' : 'All countries')
        : getCountryName(area);
      return arm ? `${name} · ${arm}` : name;
    })();

  if (!countries || countries.length < 2) return null;

  /* ------------------------------------------------------------------ *
   * Few enough to show at once: keep the pills. Nothing beats a control
   * where every option is already on screen.
   * ------------------------------------------------------------------ */
  if (flat.length <= INLINE_LIMIT) {
    const activeIndex = flat.findIndex((o) => o.value === scope);

    // The old row had no arrow-key navigation at all — a tablist you could
    // only tab through one item at a time.
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const from = pillRefs.current.findIndex((el) => el === document.activeElement);
      if (from < 0) return;
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (from + 1) % flat.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (from - 1 + flat.length) % flat.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = flat.length - 1;
      if (next < 0) return;
      e.preventDefault();
      pillRefs.current[next]?.focus();
      onChange(flat[next].value);
    };

    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <span className="text-[10px] md:text-xs uppercase tracking-wide text-gray-500 font-semibold">
          {caption}
        </span>
        <div
          role="tablist"
          aria-label={caption}
          onKeyDown={onKeyDown}
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm"
        >
          {flat.map((opt, i) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                ref={(el) => { pillRefs.current[i] = el; }}
                role="tab"
                type="button"
                aria-selected={active}
                tabIndex={active || (activeIndex < 0 && i === 0) ? 0 : -1}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1',
                  active
                    // Selected-market pill: cyan-500 gave white text only 2.43:1.
                    // cyan-700 measures 5.36:1 and keeps the same blue→cyan identity.
                    ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white shadow-sm'
                    : opt.isTotal
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-dashed border-gray-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <CountryFlag code={opt.value} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ *
   * Too many to show at once: one compact trigger that always states the
   * current scope, opening a searchable list grouped the way the business
   * is actually shaped.
   * ------------------------------------------------------------------ */
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className="text-[10px] md:text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {caption}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`${caption}: ${currentLabel}. Change scope`}
            className={cn(
              'h-9 w-auto max-w-full justify-between gap-2 rounded-lg border-gray-200 bg-white px-2.5',
              'text-xs md:text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <CountryFlag code={current?.value ?? scope} />
              <span className="truncate">{currentLabel}</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,20rem)] p-0">
          <Command
            // Match on the full label AND the token, so "vendor", "germany" and
            // "DE" all work even though the rows print only the country.
            filter={matchOption}
            aria-label={caption}
          >
            <CommandInput placeholder="Search markets…" />
            <CommandList className="max-h-[min(60vh,20rem)]">
              <CommandEmpty>No market found.</CommandEmpty>
              {groups.map((group, gi) => (
                <Fragment key={group.key}>
                  {gi > 0 && <CommandSeparator />}
                  <CommandGroup heading={group.heading}>
                    {group.options.map((opt) => {
                      const active = scope === opt.value;
                      return (
                        <CommandItem
                          key={opt.value}
                          value={opt.search}
                          aria-current={active ? 'true' : undefined}
                          onSelect={() => {
                            onChange(opt.value);
                            setOpen(false);
                          }}
                          className="gap-2"
                        >
                          <CountryFlag code={opt.value} />
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate',
                              opt.isTotal ? 'font-medium text-gray-900' : 'text-gray-700',
                              active && 'text-blue-800',
                            )}
                          >
                            {opt.shortLabel}
                          </span>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Fragment>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
