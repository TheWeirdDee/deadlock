'use client';
import 'regenerator-runtime/runtime';

import { AppConfig, UserSession } from '@stacks/connect';
import { Connect } from '@stacks/connect-react';
import { useState, useEffect, useMemo } from 'react';

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
      name: 'DEADLOCK',
      icon: '/logo.png',
    },
    userSession,
    onFinish: () => {
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
