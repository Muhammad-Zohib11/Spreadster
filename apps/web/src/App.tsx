import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/components/ui/toaster';

const OAUTH_STORAGE_KEY = 'spreadster_oauth_result';

export default function App() {
  const { isAuthenticated, initFromToken } = useAuthStore();

  // Handle token passed via URL (after Google OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    if (token) {
      // Write to localStorage first — fires storage event in the opener iframe
      try {
        localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify({ token, name, ts: Date.now() }));
      } catch {}
      // Also try postMessage in case opener is accessible
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'SPREADSTER_AUTH', token, name }, '*');
        }
      } catch {}
      window.close();
      return;
    }
  }, []);

  // Listen for OAuth completion from popup via localStorage storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === OAUTH_STORAGE_KEY && e.newValue) {
        try {
          const { token, name } = JSON.parse(e.newValue) as { token: string; name: string };
          initFromToken(token, name ?? 'User');
          localStorage.removeItem(OAUTH_STORAGE_KEY);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [initFromToken]);

  // Handle postMessage from popup (fallback)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SPREADSTER_AUTH' && e.data.token) {
        initFromToken(e.data.token as string, (e.data.name as string) ?? 'User');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [initFromToken]);

  // On initial load (non-popup), check if a token was stored (e.g. popup closed before event fired)
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        const stored = localStorage.getItem(OAUTH_STORAGE_KEY);
        if (stored) {
          const { token, name } = JSON.parse(stored) as { token: string; name: string };
          initFromToken(token, name ?? 'User');
          localStorage.removeItem(OAUTH_STORAGE_KEY);
        }
      } catch {}
    }
  }, [isAuthenticated, initFromToken]);

  // Poll localStorage every 500ms — most reliable method for sandboxed GAS iframes
  // where storage events and postMessage may be blocked
  useEffect(() => {
    if (isAuthenticated) return;
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(OAUTH_STORAGE_KEY);
        if (raw) {
          const { token, name } = JSON.parse(raw) as { token: string; name: string };
          if (token) {
            initFromToken(token, name ?? 'User');
            localStorage.removeItem(OAUTH_STORAGE_KEY);
          }
        }
      } catch {}
    }, 500);
    return () => clearInterval(poll);
  }, [isAuthenticated, initFromToken]);

  // Handle token in URL when running as a top-level window (non-popup fallback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    if (token && !window.opener) {
      initFromToken(token, name ?? 'User');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [initFromToken]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isAuthenticated ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AppLayout />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoginScreen />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster />
    </>
  );
}
