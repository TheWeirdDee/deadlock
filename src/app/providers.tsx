'use client';
import 'regenerator-runtime/runtime';

import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Connect } from '@stacks/connect-react';
import { useState, useEffect, useMemo } from 'react';
/**
 * Providers wraps the children components with the Stacks auth Connect context
 * and handles client hydration mounting variables.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // AppConfig scopes:
  //   'store_write'   — required to save encrypted user data to Gaia storage
  //   'publish_data'  — required to make user profile data publicly readable
  const appConfig = useMemo(() => new AppConfig(['store_write', 'publish_data']), []);
  const userSession = useMemo(() => new UserSession({ appConfig }), [appConfig]);

  const authOptions = {
    appDetails: {
      name: 'DEADLOCK',       // App name shown in Hiro Wallet auth dialog
      icon: '/logo.png',      // App icon shown in Hiro Wallet auth dialog
    },
    userSession,
    onFinish: () => {
      // Full page reload after auth to re-initialize all session-dependent state
      window.location.reload();
    },
  };

  // Wait until client hydration completes to avoid SSR mismatch on Auth states
  if (!mounted) return null;

  return (
    <Connect authOptions={authOptions}>
      {children}
    </Connect>
  );
}
