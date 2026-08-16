import { useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * "Send me a link" — the way off the refusal page.
 *
 * A dashboard link only opens with a live ?t= token, so an old email is a dead
 * end. This puts the remedy on the page itself: the client types the address we
 * already hold for them, and client-request-link emails a fresh link.
 *
 * The confirmation deliberately does not depend on the answer. The endpoint
 * returns the same body for a known address, an unknown one and a rate-limited
 * one, and this form shows the same sentence even if the call itself falls over
 * — anything else would let a stranger use this box to find out who our clients
 * are. The hello@ line stays underneath for anyone genuinely not on the list.
 * ------------------------------------------------------------------------- */

/** Kept identical to the edge function's own reply. */
const CONFIRMATION = "If your address is on our list, we've sent you a link. Please check your inbox.";

interface RequestDashboardLinkProps {
  /** Share code of the dashboard being asked about; scopes what we send back. */
  shareCode?: string;
}

export const RequestDashboardLink = ({ shareCode }: RequestDashboardLinkProps = {}) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      // shareCode scopes the request to the dashboard actually being asked about,
      // so an address entitled to several accounts is never posted a link to a
      // different client's dashboard than the one in front of them.
      await supabase.functions.invoke('client-request-link', {
        body: { email: email.trim(), share_code: shareCode ?? '' },
      });
    } catch {
      // Swallowed on purpose — see the note above. A network failure must look
      // exactly like a success, or the difference becomes the signal.
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" aria-hidden="true" />
          <p className="text-sm text-blue-900" role="status">{CONFIRMATION}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Label htmlFor="request-link-email" className="text-sm font-semibold text-gray-900">
        Send me a new link
      </Label>
      <p className="mt-1 text-sm text-gray-600">
        Enter the email address we normally send your reports to and we&rsquo;ll post a fresh link over.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          id="request-link-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@yourcompany.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white sm:flex-1"
        />
        <Button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
        >
          {sending ? 'Sending…' : 'Send me a link'}
        </Button>
      </div>
    </form>
  );
};

export default RequestDashboardLink;
