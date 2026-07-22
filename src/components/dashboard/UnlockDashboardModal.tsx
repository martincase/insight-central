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
