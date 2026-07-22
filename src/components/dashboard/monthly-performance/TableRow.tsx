import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { MonthlyData, ColumnConfig } from '../../../types/monthlyPerformance';

type Density = 'comfortable' | 'compact';

interface TableRowProps {
  row: MonthlyData;
  columnConfigs: ColumnConfig[];
  density: Density;
}

export const TableRowComponent: React.FC<TableRowProps> = ({
  row,
  columnConfigs,
  density
}) => {
  const getMetricColor = (key: string, value: any) => {
    if (value === null || value === undefined) return '';
    
    switch (key) {
      case 'spend_gbp':
        return 'text-orange-600 bg-orange-50';
      case 'ad_sales_gbp':
        return 'text-green-700 bg-green-50';
      case 'acos':
        return 'text-red-600 bg-red-50';
      case 'overall_sales_gbp':
        return 'text-blue-700 bg-blue-50';
      default:
        return 'text-foreground';
    }
  };

  return (
    <TableRow className="hover:bg-muted transition-colors">
      {columnConfigs.map(config => {
        const value = (row as any)[config.key];
        const formatted = (config.format as (value: any, row?: MonthlyData) => string)(value, row);
        
        return (
          <TableCell 
            key={config.key}
            className={`
              ${density === 'compact' ? 'py-2' : 'py-4'} 
              ${config.key === 'month' 
                ? 'sticky left-0 bg-card font-bold text-foreground border-r border-border' 
                : config.key === 'client_name'
                  ? 'font-medium text-foreground'
                  : getMetricColor(config.key, value)
              }
              text-sm
            `}
          >
            <span className={config.key !== 'month' && config.key !== 'client_name' && value !== null ? 'px-2 py-1 rounded-md font-medium' : 'font-medium'}>
              {formatted}
            </span>
          </TableCell>
        );
      })}
    </TableRow>
  );
};
