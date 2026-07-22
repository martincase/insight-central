
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { generateAISuggestions, type AISuggestion } from '@/utils/aiSuggestions';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getBlurredDisplayName } from '@/utils/blurUtils';
import type { AccountData } from '@/types/dashboard';

interface AISuggestionsProps {
  accounts: AccountData[];
  isBlurred?: boolean;
  onFocusAccount: (accountId: string) => void;
}

const getSuggestionIcon = (type: AISuggestion['type']) => {
  switch (type) {
    case 'opportunity':
      return <TrendingUp className="h-4 w-4" />;
    case 'alert':
      return <AlertTriangle className="h-4 w-4" />;
    case 'optimization':
      return <Target className="h-4 w-4" />;
    case 'growth':
      return <Lightbulb className="h-4 w-4" />;
    default:
      return <Brain className="h-4 w-4" />;
  }
};

const getSuggestionColor = (type: AISuggestion['type'], priority: AISuggestion['priority']) => {
  if (priority === 'high') {
    return type === 'alert' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (priority === 'medium') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const SuggestionCard = ({ 
  suggestion, 
  isBlurred, 
  onFocusAccount 
}: { 
  suggestion: AISuggestion; 
  isBlurred: boolean; 
  onFocusAccount: (accountId: string) => void;
}) => (
  <Card className="mb-4 hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {getSuggestionIcon(suggestion.type)}
          <div>
            <CardTitle className="text-sm font-medium">
              {suggestion.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {getBlurredDisplayName(suggestion.accountName, isBlurred)}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={getSuggestionColor(suggestion.type, suggestion.priority)}
        >
          {suggestion.priority}
        </Badge>
      </div>
    </CardHeader>
    
    <CardContent className="space-y-3">
      <p className="text-sm text-gray-700">{suggestion.description}</p>
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm font-medium text-blue-900 mb-2">Potential Impact:</p>
        <p className="text-sm text-blue-800">{suggestion.potentialImpact}</p>
      </div>
      
      <div>
        <p className="text-sm font-medium mb-2">Recommended Actions:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {suggestion.actionItems.map((action, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {action}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <div className="text-xs text-gray-500">
          Current: {suggestion.metric === 'ACOS' || suggestion.metric === 'TACOS' || suggestion.metric === 'Sales Growth' 
            ? formatPercentage(suggestion.currentValue)
            : formatCurrency(suggestion.currentValue)
          }
          {suggestion.targetValue && (
            <span className="ml-2">Target: {
              suggestion.metric === 'ACOS' || suggestion.metric === 'TACOS' 
                ? formatPercentage(suggestion.targetValue)
                : formatCurrency(suggestion.targetValue)
            }</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onFocusAccount(suggestion.accountId)}
          className="text-xs"
        >
          Focus Account
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const AISuggestions = ({ accounts, isBlurred = false, onFocusAccount }: AISuggestionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const suggestions = generateAISuggestions(accounts);

  if (suggestions.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No specific recommendations at this time.</p>
            <p className="text-sm text-gray-400 mt-2">
              AI suggestions will appear when performance patterns are detected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI Suggestions</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {suggestions.length} insights
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-powered recommendations based on performance analysis
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className={`px-6 pb-6 ${isExpanded ? 'h-[800px]' : 'h-48'}`}>
          <div className="space-y-4">
            {highPriority.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  High Priority ({highPriority.length})
                </h4>
                {highPriority.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    isBlurred={isBlurred}
                    onFocusAccount={onFocusAccount}
                  />
                ))}
              </div>
            )}
            
            {mediumPriority.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  Medium Priority ({mediumPriority.length})
                </h4>
                {mediumPriority.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    isBlurred={isBlurred}
                    onFocusAccount={onFocusAccount}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
