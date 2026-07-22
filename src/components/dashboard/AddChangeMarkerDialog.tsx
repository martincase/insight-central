import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddChangeMarkerDialogProps {
  merchantToken: string;
  accountName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkerAdded?: () => void;
}

export const AddChangeMarkerDialog: React.FC<AddChangeMarkerDialogProps> = ({
  merchantToken, accountName, open, onOpenChange, onMarkerAdded,
}) => {
  const [date, setDate] = useState<Date>(new Date());
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!label.trim()) {
      toast({ title: 'Label required', description: 'Please enter a short label for this change marker.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('account_change_marker').insert({
        merchant_token: merchantToken,
        account_name: accountName,
        event_date: format(date, 'yyyy-MM-dd'),
        event_label: label.trim(),
        change_notes: notes.trim() || null,
        created_by: 'admin',
      });
      if (error) throw error;
      toast({ title: 'Marker added', description: `"${label}" on ${format(date, 'dd MMM yyyy')}` });
      setLabel('');
      setNotes('');
      setDate(new Date());
      onOpenChange(false);
      onMarkerAdded?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            Add Change Marker
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd MMM yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Label</Label>
            <Input placeholder="e.g. Q2 Full Overhaul" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Change Notes</Label>
            <Textarea
              placeholder="e.g. Reduced bids on 47 keywords. Added 120 negatives..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Marker'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
