import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  const { isAuthenticated, initFromToken } = useAuthStore();

  // Handle token passed via URL (after Google OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    if (token) {
      initFromToken(token, name ?? 'User');
      // Remove token from URL without page reload
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
