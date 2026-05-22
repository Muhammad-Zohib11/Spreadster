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
  const { login, initFromToken } = useAuthStore();

  // When inside GAS sidebar, auto-login using Google Sheets session identity
  useEffect(() => {
    const tryGasAutoLogin = async () => {
      const result = await gasBridge.gasAutoLogin();
      if (result.success && result.token) {
        initFromToken(result.token, result.user?.name ?? 'User');
      }
    };
    tryGasAutoLogin();
  }, [initFromToken]);

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary mx-auto flex items-center justify-center mb-3">
            <span className="text-xl font-black text-primary-foreground">S</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">SPREADSTER</h1>
          <p className="text-sm text-muted-foreground mt-1">{COLLEGE_NAME}</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={cn(
                  'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
                  'focus:ring-2 focus:ring-ring focus:border-primary transition-all',
                  'placeholder:text-muted-foreground/60',
                )}
                placeholder="admin@college.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={cn(
                  'w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none',
                  'focus:ring-2 focus:ring-ring focus:border-primary transition-all',
                )}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold',
                'hover:bg-primary/90 transition-all flex items-center justify-center gap-2',
                'disabled:opacity-60',
              )}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className={cn(
              'w-full h-9 rounded-lg border border-border bg-background text-sm font-medium',
              'hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-center gap-2',
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

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Internal College Administration System
        </p>
      </motion.div>
    </div>
  );
}
