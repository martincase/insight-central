import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  accountName: string;
  value: number | null;
  onSaved: (newValue: number) => void;
}

export function TargetAcosEditor({ accountName, value, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = Number(draft);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error('Enter a value between 0 and 100');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('accounts_master')
        .update({ target_acos: num })
        .eq('account_name', accountName);
      if (error) throw error;
      onSaved(num);
      toast.success(`Target ACOS set to ${num}%`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update target ACOS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value != null ? String(value) : '');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Edit target ACOS"
          className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="text-sm font-semibold">Target ACOS</div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="pr-7"
                autoFocus
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Admin-only. Verdicts and scores recalculate overnight against the new target.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TargetAcosEditor;
