import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Filter, Check } from 'lucide-react';

type StatusColor = 'green' | 'yellow' | 'red';

interface StatusFilterProps {
  selectedColors: StatusColor[];
  onColorsChange: (colors: StatusColor[]) => void;
}

const COLOR_OPTIONS: Array<{
  value: StatusColor;
  label: string;
  bgClass: string;
  textClass: string;
  count?: number;
}> = [
  {
    value: 'green',
    label: 'Green (Good)',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  {
    value: 'yellow',
    label: 'Yellow (Warning)',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
  },
  {
    value: 'red',
    label: 'Red (Critical)',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
  },
];

export const StatusFilter = ({ selectedColors, onColorsChange }: StatusFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorToggle = (color: StatusColor) => {
    if (selectedColors.includes(color)) {
      onColorsChange(selectedColors.filter(c => c !== color));
    } else {
      onColorsChange([...selectedColors, color]);
    }
  };

  const handleSelectAll = () => {
    onColorsChange(['green', 'yellow', 'red']);
  };

  const handleClearAll = () => {
    onColorsChange([]);
  };

  const isAllSelected = selectedColors.length === 3;
  const isNoneSelected = selectedColors.length === 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedColors.length < 3 ? "default" : "outline"}
          className={cn(
            "transition-all duration-200 shadow-sm relative",
            selectedColors.length < 3
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
          )}
          title="Filter accounts by status color"
        >
          <Filter className="mr-2 h-4 w-4" />
          Status
          {selectedColors.length < 3 && selectedColors.length > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-indigo-600 text-xs font-bold"
            >
              {selectedColors.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg" 
        align="end"
        side="bottom"
        sideOffset={8}
        style={{ zIndex: 9999 }}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Filter by Status</p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900"
                onClick={handleSelectAll}
                disabled={isAllSelected}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900"
                onClick={handleClearAll}
                disabled={isNoneSelected}
              >
                None
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {COLOR_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start h-auto p-3 rounded-md',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  selectedColors.includes(option.value) && 'bg-gray-100 dark:bg-gray-700'
                )}
                onClick={() => handleColorToggle(option.value)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full',
                      option.bgClass,
                      'border-2 border-gray-300 dark:border-gray-600'
                    )} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </div>
                  {selectedColors.includes(option.value) && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </Button>
            ))}
          </div>
          
          {!isAllSelected && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedColors.length === 0 
                  ? 'No accounts will be shown'
                  : `Showing ${selectedColors.map(c => c).join(', ')} status accounts`
                }
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};