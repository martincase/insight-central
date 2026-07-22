import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { KeywordThemeFilters as Filters } from '@/types/ppcAnalytics';

interface KeywordThemeFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  matchTypes: string[];
}

export function KeywordThemeFilters({
  filters,
  onFiltersChange,
  matchTypes
}: KeywordThemeFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      sellers: [],
      matchTypes: [],
      minImpressions: 10,
      acosMin: null,
      acosMax: null,
      searchTerm: ''
    });
  };

  const hasActiveFilters = 
    filters.matchTypes.length > 0 ||
    filters.minImpressions > 10 ||
    filters.acosMin !== null ||
    filters.acosMax !== null ||
    filters.searchTerm.trim() !== '';

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Keyword Search */}
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="keyword-search" className="text-xs text-muted-foreground">
          Search Keywords
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="keyword-search"
            placeholder="Search keywords..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Match Type Filter */}
      <div className="w-[150px]">
        <Label className="text-xs text-muted-foreground">Match Type</Label>
        <Select
          value={filters.matchTypes[0] || 'all'}
          onValueChange={(value) => updateFilter('matchTypes', value === 'all' ? [] : [value])}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {matchTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min Impressions */}
      <div className="w-[130px]">
        <Label className="text-xs text-muted-foreground">Min Impressions</Label>
        <Input
          type="number"
          min={0}
          value={filters.minImpressions}
          onChange={(e) => updateFilter('minImpressions', parseInt(e.target.value) || 0)}
        />
      </div>

      {/* ACOS Range */}
      <div className="w-[100px]">
        <Label className="text-xs text-muted-foreground">ACOS Min %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="0"
          value={filters.acosMin ?? ''}
          onChange={(e) => updateFilter('acosMin', e.target.value ? parseFloat(e.target.value) : null)}
        />
      </div>
      <div className="w-[100px]">
        <Label className="text-xs text-muted-foreground">ACOS Max %</Label>
        <Input
          type="number"
          min={0}
          max={1000}
          placeholder="∞"
          value={filters.acosMax ?? ''}
          onChange={(e) => updateFilter('acosMax', e.target.value ? parseFloat(e.target.value) : null)}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
