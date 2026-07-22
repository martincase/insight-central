import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  className?: string;
}

export const CollapsibleSection = ({ 
  title, icon, children, defaultOpen = true, storageKey, className 
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`section_${storageKey}`);
      return stored !== null ? stored === 'true' : defaultOpen;
    }
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) localStorage.setItem(`section_${storageKey}`, String(next));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
        )}
        {icon}
        <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </span>
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
