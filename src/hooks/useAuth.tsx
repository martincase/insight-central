import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  user: User | null;
  isStaff: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  requestMagicLink: (email: string, accountId: string) => Promise<{ error: string | null; message?: string }>;
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

  const requestMagicLink: AuthState["requestMagicLink"] = async (email, accountId) => {
    const { data, error } = await supabase.functions.invoke("client-magic-link", { body: { email, account_id: accountId } });
    if (error) return { error: error.message };
    return { error: null, message: (data as { message?: string })?.message };
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
