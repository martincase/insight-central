import { useState, useMemo, useCallback } from 'react';

type SortDirection = 'asc' | 'desc';

interface UseTableSortOptions<T> {
  data: T[];
  defaultSortField: keyof T;
  defaultSortDirection?: SortDirection;
}

export function useTableSort<T>({ data, defaultSortField, defaultSortDirection = 'desc' }: UseTableSortOptions<T>) {
  const [sortField, setSortField] = useState<keyof T>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const handleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const sortedData = useMemo(() => {
    if (!data?.length) return data ?? [];
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
          : bVal.localeCompare(aVal, undefined, { sensitivity: 'base' });
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [data, sortField, sortDirection]);

  return { sortedData, sortField, sortDirection, handleSort };
}
