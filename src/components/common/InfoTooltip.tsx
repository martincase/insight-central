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
      {/*
        The trigger is a <span>, not a <button>. Several call sites drop an
        InfoTooltip inside a sortable table header — which is itself a button —
        and a nested <button> is invalid HTML (React logs
        "validateDOMNesting: <button> cannot appear as a descendant of <button>"
        on every render). role="img" + aria-label keeps the icon named for
        screen readers without making it a second interactive control, and
        tabIndex keeps it reachable by keyboard so the tooltip still opens.
      */}
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label="More info"
          tabIndex={0}
          className={cn(
            'inline-flex items-center justify-center cursor-help text-muted-foreground/60 hover:text-foreground transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm',
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={cn('max-w-xs text-xs leading-relaxed', contentClassName)}>
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default InfoTooltip;
