import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spid: string;
  fiscalYear: number;
  brandName: string;
  onCommitted: () => void;
}

interface ProposedLine {
  metric: string;
  scope_level: string;
  country_code: string | null;
  period_month: string;
  amount: number;
  currency: string;
}

interface AnalyzeResult {
  import_id: string;
  engine?: string;
  confidence?: number;
  warnings?: string[];
  totals_by_metric?: Record<string, number>;
  line_count?: number;
  proposed_lines?: ProposedLine[];
}

export function BudgetUploadDialog({ open, onOpenChange, spid, fiscalYear, brandName, onCommitted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState(`FY${fiscalYear}`);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setLabel(`FY${fiscalYear}`);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const path = `${spid}/${fiscalYear}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from('budget-uploads').upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      const { data, error } = await supabase.functions.invoke('budget-ingest', {
        body: {
          action: 'analyze',
          selling_partner_id: spid,
          fiscal_year: fiscalYear,
          file_path: up.data.path,
          source_file_name: file.name,
        },
      });
      if (error) throw error;
      setResult(data as AnalyzeResult);
    } catch (e: any) {
      console.error('analyze error', e);
      toast.error(e?.message || 'Failed to analyze file');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!result?.import_id) return;
    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('budget-ingest', {
        body: {
          action: 'commit',
          import_id: result.import_id,
          brand_name: brandName,
          label,
          created_by: 'dashboard',
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error('Commit failed');
      onCommitted();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      console.error('commit error', e);
      toast.error(e?.message || 'Failed to commit budget');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload budget · FY{fiscalYear}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-file">Budget spreadsheet (.xlsx)</Label>
              <Input
                id="budget-file"
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                We'll parse the sheet and show you a preview before saving.
              </p>
            </div>
            <div>
              <Label htmlFor="budget-label">Version label</Label>
              <Input
                id="budget-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {result.confidence != null && (
                <Badge variant={result.confidence >= 0.8 ? 'default' : 'outline'}>
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {result.engine && <Badge variant="outline">Engine: {result.engine}</Badge>}
              <Badge variant="outline">{result.line_count ?? result.proposed_lines?.length ?? 0} lines</Badge>
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> Warnings
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.totals_by_metric && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.totals_by_metric).map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
                    <div className="text-lg font-semibold">
                      {new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(v || 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.proposed_lines || []).map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.metric}</TableCell>
                      <TableCell>{l.country_code || l.scope_level}</TableCell>
                      <TableCell>{format(new Date(l.period_month), 'MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Number(l.amount || 0))}
                      </TableCell>
                      <TableCell>{l.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <Label htmlFor="budget-label-2">Version label</Label>
              <Input
                id="budget-label-2"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze} disabled={!file || analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Analyze
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={reset}>
                Choose different file
              </Button>
              <Button onClick={handleCommit} disabled={committing}>
                {committing && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Confirm & save
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
