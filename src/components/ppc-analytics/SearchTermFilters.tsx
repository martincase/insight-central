import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import type { SearchTermFilters as FilterType } from '@/types/ppcAnalytics';

interface SearchTermFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  sellers: string[];
  isLoading?: boolean;
}

export function SearchTermFilters({ 
  filters, 
  onFiltersChange, 
  sellers,
  isLoading 
}: SearchTermFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      sellers: [],
      minImpressions: 10,
      acosMin: null,
      acosMax: null,
      searchTermType: 'keywords',
      searchTerm: ''
    });
  };

  const handleSellerChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, sellers: [] });
    } else {
      onFiltersChange({ ...filters, sellers: [value] });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Search Term Filter */}
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <Label htmlFor="search-term-filter" className="text-sm text-muted-foreground">
          Search Term
        </Label>
        <Input
          id="search-term-filter"
          type="text"
          placeholder="Filter search terms..."
          value={filters.searchTerm || ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            searchTerm: e.target.value 
          })}
          disabled={isLoading}
          className="w-full"
        />
      </div>

      {/* Seller Filter */}
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label htmlFor="seller-filter" className="text-sm text-muted-foreground">
          Seller
        </Label>
        <Select
          value={filters.sellers[0] || 'all'}
          onValueChange={handleSellerChange}
          disabled={isLoading}
        >
          <SelectTrigger id="seller-filter" className="w-full">
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
      </div>

      {/* Min Impressions */}
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <Label htmlFor="min-impressions" className="text-sm text-muted-foreground">
          Min Impressions
        </Label>
        <Input
          id="min-impressions"
          type="number"
          min={10}
          value={filters.minImpressions}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            minImpressions: Math.max(10, parseInt(e.target.value) || 10) 
          })}
          disabled={isLoading}
          className="w-full"
        />
      </div>

      {/* ACOS Range */}
      <div className="flex flex-col gap-1.5 min-w-[120px]">
        <Label htmlFor="acos-min" className="text-sm text-muted-foreground">
          ACOS Min %
        </Label>
        <Input
          id="acos-min"
          type="number"
          min={0}
          placeholder="0"
          value={filters.acosMin ?? ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            acosMin: e.target.value ? parseFloat(e.target.value) : null 
          })}
          disabled={isLoading}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5 min-w-[120px]">
        <Label htmlFor="acos-max" className="text-sm text-muted-foreground">
          ACOS Max %
        </Label>
        <Input
          id="acos-max"
          type="number"
          min={0}
          placeholder="∞"
          value={filters.acosMax ?? ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            acosMax: e.target.value ? parseFloat(e.target.value) : null 
          })}
          disabled={isLoading}
          className="w-full"
        />
      </div>

      {/* Reset Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleReset}
        disabled={isLoading}
        className="h-10"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}
