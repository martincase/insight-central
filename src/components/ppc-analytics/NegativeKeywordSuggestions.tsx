import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SearchTermKeywordMapData } from '@/types/ppcAnalytics';

interface NegativeKeywordSuggestionsProps {
  negativeCandidates: SearchTermKeywordMapData[];
  onSearchTermClick: (searchTerm: string) => void;
}

export const NegativeKeywordSuggestions: React.FC<NegativeKeywordSuggestionsProps> = ({
  negativeCandidates,
  onSearchTermClick,
}) => {
  const { toast } = useToast();

  const totalWastedSpend = negativeCandidates.reduce((sum, item) => sum + item.total_spend, 0);

  const handleCopyAll = () => {
    const searchTerms = negativeCandidates.map(item => item.customer_search_term).join('\n');
    navigator.clipboard.writeText(searchTerms);
    toast({
      title: 'Copied to clipboard',
      description: `${negativeCandidates.length} search terms copied`,
    });
  };

  const handleCopySingle = (searchTerm: string) => {
    navigator.clipboard.writeText(searchTerm);
    toast({
      title: 'Copied',
      description: searchTerm,
    });
  };

  const handleExport = () => {
    const headers = ['Search Term', 'Keyword', 'Match Type', 'Spend', 'Clicks', 'Campaign'];
    const rows = negativeCandidates.map(item => [
      item.customer_search_term,
      item.keyword_text,
      item.match_type,
      item.total_spend.toFixed(2),
      item.total_clicks.toString(),
      item.campaign_name,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'negative-keyword-suggestions.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Negative keyword suggestions exported to CSV',
    });
  };

  if (negativeCandidates.length === 0) {
    return null;
  }

  return (
    <Card className="bg-destructive/5 border-destructive/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Negative Keyword Suggestions</CardTitle>
            <Badge variant="destructive" className="ml-2">
              {negativeCandidates.length} found
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              <Copy className="h-4 w-4 mr-1" />
              Copy All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          High spend with zero sales – consider adding as negative keywords. Total wasted: <span className="font-semibold text-destructive">£{totalWastedSpend.toFixed(2)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {negativeCandidates.slice(0, 12).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-destructive/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSearchTermClick(item.customer_search_term)}
                  className="text-sm font-medium text-foreground hover:text-primary truncate block text-left w-full"
                >
                  "{item.customer_search_term}"
                </button>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>→ {item.keyword_text}</span>
                  <Badge variant="outline" className="text-xs py-0">
                    {item.match_type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="text-right">
                  <div className="text-sm font-semibold text-destructive">
                    £{item.total_spend.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.total_clicks} clicks
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopySingle(item.customer_search_term)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {negativeCandidates.length > 12 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Showing top 12 of {negativeCandidates.length} suggestions
          </p>
        )}
      </CardContent>
    </Card>
  );
};
