import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Eye, EyeOff, Info } from 'lucide-react';
import { TableRowComponent } from './TableRow';
import { MonthlyData, ColumnConfig } from '../../../types/monthlyPerformance';

type Density = 'comfortable' | 'compact';
type SortDirection = 'asc' | 'desc' | null;

interface DataTableProps {
  data: MonthlyData[];
  isLoading: boolean;
  columnConfigs: ColumnConfig[];
  visibleColumns: Set<string>;
  onToggleColumn: (columnKey: string) => void;
  density: Density;
  sortKey: string;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  isLoading,
  columnConfigs,
  visibleColumns,
  onToggleColumn,
  density,
  sortKey,
  sortDirection,
  onSort
}) => {
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Column Visibility Controls */}
        <div className="p-4 bg-muted border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground mr-2">Columns:</span>
            {columnConfigs.map(config => (
              <Badge
                key={config.key}
                variant={visibleColumns.has(config.key) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  visibleColumns.has(config.key) 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => onToggleColumn(config.key)}
              >
                {visibleColumns.has(config.key) ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {config.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-accent z-10 border-b border-border">
                <TableRow className="hover:bg-muted">
                  {columnConfigs.filter(config => visibleColumns.has(config.key)).map(config => (
                    <TableHead 
                      key={config.key} 
                      className={`${config.width || ''} ${config.key === 'month' ? 'sticky left-0 bg-accent z-20 border-r border-border' : ''} text-foreground font-bold`}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => config.sortable && onSort(config.key)}
                            className="h-auto p-0 font-bold text-foreground hover:bg-muted"
                            disabled={!config.sortable}
                          >
                            <div className="flex items-center gap-1">
                              {config.label}
                              <Info className="h-3 w-3 text-muted-foreground" />
                              {config.sortable && (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{config.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-muted">
                      {columnConfigs.filter(config => visibleColumns.has(config.key)).map(config => (
                        <td 
                          key={config.key}
                          className={`${density === 'compact' ? 'py-2' : 'py-4'} px-4 ${config.key === 'month' ? 'sticky left-0 bg-card border-r border-border' : ''}`}
                        >
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <td 
                      colSpan={columnConfigs.filter(config => visibleColumns.has(config.key)).length}
                      className="h-24 text-center text-muted-foreground"
                     >
                       No performance data available
                     </td>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRowComponent
                      key={`${row.month}-${row.client_name || idx}`}
                      row={row}
                      columnConfigs={columnConfigs.filter(config => visibleColumns.has(config.key))}
                      density={density}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
