import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';

interface SortableTableHeadProps<T> {
  field: T;
  currentField: T;
  direction: 'asc' | 'desc';
  onSort: (field: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableTableHead<T>({
  field,
  currentField,
  direction,
  onSort,
  children,
  className = '',
}: SortableTableHeadProps<T>) {
  const isActive = field === currentField;

  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
        )}
      </div>
    </TableHead>
  );
}
