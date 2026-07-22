import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RefreshCw, Search, Filter, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { dataGapAnalyzer, type DataGapSummary, type DataGapResult } from '@/utils/dataGapAnalyzer';
import DataGapCard from './DataGapCard';

interface DataGapWarningsProps {
  refreshTrigger?: number;
}

const DataGapWarnings = ({ refreshTrigger }: DataGapWarningsProps) => {
  const [gapSummary, setGapSummary] = useState<DataGapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dataTypeFilter, setDataTypeFilter] = useState<'all' | string>('all');

  useEffect(() => {
    analyzeDataGaps();
  }, [refreshTrigger]);

  const analyzeDataGaps = async () => {
    setLoading(true);
    try {
      const summary = await dataGapAnalyzer.analyzeAllDataGaps();
      setGapSummary(summary);
    } catch (error) {
      console.error('Error analyzing data gaps:', error);
      toast.error('Failed to analyze data gaps');
      setGapSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async (merchantToken: string, dataType: string) => {
    const refreshKey = `${merchantToken}-${dataType}`;
    setRefreshing(refreshKey);
    
    try {
      // Here you would typically trigger a data refresh
      // For now, just refresh the analysis after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      await analyzeDataGaps();
      toast.success(`Refreshed ${dataType} data for account`);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(null);
    }
  };

  const filteredGaps = gapSummary?.gaps.filter(gap => {
    const matchesSearch = gap.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gap.dataType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || gap.severity === severityFilter;
    const matchesDataType = dataTypeFilter === 'all' || gap.dataType === dataTypeFilter;
    
    return matchesSearch && matchesSeverity && matchesDataType;
  }) || [];

  const getDataTypes = () => {
    if (!gapSummary) return [];
    const types = new Set(gapSummary.gaps.map(gap => gap.dataType));
    return Array.from(types).sort();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing data gaps...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gapSummary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <div>
              <p className="font-medium">Failed to analyze data gaps</p>
              <p className="text-sm text-muted-foreground">Please try refreshing the analysis</p>
            </div>
            <Button onClick={analyzeDataGaps} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{gapSummary.totalAccounts}</p>
              <p className="text-xs text-muted-foreground">Total Accounts</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{gapSummary.accountsWithGaps}</p>
              <p className="text-xs text-muted-foreground">With Data Gaps</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{gapSummary.highSeverityGaps}</p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{gapSummary.mediumSeverityGaps}</p>
              <p className="text-xs text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{gapSummary.lowSeverityGaps}</p>
              <p className="text-xs text-muted-foreground">Low Severity</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Quality Issues ({filteredGaps.length})</CardTitle>
            <Button onClick={analyzeDataGaps} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts or data types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Data Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getDataTypes().map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredGaps.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">No data gaps found!</p>
              <p className="text-muted-foreground">
                {gapSummary.gaps.length === 0 
                  ? 'All accounts have complete data for the past 60 days.' 
                  : 'No gaps match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGaps.map((gap, index) => (
                <DataGapCard
                  key={`${gap.merchantToken}-${gap.dataType}-${index}`}
                  gap={gap}
                  onRefresh={handleRefreshData}
                  isRefreshing={refreshing === `${gap.merchantToken}-${gap.dataType}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataGapWarnings;