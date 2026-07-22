import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

interface AuthGateProps {
  children: React.ReactNode;
}

const PILOT_ACCOUNT_ID = '726ff34c-6b00-457a-a0f8-1b97343b8870';

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { session, loading, signInWithPassword, requestMagicLink, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (session) return <>{children}</>;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    const { error: err } = await signInWithPassword(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  const handleMagicLink = async () => {
    if (!email) { setError('Please enter your email first.'); return; }
    setError(''); setInfo(''); setBusy(true);
    const { error: err, message } = await requestMagicLink(email, PILOT_ACCOUNT_ID);
    setBusy(false);
    if (err) setError(err);
    else setInfo(message || 'Check your inbox for a sign-in link.');
  };

  const handleGoogle = async () => {
    setError(''); setInfo(''); setBusy(true);
    const { error: err } = await signInWithGoogle();
    setBusy(false);
    if (err) setError(err.toLowerCase().includes('provider') ? 'Google sign-in is not configured yet. Please use email + password.' : err);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Access</h1>
            <p className="text-sm text-gray-600 mt-2">Sign in to continue</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setInfo(''); }}
              placeholder="you@company.com"
              autoFocus
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
            {info && <div className="text-sm text-green-600 text-center">{info}</div>}

            <Button type="submit" className="w-full" disabled={!email || !password || busy}>
              Sign in
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-400 uppercase">or</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLink}
              disabled={busy}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email me a sign-in link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={busy}
            >
              Sign in with Google (staff)
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need access?{' '}
              <a
                href="mailto:hello@martincase.co.uk"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Email hello@martincase.co.uk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
