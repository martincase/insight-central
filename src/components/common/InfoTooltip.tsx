import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  /** Tooltip body — string or rich JSX */
  content: React.ReactNode;
  /** Optional extra classes on the trigger icon */
  className?: string;
  /** Tooltip side */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Tooltip alignment */
  align?: 'start' | 'center' | 'end';
  /** Max width class for the content (default w-72) */
  contentClassName?: string;
}

/**
 * Standardised ⓘ hover tooltip used for metric explanations across the app.
 * One source of truth so every KPI card / headline tile looks identical.
 */
export const InfoTooltip = ({
  content,
  className,
  side = 'top',
  align = 'center',
  contentClassName,
}: InfoTooltipProps) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className={cn(
            'inline-flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors',
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={cn('max-w-xs text-xs leading-relaxed', contentClassName)}>
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default InfoTooltip;
