import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterControlsProps {
  compareMonth: string;
  onCompareMonthChange: (month: string) => void;
  availableMonths: string[];
  isLoading?: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  compareMonth,
  onCompareMonthChange,
  availableMonths,
  isLoading = false
}) => {
  return (
    <div className="p-4 bg-muted border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Compare Months:</span>
        <Select value={compareMonth || "all"} onValueChange={(value) => onCompareMonthChange(value === "all" ? "" : value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};