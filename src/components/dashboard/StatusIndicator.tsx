import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type StatusColor = 'green' | 'yellow' | 'red';

interface StatusIndicatorProps {
  status: 'active' | 'inactive';
  currentColor?: StatusColor;
  onColorChange: (color: StatusColor) => void;
}

const COLOR_OPTIONS: Array<{
  value: StatusColor;
  label: string;
  bgClass: string;
  textClass: string;
  hoverClass: string;
}> = [
  {
    value: 'green',
    label: 'Green (Good)',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    hoverClass: 'hover:bg-green-200',
  },
  {
    value: 'yellow',
    label: 'Yellow (Warning)',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    hoverClass: 'hover:bg-yellow-200',
  },
  {
    value: 'red',
    label: 'Red (Critical)',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    hoverClass: 'hover:bg-red-200',
  },
];

export const StatusIndicator = ({ status, currentColor = 'green', onColorChange }: StatusIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedColorOption = COLOR_OPTIONS.find(option => option.value === currentColor) || COLOR_OPTIONS[0];

  const handleColorSelect = (color: StatusColor) => {
    console.log('Status color selected:', color);
    onColorChange(color);
    setIsOpen(false);
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Status badge clicked!');
    setIsOpen(!isOpen);
  };

  const handleOpenChange = (open: boolean) => {
    console.log('Popover open state changed:', open);
    setIsOpen(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div>
          <Badge 
            variant={status === 'active' ? 'default' : 'secondary'} 
            className={cn(
              'cursor-pointer transition-all duration-200 hover:scale-105',
              selectedColorOption.bgClass,
              selectedColorOption.textClass,
              selectedColorOption.hoverClass
            )}
            onClick={handleBadgeClick}
          >
            {status}
          </Badge>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg" 
        align="end"
        side="bottom"
        sideOffset={8}
        style={{ zIndex: 9999 }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Status Color</p>
          {COLOR_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start h-auto p-3 rounded-md',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                currentColor === option.value && 'bg-gray-100 dark:bg-gray-700'
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleColorSelect(option.value);
              }}
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
                {currentColor === option.value && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};