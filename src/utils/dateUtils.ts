
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { DateFilter } from '@/types/dashboard';

export const getDateDisplayText = (
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): string => {
  switch (dateFilter) {
    case 'last-7-days':
      return 'Last 7 Days';
    case 'last-14-days':
      return 'Last 14 Days';
    case 'yesterday':
      return 'Yesterday';
    case 'this-week':
      return 'This Week';
    case 'last-week':
      return 'Last Week';
    case 'this-month':
      return 'This Month';
    case 'last-month':
      return 'Last Month';
    case 'past-30-days':
      return 'Past 30 Days';
    case 'this-year':
      return 'This Year';
    case 'custom':
      if (customDateRange && customDateRange.from && customDateRange.to) {
        return `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd')}`;
      }
      return 'Custom Range';
    default:
      return 'Last 7 Days';
  }
};

// Calculate actual date range based on filter
export const getActualDateRange = (
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): { from: Date; to: Date } | null => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  switch (dateFilter) {
    case 'last-7-days':
      return { from: subDays(yesterday, 6), to: yesterday };
    case 'last-14-days':
      return { from: subDays(yesterday, 13), to: yesterday };
    case 'yesterday':
      return { from: yesterday, to: yesterday };
    case 'this-week':
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
    case 'last-week': {
      const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
      return { from: lastWeekStart, to: lastWeekEnd };
    }
    case 'this-month':
      return { from: startOfMonth(today), to: today };
    case 'last-month': {
      const lastMonth = subDays(startOfMonth(today), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'past-30-days':
      return { from: subDays(yesterday, 29), to: yesterday };
    case 'this-year':
      return { from: startOfYear(today), to: today };
    case 'custom':
      if (customDateRange && customDateRange.from && customDateRange.to) {
        return customDateRange;
      }
      return null;
    default:
      return { from: subDays(yesterday, 6), to: yesterday };
  }
};

// Format date range as a readable string
export const formatDateRangeText = (
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): string => {
  const range = getActualDateRange(dateFilter, customDateRange);
  if (!range) return '';
  
  try {
    return `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`;
  } catch {
    return '';
  }
};
