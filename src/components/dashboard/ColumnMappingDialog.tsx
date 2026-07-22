import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColumnMapping {
  ppcSales: number;
  ppcSpend: number;
  sales: number;
  unitsOrdered: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
}

interface ColumnMappingDialogProps {
  onMappingChange: (mapping: ColumnMapping) => void;
}

const DEFAULT_MAPPING: ColumnMapping = {
  ppcSales: 5, // Column F
  ppcSpend: 6, // Column G
  sales: 5, // Column F
  unitsOrdered: 7, // Column H
  pageViews: 9, // Column J
  buyBoxPercentage: 10, // Column K
  conversionRate: 12, // Column M
};

const STORAGE_KEY = 'column_mapping';

export const ColumnMappingDialog = ({ onMappingChange }: ColumnMappingDialogProps) => {
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Load mapping from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedMapping = JSON.parse(saved);
        setMapping(parsedMapping);
        onMappingChange(parsedMapping);
      } catch (error) {
        console.error('Failed to parse saved mapping:', error);
      }
    }
  }, [onMappingChange]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    onMappingChange(mapping);
    setIsOpen(false);
    toast({
      title: "Mapping saved",
      description: "Column mappings have been updated successfully.",
    });
  };

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING);
    localStorage.removeItem(STORAGE_KEY);
    onMappingChange(DEFAULT_MAPPING);
    toast({
      title: "Mapping reset",
      description: "Column mappings have been reset to defaults.",
    });
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const columnIndex = parseInt(value);
    setMapping(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  // Generate column options (A-Z = 0-25)
  const getColumnOptions = () => {
    return Array.from({ length: 26 }, (_, i) => ({
      value: i.toString(),
      label: `Column ${String.fromCharCode(65 + i)} (${i})`
    }));
  };

  const columnOptions = getColumnOptions();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Column Mapping
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Column Mapping Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">PPC Data Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ppcSales">PPC Sales Column</Label>
                  <Select
                    value={mapping.ppcSales.toString()}
                    onValueChange={(value) => handleMappingChange('ppcSales', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ppcSpend">PPC Spend Column</Label>
                  <Select
                    value={mapping.ppcSpend.toString()}
                    onValueChange={(value) => handleMappingChange('ppcSpend', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sales & Traffic Data Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales">Sales Column</Label>
                  <Select
                    value={mapping.sales.toString()}
                    onValueChange={(value) => handleMappingChange('sales', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unitsOrdered">Units Ordered Column</Label>
                  <Select
                    value={mapping.unitsOrdered.toString()}
                    onValueChange={(value) => handleMappingChange('unitsOrdered', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pageViews">Page Views Column</Label>
                  <Select
                    value={mapping.pageViews.toString()}
                    onValueChange={(value) => handleMappingChange('pageViews', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="buyBoxPercentage">Buy Box % Column</Label>
                  <Select
                    value={mapping.buyBoxPercentage.toString()}
                    onValueChange={(value) => handleMappingChange('buyBoxPercentage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="conversionRate">Conversion Rate Column</Label>
                  <Select
                    value={mapping.conversionRate.toString()}
                    onValueChange={(value) => handleMappingChange('conversionRate', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};