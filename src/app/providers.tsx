'use client';
import 'regenerator-runtime/runtime';

import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Connect } from '@stacks/connect-react';
import { useState, useEffect } from 'react';

/**
 * Providers — root-level context wrapper for the Deadlock app.
 *
 * Wraps the entire app in the Stacks Connect context, which:
 *  - Provides `doContractCall`, `doOpenAuth`, and other wallet hooks
 *    via `useConnect()` anywhere in the component tree
 *  - Manages the Hiro Wallet authentication session lifecycle
 *
 * Mounting guard:
 *   The `mounted` state prevents SSR hydration mismatches caused by
 *   reading wallet session state (localStorage) on the server.
 *   Nothing is rendered until the client has fully hydrated.
 */

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
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

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
