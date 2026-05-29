'use client';
import 'regenerator-runtime/runtime';

import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Connect } from '@stacks/connect-react';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

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
