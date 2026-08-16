import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizedBrandName } from '@/utils/shareUtils';

/* ---------------------------------------------------------------------------
 * Who is allowed to open a client dashboard.
 *
 * The share code in the path (/portwest/QQTCV) is not a secret — it is printed
 * in every month-end email, survives forwarding and never changes. On its own it
 * authenticated nobody. A link must now also carry ?t=<token>: an opaque,
 * account-bound, 60-day credential minted by the email builder and validated
 * server-side by rpc_redeem_link_token.
 *
 * Three ways in, and only three:
 *   demo   — /demo is public by design and carries no client data.
 *   staff  — Martin and Gemma open client dashboards from /admin. is_staff().
 *   token  — a live token whose account matches the brand AND share code in
 *            the path. A Portwest token on /cottam/IJ92T is refused.
 *
 * Everything else is refused, identically. A visitor is never told whether the
 * account exists, whether the token was wrong or merely expired.
 * ------------------------------------------------------------------------- */

export type LinkAccess =
  | { status: 'checking' }
  | { status: 'allowed'; via: 'demo' | 'staff' | 'token' }
  | { status: 'refused' };

interface LinkAccessArgs {
  shareId?: string;
  brandName?: string;
  isDemo?: boolean;
}

export type TokenVerdict = 'checking' | 'match' | 'refused';

/**
 * The whole gate, as a pure function, so every branch can be asserted directly
 * rather than only through a live session. Order matters: /demo is public, staff
 * outrank the token, and nothing is refused until the session has resolved.
 */
export const decideAccess = (input: {
  isDemo?: boolean;
  authLoading: boolean;
  isStaff: boolean;
  hasToken: boolean;
  tokenVerdict: TokenVerdict;
}): LinkAccess => {
  if (input.isDemo) return { status: 'allowed', via: 'demo' };
  // Never refuse before the session has resolved, or staff would see the
  // "can't open this" page for a beat every time they open a client dashboard.
  if (input.authLoading) return { status: 'checking' };
  if (input.isStaff) return { status: 'allowed', via: 'staff' };
  if (!input.hasToken) return { status: 'refused' };
  if (input.tokenVerdict === 'checking') return { status: 'checking' };
  return input.tokenVerdict === 'match' ? { status: 'allowed', via: 'token' } : { status: 'refused' };
};

export const useLinkAccess = ({ shareId, brandName, isDemo }: LinkAccessArgs): LinkAccess => {
  const { isStaff, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('t') || '').trim();

  const [tokenVerdict, setTokenVerdict] = useState<TokenVerdict>('checking');

  useEffect(() => {
    if (isDemo) return;

    if (!token) {
      setTokenVerdict('refused');
      return;
    }

    let cancelled = false;
    setTokenVerdict('checking');

    (async () => {
      try {
        // Redeeming bumps last_used_at / use_count server-side. Deliberately NOT
        // single-use: Outlook Safe Links, Mimecast and Proofpoint pre-fetch every
        // URL in an inbound mail, so a burn-on-read token would already be spent
        // by the time the client clicked it.
        const { data, error } = await (supabase.rpc as any)('rpc_redeem_link_token', { p_token: token });
        if (cancelled) return;

        const row = (Array.isArray(data) ? data[0] : data) as
          | { account_name?: string | null; share_code?: string | null }
          | null
          | undefined;

        if (error || !row) {
          setTokenVerdict('refused');
          return;
        }

        // The token grants exactly one account. It has to be the account this URL
        // is asking for, or a forwarded Portwest link becomes general access.
        const codeMatches = !!shareId && (row.share_code ?? '') === shareId;
        const brandMatches =
          !!brandName &&
          normalizedBrandName(String(row.account_name ?? '')) === normalizedBrandName(brandName);

        setTokenVerdict(codeMatches && brandMatches ? 'match' : 'refused');
      } catch {
        if (!cancelled) setTokenVerdict('refused');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, shareId, brandName, isDemo]);

  return decideAccess({ isDemo, authLoading, isStaff, hasToken: !!token, tokenVerdict });
};
