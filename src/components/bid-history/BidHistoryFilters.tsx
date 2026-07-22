import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BidHistoryFilters as FilterType } from '@/types/bidHistory';

interface BidHistoryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  sellers: string[];
  loading?: boolean;
}

export const BidHistoryFilters = ({
  filters,
  onFiltersChange,
  sellers,
  loading,
}: BidHistoryFiltersProps) => {
  const handleSellerChange = (value: string) => {
    const newSellers = value === 'all' ? [] : [value];
    onFiltersChange({ ...filters, sellers: newSellers });
  };

  const handleKeywordSearch = (value: string) => {
    const keywords = value ? [value] : [];
    onFiltersChange({ ...filters, keywords });
  };

  const handleDirectionChange = (value: 'all' | 'increases' | 'decreases') => {
    onFiltersChange({ ...filters, changeDirection: value });
  };

  const handleMinChangeChange = (value: string) => {
    const minChange = value === 'any' ? null : parseFloat(value);
    onFiltersChange({ ...filters, minChangePercent: minChange });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.sellers.length > 0 ? filters.sellers[0] : 'all'}
        onValueChange={handleSellerChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Sellers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sellers</SelectItem>
          {sellers.map(seller => (
            <SelectItem key={seller} value={seller}>
              {seller}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search keywords..."
          className="pl-9 w-[200px]"
          value={filters.keywords[0] || ''}
          onChange={(e) => handleKeywordSearch(e.target.value)}
          disabled={loading}
        />
      </div>

      <Select
        value={filters.changeDirection}
        onValueChange={handleDirectionChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Changes</SelectItem>
          <SelectItem value="increases">Increases Only</SelectItem>
          <SelectItem value="decreases">Decreases Only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.minChangePercent?.toString() || 'any'}
        onValueChange={handleMinChangeChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Min Change %" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Change %</SelectItem>
          <SelectItem value="5">≥ 5%</SelectItem>
          <SelectItem value="10">≥ 10%</SelectItem>
          <SelectItem value="25">≥ 25%</SelectItem>
          <SelectItem value="50">≥ 50%</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
