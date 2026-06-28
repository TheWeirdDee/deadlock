'use client';

import { useState, useEffect, useCallback } from 'react';
import { SidebarLayout } from '@/components/SidebarLayout';
import { getCurrentBlockHeight, getVowCount, contractDetails } from '@/lib/contract';

type CheckState = 'idle' | 'loading' | 'ok' | 'error';

interface CheckResult {
  state: CheckState;
  value?: string;
  latencyMs?: number;
  error?: string;
}

const HIRO_API =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - t0) };
}

export default function StatusPage() {
  const [apiCheck, setApiCheck] = useState<CheckResult>({ state: 'idle' });
  const [contractCheck, setContractCheck] = useState<CheckResult>({ state: 'idle' });
  const [blockCheck, setBlockCheck] = useState<CheckResult>({ state: 'idle' });
  const [cacheInfo, setCacheInfo] = useState<{ count: number; lastSyncedId: number } | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runDiagnostics = useCallback(async () => {
    setApiCheck({ state: 'loading' });
    setContractCheck({ state: 'loading' });
    setBlockCheck({ state: 'loading' });

    // Use getCurrentBlockHeight() — it injects the API key via contract.ts fetchFn
    // Avoids raw unauthenticated fetch that Hiro rate-limits without an API key
    try {
      const { result: height, ms } = await timed(() => getCurrentBlockHeight());
      setApiCheck({ state: 'ok', value: HIRO_API, latencyMs: ms });
      setBlockCheck({ state: 'ok', value: String(height), latencyMs: ms });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setApiCheck({ state: 'error', error: msg });
      setBlockCheck({ state: 'error', error: msg });
    }

    // Contract read — get-vow-count
    try {
      const { result: count, ms } = await timed(() => getVowCount());
      setContractCheck({ state: 'ok', value: `${count} vows on-chain`, latencyMs: ms });
    } catch (e: any) {
      setContractCheck({ state: 'error', error: e?.message ?? String(e) });
    }

    // localStorage cache snapshot (client-only)
    try {
      const raw = localStorage.getItem('deadlock_vows_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCacheInfo({
          count: Array.isArray(parsed.vows) ? parsed.vows.length : 0,
          lastSyncedId: parsed.lastSyncedId ?? 0,
        });
      } else {
        setCacheInfo({ count: 0, lastSyncedId: 0 });
      }
    } catch {
      setCacheInfo(null);
    }

    setLastRun(new Date());
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const envVars = [
    { key: 'NEXT_PUBLIC_CONTRACT_ADDRESS', value: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS },
    { key: 'NEXT_PUBLIC_CONTRACT_NAME', value: process.env.NEXT_PUBLIC_CONTRACT_NAME },
    { key: 'NEXT_PUBLIC_NETWORK', value: process.env.NEXT_PUBLIC_NETWORK },
    { key: 'NEXT_PUBLIC_HIRO_API_KEY', value: process.env.NEXT_PUBLIC_HIRO_API_KEY ? '••••••••' : undefined },
  ];

  const allOk =
    apiCheck.state === 'ok' &&
    contractCheck.state === 'ok' &&
    blockCheck.state === 'ok';

  const anyError =
    apiCheck.state === 'error' ||
    contractCheck.state === 'error' ||
    blockCheck.state === 'error';

  const checks: { label: string; result: CheckResult; detail?: string }[] = [
    {
      label: 'HIRO API',
      result: apiCheck,
      detail: apiCheck.state === 'ok' ? apiCheck.value : apiCheck.error,
    },
    {
      label: 'BLOCK HEIGHT',
      result: blockCheck,
      detail: blockCheck.state === 'ok' ? `#${blockCheck.value}` : blockCheck.error,
    },
    {
      label: 'CONTRACT READ',
      result: contractCheck,
      detail: contractCheck.state === 'ok' ? contractCheck.value : contractCheck.error,
    },
  ];

  return (
    <SidebarLayout activePage="status">
      <div className="space-y-10 max-w-4xl mt-4 mb-24 font-space">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold font-bebas tracking-widest text-ink uppercase">
              System Status
            </h1>
            <p className="text-sm text-ink-muted mt-1 font-mono">
              Live diagnostics for the DEADLOCK on-chain platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastRun && (
              <span className="text-xs text-ink-subtle font-mono">
                Last run: {lastRun.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={runDiagnostics}
              className="px-5 py-2 border border-line hover:border-white/30 text-xs font-bold tracking-widest uppercase rounded-full bg-surface-raised hover:bg-surface-hover transition-all font-bebas text-ink"
            >
              Run Again
            </button>
          </div>
        </div>

        {/* Overall badge */}
        <div
          className={`glass-card px-6 py-4 flex items-center gap-4 border-l-4 ${
            anyError
              ? 'border-red-500 bg-red-500/5'
              : allOk
              ? 'border-green-500 bg-green-500/5'
              : 'border-yellow-500 bg-yellow-500/5'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              anyError ? 'bg-red-500 animate-pulse' : allOk ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <div>
            <p className="text-sm font-bold uppercase tracking-widest font-bebas text-ink">
              {anyError ? 'DEGRADED' : allOk ? 'ALL SYSTEMS OPERATIONAL' : 'CHECKING...'}
            </p>
            <p className="text-xs text-ink-subtle font-mono mt-0.5">
              {contractDetails.address}.{contractDetails.name} · {process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'}
            </p>
          </div>
        </div>

        {/* Check cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {checks.map(({ label, result, detail }) => (
            <div
              key={label}
              className={`glass-card p-5 border ${
                result.state === 'ok'
                  ? 'border-green-500/30 bg-green-500/5'
                  : result.state === 'error'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-line bg-surface-raised'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-widest text-ink-subtle uppercase">{label}</span>
                <span
                  className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                    result.state === 'ok'
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : result.state === 'error'
                      ? 'border-red-500/40 text-red-400 bg-red-500/10'
                      : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                  }`}
                >
                  {result.state === 'ok' ? 'OK' : result.state === 'error' ? 'ERROR' : 'CHECKING'}
                </span>
              </div>
              <p className={`text-sm font-mono break-all leading-relaxed ${result.state === 'error' ? 'text-red-400' : 'text-ink-muted'}`}>
                {result.state === 'loading' ? <span className="animate-pulse">—</span> : (detail ?? '—')}
              </p>
              {result.latencyMs !== undefined && (
                <p className="text-xs text-ink-subtle font-mono mt-2">{result.latencyMs}ms</p>
              )}
            </div>
          ))}
        </div>

        {/* Cache */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-bold tracking-widest text-ink-muted uppercase mb-4">Local Cache</h2>
          {cacheInfo && (cacheInfo.count > 0 || cacheInfo.lastSyncedId > 0) ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-widest mb-1">Cached Vows</p>
                <p className="text-3xl font-bebas font-bold text-ink">{cacheInfo.count}</p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-widest mb-1">Last Synced ID</p>
                <p className="text-3xl font-bebas font-bold text-purple-400">#{cacheInfo.lastSyncedId}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-subtle font-mono">No cache found in localStorage.</p>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('deadlock_vows_cache');
              setCacheInfo({ count: 0, lastSyncedId: 0 });
            }}
            className="mt-4 text-xs font-bold text-red-400/70 hover:text-red-400 tracking-widest uppercase transition-colors"
          >
            Clear Cache
          </button>
        </div>

        {/* Environment */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-bold tracking-widest text-ink-muted uppercase mb-4">Environment</h2>
          <div className="space-y-4">
            {envVars.map(({ key, value }) => (
              <div key={key} className="flex items-start justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-mono text-ink-muted shrink-0">{key}</span>
                <span className={`text-sm font-mono font-bold text-right break-all ${value ? 'text-green-400' : 'text-red-400'}`}>
                  {value ?? 'NOT SET'}
                </span>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <span className="text-sm font-mono text-ink-muted shrink-0">CONTRACT_ADDRESS (resolved)</span>
              <span className="text-sm font-mono text-ink text-right break-all max-w-[60%]">{contractDetails.address}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-mono text-ink-muted shrink-0">CONTRACT_NAME (resolved)</span>
              <span className="text-sm font-mono text-ink">{contractDetails.name}</span>
            </div>
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
