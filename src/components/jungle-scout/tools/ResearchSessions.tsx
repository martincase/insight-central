import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ResearchSessionsProps {
  accountName: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending': return <Badge className="bg-amber-100 text-amber-800">pending</Badge>;
    case 'running': return <Badge className="bg-blue-100 text-blue-800">running</Badge>;
    case 'complete': return <Badge className="bg-green-100 text-green-800">complete</Badge>;
    case 'error': return <Badge className="bg-red-100 text-red-800">error</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

interface Session {
  id: string;
  seed_keyword: string;
  marketplace: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  product_description: string | null;
  target_asin: string | null;
  target_category: string | null;
}

export const ResearchSessions = ({ accountName }: ResearchSessionsProps) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['js-research-sessions-list', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_research_sessions')
        .select('*')
        .eq('account_name', accountName)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  if (!sessions?.length) {
    return <p className="text-sm text-muted-foreground py-4">No research sessions yet. Use Research Launcher to create one.</p>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="border rounded-lg overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seed Keyword</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSession(s)}>
                <TableCell className="font-medium">{s.seed_keyword}</TableCell>
                <TableCell>{s.marketplace?.toUpperCase()}</TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
                <TableCell className="text-sm">{s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy HH:mm') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Keyword:</span> <strong>{selectedSession.seed_keyword}</strong></div>
                <div><span className="text-muted-foreground">Marketplace:</span> <strong>{selectedSession.marketplace?.toUpperCase()}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedSession.status)}</div>
                <div><span className="text-muted-foreground">Created:</span> {selectedSession.created_at ? format(new Date(selectedSession.created_at), 'dd MMM yyyy HH:mm') : '—'}</div>
                {selectedSession.target_asin && (
                  <div><span className="text-muted-foreground">Target ASIN:</span> <strong className="font-mono">{selectedSession.target_asin}</strong></div>
                )}
                {selectedSession.target_category && (
                  <div><span className="text-muted-foreground">Category:</span> {selectedSession.target_category}</div>
                )}
              </div>
              {selectedSession.product_description && (
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1 text-sm">{selectedSession.product_description}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">Session ID: {selectedSession.id}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
