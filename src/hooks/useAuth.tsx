import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  user: User | null;
  isStaff: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  /** accountId is accepted for call-site compatibility but no longer used - the
   *  reply is scoped by share_code on a dashboard page, or unscoped at the root. */
  requestMagicLink: (email: string, accountId?: string) => Promise<{ error: string | null; message?: string }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStaff = useCallback(async (s: Session | null) => {
    if (!s) { setIsStaff(false); return; }
    const { data, error } = await (supabase.rpc as any)("is_staff");
    setIsStaff(!error && data === true);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => { void refreshStaff(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void refreshStaff(data.session).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshStaff]);

  const signInWithPassword: AuthState["signInWithPassword"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Repointed from client-magic-link to client-request-link on 2026-08-16.
  //
  // client-magic-link builds a Supabase Auth magic link, whose URL comes from the
  // project's Site URL — still 'localhost', so every link it sent landed on a dead
  // page. client-request-link instead mints one of our own dashboard tokens and
  // emails a direct link, with no Auth involvement and nothing to configure.
  //
  // No share_code is passed here on purpose: this is the root login, where there is
  // no dashboard in context, so the reader gets a link for every account their
  // address is approved against. On a client dashboard's refusal page the share code
  // IS passed, which scopes the reply to that one account.
  //
  // The reply is deliberately the same whether or not the address is recognised.
  const requestMagicLink: AuthState["requestMagicLink"] = async (email) => {
    try {
      await supabase.functions.invoke("client-request-link", { body: { email } });
    } catch {
      // Swallowed: a network failure must look identical to a success, or the
      // difference tells a stranger whether the address is one of our clients.
    }
    return { error: null, message: "If your address is on our list, we've sent you a link." };
  };

  const signInWithGoogle: AuthState["signInWithGoogle"] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    return { error: error?.message ?? null };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isStaff, loading, signInWithPassword, requestMagicLink, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
