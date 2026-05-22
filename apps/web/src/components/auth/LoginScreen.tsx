import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { gasBridge } from '@/services/gas.bridge';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const COLLEGE_NAME = import.meta.env['VITE_COLLEGE_NAME'] ?? 'College Administration';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasAutoLoginDone, setGasAutoLoginDone] = useState(false);
  const isGASContext = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('gas') === 'true';
  const { login, initFromToken } = useAuthStore();

  // When inside GAS sidebar, auto-login using Google Sheets session identity
  useEffect(() => {
    const tryGasAutoLogin = async () => {
      const result = await gasBridge.gasAutoLogin();
      if (result.success && result.token) {
        initFromToken(result.token, result.user?.name ?? 'User');
      } else {
        setGasAutoLoginDone(true);
      }
    };
    if (isGASContext) {
      tryGasAutoLogin();
    } else {
      setGasAutoLoginDone(true);
    }
  }, [initFromToken, isGASContext]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as {
        success: boolean;
        token?: string;
        user?: { name: string; role: string; email: string };
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Login failed');
        return;
      }

      login(data.token!, data.user!);
    } catch {
      setError('Cannot connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Open OAuth in a popup so it works inside GAS sidebar iframes
    // App.tsx handles the token via localStorage storage event + postMessage
    const popup = window.open(
      `${API_BASE}/auth/google`,
      'spreadster_oauth',
      'width=520,height=620,left=200,top=100,resizable=yes,scrollbars=yes'
    );
    if (!popup) {
      // Popup blocked — fall back to redirect
      window.location.href = `${API_BASE}/auth/google`;
    }
  };

  // Show spinner while waiting for GAS auto-login (avoids flash of login form)
  if (!gasAutoLoginDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <span className="text-lg font-black text-white">✦</span>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-xl opacity-30" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-foreground">SPREADSTER</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={11} className="animate-spin" />
            Connecting to Google Sheets…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {/* Glow bg */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-[280px]"
      >
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="relative inline-flex mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <span className="text-2xl">✦</span>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-xl opacity-25" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">SPREADSTER</h1>
          <p className="text-xs text-muted-foreground mt-1">{COLLEGE_NAME}</p>
        </div>

        {/* Form card */}
        <div className="bg-secondary/60 backdrop-blur-sm rounded-2xl border border-border/60 p-5">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={cn(
                  'w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none',
                  'focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all',
                  'placeholder:text-muted-foreground/40',
                )}
                placeholder="admin@college.edu"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={cn(
                  'w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none',
                  'focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all',
                )}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                'bg-gradient-to-r from-indigo-500 to-violet-600 text-white',
                'hover:shadow-lg hover:shadow-indigo-500/25',
                'disabled:opacity-50',
              )}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] text-muted-foreground/60">or</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className={cn(
              'w-full h-10 rounded-xl border border-border/60 bg-background/40 text-sm font-medium',
              'hover:border-border hover:bg-secondary/80 transition-all flex items-center justify-center gap-2',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
          Internal College Administration System
        </p>
      </motion.div>
    </div>
  );
}
