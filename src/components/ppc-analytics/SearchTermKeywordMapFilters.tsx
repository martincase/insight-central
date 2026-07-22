import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import type { SearchTermKeywordMapFilters as FiltersType } from '@/types/ppcAnalytics';
import { getMatchTypeLabel } from '@/utils/matchTypeUtils';

interface SearchTermKeywordMapFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  availableMatchTypes: string[];
}

export const SearchTermKeywordMapFilters: React.FC<SearchTermKeywordMapFiltersProps> = ({
  filters,
  onFiltersChange,
  availableMatchTypes,
}) => {
  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleMatchType = (matchType: string) => {
    const current = filters.matchTypes;
    const updated = current.includes(matchType)
      ? current.filter(mt => mt !== matchType)
      : [...current, matchType];
    updateFilter('matchTypes', updated);
  };

  const clearFilters = () => {
    onFiltersChange({
      matchTypes: [],
      minSpend: 0,
      showNegativeCandidatesOnly: false,
      searchTerm: '',
      keywordText: '',
    });
  };

  const hasActiveFilters = 
    filters.matchTypes.length > 0 || 
    filters.minSpend > 0 || 
    filters.showNegativeCandidatesOnly ||
    filters.searchTerm ||
    filters.keywordText;

  return (
    <div className="space-y-4">
      {/* Search Inputs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by search term..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by keyword..."
            value={filters.keywordText}
            onChange={(e) => updateFilter('keywordText', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Match Type Badges */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Match:</span>
          {availableMatchTypes.map((matchType) => {
            const mt = getMatchTypeLabel(matchType);
            const isActive = filters.matchTypes.includes(matchType);
            return (
              <span
                key={matchType}
                className={`inline-block whitespace-nowrap text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer transition-colors ${isActive ? 'bg-primary text-primary-foreground border-primary' : mt.color}`}
                onClick={() => toggleMatchType(matchType)}
              >
                {mt.label}
              </span>
            );
          })}
        </div>

        {/* Min Spend */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min Spend:</span>
          <Input
            type="number"
            value={filters.minSpend || ''}
            onChange={(e) => updateFilter('minSpend', Number(e.target.value) || 0)}
            placeholder="£0"
            className="w-24 h-8"
          />
        </div>

        {/* Negative Candidates Only */}
        <div className="flex items-center gap-2">
          <Switch
            id="negative-only"
            checked={filters.showNegativeCandidatesOnly}
            onCheckedChange={(checked) => updateFilter('showNegativeCandidatesOnly', checked)}
          />
          <Label htmlFor="negative-only" className="text-sm cursor-pointer">
            Negatives only
          </Label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
