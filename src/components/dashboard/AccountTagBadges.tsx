import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Tag, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TAG_OPTIONS, type TagType, type TagInfo } from '@/hooks/useAccountTags';

const TAG_COLORS: Record<TagType, { sm: string; lg: string }> = {
  ramp_up: {
    sm: 'bg-blue-100 text-blue-700 border-blue-200',
    lg: 'bg-blue-500 text-white border-blue-600',
  },
  under_performing: {
    sm: 'bg-orange-100 text-orange-700 border-orange-200',
    lg: 'bg-orange-500 text-white border-orange-600',
  },
  new_product_launch: {
    sm: 'bg-purple-100 text-purple-700 border-purple-200',
    lg: 'bg-purple-500 text-white border-purple-600',
  },
  seasonal_peak: {
    sm: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    lg: 'bg-emerald-500 text-white border-emerald-600',
  },
};

interface AccountTagBadgesProps {
  merchantToken: string;
  size: 'sm' | 'lg';
  editable?: boolean;
  tags?: TagInfo[];
  onAddTag?: (merchantToken: string, tag: TagType, expiresAt?: Date) => Promise<any>;
  onRemoveTag?: (merchantToken: string, tag: TagType) => Promise<any>;
}

export const AccountTagBadges = ({
  merchantToken,
  size,
  editable = false,
  tags = [],
  onAddTag,
  onRemoveTag,
}: AccountTagBadgesProps) => {
  const [expiryDates, setExpiryDates] = useState<Record<string, Date | undefined>>({});
  const [showCalendarFor, setShowCalendarFor] = useState<string | null>(null);

  const activeTags = new Set(tags.map((t) => t.tag));

  const handleToggle = async (tag: TagType) => {
    if (activeTags.has(tag)) {
      await onRemoveTag?.(merchantToken, tag);
    } else {
      await onAddTag?.(merchantToken, tag, expiryDates[tag]);
    }
  };

  if (!editable && tags.length === 0) return null;

  const badges = tags.map((t) => {
    const colors = TAG_COLORS[t.tag];
    const label = TAG_OPTIONS.find((o) => o.value === t.tag)?.label ?? t.tag;
    return (
      <Badge
        key={t.tag}
        variant="outline"
        className={cn(
          'whitespace-nowrap border',
          size === 'sm'
            ? cn('text-[10px] leading-tight px-1 py-0 font-medium', colors.sm)
            : cn('text-xs px-2 py-0.5 font-semibold', colors.lg)
        )}
      >
        {label}
      </Badge>
    );
  });

  if (!editable) {
    return <span className="inline-flex items-center gap-1 flex-wrap">{badges}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 flex-wrap cursor-pointer group">
          {badges}
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
            <Tag className="h-3 w-3" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Account Tags</p>
          {TAG_OPTIONS.map((opt) => {
            const isActive = activeTags.has(opt.value);
            const existingTag = tags.find((t) => t.tag === opt.value);
            return (
              <div key={opt.value} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={() => handleToggle(opt.value)}
                  />
                  <Badge
                    variant="outline"
                    className={cn('text-xs border', TAG_COLORS[opt.value].sm)}
                  >
                    {opt.label}
                  </Badge>
                  {isActive && existingTag?.expires_at && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Expires {format(new Date(existingTag.expires_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                {!isActive && (
                  <div className="ml-6">
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={() =>
                        setShowCalendarFor(showCalendarFor === opt.value ? null : opt.value)
                      }
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {expiryDates[opt.value]
                        ? `Expires: ${format(expiryDates[opt.value]!, 'MMM d, yyyy')}`
                        : 'Set expiry (optional)'}
                    </button>
                    {showCalendarFor === opt.value && (
                      <Calendar
                        mode="single"
                        selected={expiryDates[opt.value]}
                        onSelect={(date) => {
                          setExpiryDates((prev) => ({ ...prev, [opt.value]: date ?? undefined }));
                          setShowCalendarFor(null);
                        }}
                        disabled={(date) => date < new Date()}
                        className="p-3 pointer-events-auto"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
