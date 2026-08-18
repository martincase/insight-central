import { Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const UNLOCK_MODAL_COPY = {
  title: 'Unlock more of your dashboard',
  intro:
    "A couple of sections aren't showing yet because we don't yet have the data access for them. Enabling these gives you a fuller picture:",
  areas: {
    brandAnalytics: {
      icon: '📊',
      name: 'Brand Analytics',
      description:
        'Brand Analytics — your share of search and what shoppers are searching for. To enable: grant Martin Case access to your Amazon Brand Analytics / Search Query Performance (requires Brand Registry).',
    },
    profitLoss: {
      icon: '💷',
      name: 'Profit & Loss',
      description:
        'Profit & Loss — true profit per product after fees and cost. To enable: share your product costs (COGS) and/or financial-report access.',
    },
  },
  footerPrefix: "Just reply to our email or contact ",
  contactEmail: 'hello@martincase.co.uk',
  footerSuffix: " and we'll set it up for you.",
  gotIt: 'Got it',
  dontShow: "Don't show again",
  /** Strip copy — the same ask, sized for a footer rather than a dialog. */
  stripLead: 'Two sections are still switched off',
  stripDetail: 'See what to send us',
  stripDismiss: 'Dismiss',
};

interface UnlockDashboardStripProps {
  onOpen: () => void;
  onDismiss: () => void;
  missing: { brandAnalytics: boolean; profitLoss: boolean };
}

/**
 * The unlock ask, as a strip under the data instead of a dialog over it.
 *
 * It used to auto-open a modal the moment tab availability resolved, so the
 * first thing a paying client saw was a request for their COGS — before a
 * single figure. The ask is legitimate, its timing was not: the client reads
 * their numbers first, and finds this at the bottom when they are done.
 */
export const UnlockDashboardStrip = ({ onOpen, onDismiss, missing }: UnlockDashboardStripProps) => {
  const c = UNLOCK_MODAL_COPY;
  const names: string[] = [];
  if (missing.brandAnalytics) names.push(c.areas.brandAnalytics.name);
  if (missing.profitLoss) names.push(c.areas.profitLoss.name);
  if (names.length === 0) return null;

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
      <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-700" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-gray-700">
        <span className="font-medium text-gray-900">
          {names.length === 1 ? 'One section is still switched off' : c.stripLead}
        </span>{' '}
        — {names.join(' and ')}. We need data access from you before {names.length === 1 ? 'it' : 'they'} can show.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpen}
        className="h-8 border-blue-300 bg-white text-blue-800 hover:bg-blue-100"
      >
        {c.stripDetail}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        aria-label={c.stripDismiss}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

interface UnlockDashboardModalProps {
  open: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
  missing: { brandAnalytics: boolean; profitLoss: boolean };
}

export const UnlockDashboardModal = ({
  open,
  onClose,
  onDontShowAgain,
  missing,
}: UnlockDashboardModalProps) => {
  const c = UNLOCK_MODAL_COPY;
  const rows: Array<{ icon: string; name: string; description: string }> = [];
  if (missing.brandAnalytics) rows.push(c.areas.brandAnalytics);
  if (missing.profitLoss) rows.push(c.areas.profitLoss);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{c.title}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">{c.intro}</p>
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.name}
                className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-white/70"
              >
                <div className="text-2xl leading-none flex-shrink-0">{r.icon}</div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold text-gray-900 mb-1">{r.name}</div>
                  <p>{r.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {c.footerPrefix}
            <a
              href={`mailto:${c.contactEmail}`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {c.contactEmail}
            </a>
            {c.footerSuffix}
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDontShowAgain}>
            {c.dontShow}
          </Button>
          <Button size="sm" onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            {c.gotIt}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
