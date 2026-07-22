
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { formatDateRangeText } from '@/utils/dateUtils';
import { format, subDays } from 'date-fns';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import type { DateFilter } from '@/types/dashboard';
import type { DateRange } from 'react-day-picker';

interface DateFilterSelectorProps {
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  onDateFilterChange: (filter: DateFilter) => void;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  getDateDisplayText: () => string;
  vendorOffset?: boolean;
  /** Hide the date-range caption underneath the button (caller renders it elsewhere). */
  hideCaption?: boolean;
  /** Override the trigger button's className (e.g. to match sibling button size). */
  buttonClassName?: string;
}

export const DateFilterSelector = ({
  dateFilter,
  customDateRange,
  onDateFilterChange,
  onCustomDateRangeChange,
  getDateDisplayText,
  vendorOffset = false,
  hideCaption = false,
  buttonClassName,
}: DateFilterSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const filters: { value: DateFilter; label: string }[] = [
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-14-days', label: 'Last 14 Days' },
    { value: 'past-30-days', label: 'Last 30 Days' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onCustomDateRangeChange({ from: range.from, to: range.to });
      onDateFilterChange('custom');
    }
  };

  // Compute date range text, applying vendor offset if needed
  let actualDateRange = formatDateRangeText(dateFilter, customDateRange);
  if (vendorOffset && dateFilter !== 'custom') {
    try {
      const range = getCurrentDateRange(dateFilter, customDateRange);
      const offsetRange = { from: subDays(range.from, 3), to: subDays(range.to, 3) };
      actualDateRange = `${format(offsetRange.from, 'MMM d, yyyy')} – ${format(offsetRange.to, 'MMM d, yyyy')}`;
    } catch {}
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button className={buttonClassName ?? 'bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-[120px]'}>
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">{getDateDisplayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-2">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                variant={dateFilter === filter.value ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onDateFilterChange(filter.value);
                  if (filter.value !== 'custom') {
                    setIsOpen(false);
                  }
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="border-t p-4">
              <CalendarComponent
                mode="range"
                selected={customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
      {!hideCaption && actualDateRange && (
        <span className="text-xs text-muted-foreground text-center whitespace-nowrap">
          {actualDateRange}
          {vendorOffset && <span className="ml-1 text-orange-500">(3-day lag)</span>}
        </span>
      )}
    </div>
  );
};
