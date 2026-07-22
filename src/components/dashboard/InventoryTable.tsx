import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import type { InventoryData } from '@/types/dashboard';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { useASINDetail } from '@/hooks/useASINDetail';

interface InventoryTableProps {
  inventoryData: InventoryData[];
  isBlurred?: boolean;
  merchantToken?: string;
  comingSoon?: boolean;
}

type SortField = 'sku' | 'asin' | 'productName' | 'quantity' | 'price' | 'fulfillmentType';
type SortDirection = 'asc' | 'desc';

export const InventoryTable: React.FC<InventoryTableProps> = ({ inventoryData, isBlurred = false, merchantToken, comingSoon = false }) => {
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);
  const { openASINDetail } = useASINDetail();

  // Filter out parent products (price = 0) as they're not relevant for inventory tracking
  const filteredInventoryData = inventoryData.filter(item => item.price > 0);

  if (filteredInventoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No inventory data available for this account.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  // Sort inventory based on current sort field and direction
  const sortedInventory = [...filteredInventoryData].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle string sorting case-insensitively
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Show top 20 by default, or all if expanded
  const displayedInventory = showAll ? sortedInventory : sortedInventory.slice(0, 20);

  const getFulfillmentBadgeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'fba' || lowerType.includes('amazon')) return 'bg-blue-500';
    if (lowerType === 'fbm' || lowerType === 'default') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getFulfillmentDisplayText = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'fba' || lowerType === 'amazon_eu' || lowerType === 'amazon_na') return 'FBA';
    if (lowerType === 'fbm' || lowerType === 'default') return 'FBM';
    if (!type || type.trim() === '') return 'Unknown';
    return type.toUpperCase();
  };


  const getQuantityColor = (quantity: number) => {
    if (quantity === 0) return 'text-red-600';
    if (quantity < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="relative">
      <Card className={comingSoon ? 'opacity-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory ({sortedInventory.length} Products)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 w-24"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center gap-1">
                      SKU
                      {getSortIcon('sku')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 w-24"
                    onClick={() => handleSort('asin')}
                  >
                    <div className="flex items-center gap-1">
                      ASIN
                      {getSortIcon('asin')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 max-w-[200px]"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center gap-1">
                      Product Name
                      {getSortIcon('productName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 w-20"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qty
                      {getSortIcon('quantity')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 w-20"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Price
                      {getSortIcon('price')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 w-28"
                    onClick={() => handleSort('fulfillmentType')}
                  >
                    <div className="flex items-center gap-1">
                      Fulfillment
                      {getSortIcon('fulfillmentType')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInventory.map((item, index) => (
                  <TableRow key={`${item.sku}-${index}`} className="h-12">
                    <TableCell className="font-medium w-24">
                      <div className={`truncate ${isBlurred ? 'blur-sm' : ''}`} title={item.sku}>
                        {item.sku || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center gap-1">
                        <div 
                          className={`truncate cursor-pointer hover:text-primary hover:underline ${isBlurred ? 'blur-sm' : ''}`} 
                          title={item.asin}
                          onClick={() => openASINDetail(item.asin, merchantToken || '')}
                        >
                          {item.asin || 'N/A'}
                        </div>
                        {item.asin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAmazonProduct(item.asin, merchantToken)}
                            className="h-5 w-5 p-0 flex-shrink-0"
                            title="View on Amazon"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className={`truncate ${isBlurred ? 'blur-sm' : ''}`} title={item.productName}>
                        {item.productName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getQuantityColor(item.quantity)}`}>
                      {item.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyByMerchantToken(item.price, merchantToken || '')}
                    </TableCell>
                    <TableCell className="w-28">
                      <Badge 
                        variant="secondary" 
                        className={`${getFulfillmentBadgeColor(item.fulfillmentType)} text-white text-xs`}
                      >
                        {getFulfillmentDisplayText(item.fulfillmentType)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Expand/Collapse Button */}
          {sortedInventory.length > 20 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-2"
              >
                {showAll ? (
                  <>
                    Show Top 20
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show All {sortedInventory.length} Products
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-lg font-semibold">
                {sortedInventory.length.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Inventory Value</p>
              <p className="text-lg font-semibold">
                {formatCurrencyByMerchantToken(sortedInventory.reduce((sum, item) => sum + (item.price * item.quantity), 0), merchantToken || '')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-lg font-semibold text-red-600">
                {sortedInventory.filter(item => item.quantity === 0).length.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Coming Soon Overlay */}
      {comingSoon && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">Inventory tracking feature is currently in development</p>
          </div>
        </div>
      )}
    </div>
  );
};