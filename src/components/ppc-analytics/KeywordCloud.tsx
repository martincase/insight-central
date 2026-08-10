import React, { useMemo } from 'react';
import type { KeywordThemeData } from '@/types/ppcAnalytics';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { formatAcos, formatMoney } from '@/utils/formatters';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface KeywordCloudProps {
  data: KeywordThemeData[];
  onKeywordClick?: (keyword: string) => void;
  maxKeywords?: number;
  scope?: CountryScope;
}

export function KeywordCloud({ data, onKeywordClick, maxKeywords = 50, scope }: KeywordCloudProps) {
  const cur = getCurrencyInfo(scope);
  const cloudData = useMemo(() => {
    // Sort by sales and take top keywords
    const sorted = [...data]
      .filter(d => d.total_sales > 0)
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, maxKeywords);

    if (sorted.length === 0) return [];

    const maxSales = Math.max(...sorted.map(d => d.total_sales));
    const minSales = Math.min(...sorted.map(d => d.total_sales));
    const salesRange = maxSales - minSales || 1;

    return sorted.map(item => {
      // Calculate size based on sales (12px to 32px)
      const sizeRatio = (item.total_sales - minSales) / salesRange;
      const fontSize = 12 + sizeRatio * 20;

      // Calculate color based on ACOS (green = good, yellow = moderate, red = high)
      let colorClass = 'text-green-600 dark:text-green-400'; // ACOS < 20%
      if (item.acos >= 50) {
        colorClass = 'text-red-600 dark:text-red-400';
      } else if (item.acos >= 30) {
        colorClass = 'text-orange-600 dark:text-orange-400';
      } else if (item.acos >= 20) {
        colorClass = 'text-yellow-600 dark:text-yellow-400';
      }

      return {
        ...item,
        fontSize,
        colorClass
      };
    });
  }, [data, maxKeywords]);

  if (cloudData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No keyword data available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 justify-center items-center min-h-[200px]">
      {cloudData.map((item, index) => (
        <button
          key={`${item.keyword_text}-${index}`}
          onClick={() => onKeywordClick?.(item.keyword_text)}
          className={`
            ${item.colorClass}
            hover:opacity-70 transition-opacity cursor-pointer
            px-2 py-1 rounded hover:bg-muted/50
          `}
          style={{ fontSize: `${item.fontSize}px` }}
          title={`Sales: ${formatMoney(item.total_sales, cur)} | ACOS: ${formatAcos(item.total_spend, item.total_sales)} | ${item.match_type}`}
        >
          {item.keyword_text}
        </button>
      ))}
    </div>
  );
}
