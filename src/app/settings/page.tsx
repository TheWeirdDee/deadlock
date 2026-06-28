'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppConfig, UserSession } from '@stacks/connect';
import { SidebarLayout } from '@/components/SidebarLayout';
import { contractDetails } from '@/lib/contract';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-xs font-bold tracking-widest text-ink-subtle uppercase mb-5">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink tracking-wide">{label}</p>
        {description && <p className="text-xs text-ink-subtle mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${value ? 'bg-purple-500' : 'bg-surface-hover border border-line'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifDeadlines, setNotifDeadlines] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ count: number; lastSyncedId: number } | null>(null);
  const [cleared, setCleared] = useState(false);
  const [copied, setCopied] = useState(false);

  const userSessionRef = useRef<UserSession | null>(null);
  if (!userSessionRef.current && typeof window !== 'undefined') {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionRef.current = new UserSession({ appConfig });
  }
  const userSession = userSessionRef.current;

  useEffect(() => {
    if (userSession && userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }

    // Read theme
    const stored = localStorage.getItem('deadlock_theme');
    setTheme(stored === 'light' ? 'light' : 'dark');

    // Notifications pref
    const notif = localStorage.getItem('deadlock_notif_deadlines');
    setNotifDeadlines(notif === 'true');

    // Cache info
    try {
      const raw = localStorage.getItem('deadlock_vows_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCacheInfo({
          count: Array.isArray(parsed.vows) ? parsed.vows.length : 0,
          lastSyncedId: parsed.lastSyncedId ?? 0,
        });
      }
    } catch {}
  }, []);

  const userAddress =
    userData?.profile?.stxAddress?.mainnet ||
    userData?.profile?.stxAddress?.testnet ||
    null;

  function handleThemeChange(isDark: boolean) {
    const next = isDark ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('deadlock_theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }

  function handleNotifChange(v: boolean) {
    setNotifDeadlines(v);
    localStorage.setItem('deadlock_notif_deadlines', String(v));
  }

  function handleClearCache() {
    localStorage.removeItem('deadlock_vows_cache');
    setCacheInfo(null);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  function handleCopy() {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    if (userSession) userSession.signUserOut();
    router.push('/');
  }

  return (
    <SidebarLayout activePage="settings">
      <div className="max-w-2xl mt-4 mb-24 space-y-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold font-bebas tracking-widest text-ink uppercase">Settings</h1>
          <p className="text-sm text-ink-muted mt-1">Manage your preferences and account.</p>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <Row label="Dark Mode" description="Switch between dark and light theme">
            <Toggle value={theme === 'dark'} onChange={handleThemeChange} />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row label="Deadline Reminders" description="Show alerts when vow deadlines are approaching">
            <Toggle value={notifDeadlines} onChange={handleNotifChange} />
          </Row>
        </Section>

        {/* Cache */}
        <Section title="Local Cache">
          <Row
            label="Cached Vows"
            description={cacheInfo ? `Last synced up to vow #${cacheInfo.lastSyncedId}` : 'No cache found'}
          >
            <span className="text-2xl font-bebas text-purple-400">{cacheInfo?.count ?? 0}</span>
          </Row>
          <div className="pt-2 border-t border-line">
            <button
              onClick={handleClearCache}
              className={`text-xs font-bold tracking-widest uppercase transition-colors ${cleared ? 'text-green-400' : 'text-red-400/70 hover:text-red-400'}`}
            >
              {cleared ? 'Cache cleared!' : 'Clear Vow Cache'}
            </button>
            <p className="text-xs text-ink-subtle mt-1">Forces a full resync from chain on next visit to Analytics or Leaderboard.</p>
          </div>
        </Section>

        {/* Account */}
        <Section title="Account">
          {userAddress ? (
            <>
              <Row label="Wallet Address" description="Your connected Stacks wallet">
                <button
                  onClick={handleCopy}
                  className={`text-xs font-mono font-bold transition-colors px-3 py-1.5 rounded-md border ${copied ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-line text-ink-muted hover:text-ink hover:border-line/60'}`}
                >
                  {copied ? 'Copied!' : `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}`}
                </button>
              </Row>
              <div className="pt-2 border-t border-line">
                <p className="text-xs text-ink-subtle font-mono break-all mb-3">{userAddress}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-red-400 hover:text-red-300 tracking-widest uppercase transition-colors"
                >
                  Disconnect Wallet
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-subtle">No wallet connected. Connect from the dashboard.</p>
          )}
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Contract" description="On-chain Clarity contract">
            <span className="text-xs font-mono text-ink-muted">{contractDetails.name}</span>
          </Row>
          <Row label="Network" description="Stacks blockchain network">
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
                ? 'text-green-400 bg-green-500/10 border border-green-500/30'
                : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              {process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'}
            </span>
          </Row>
          <Row label="System Status" description="View live diagnostics">
            <button
              onClick={() => router.push('/status')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 tracking-widest uppercase transition-colors"
            >
              View →
            </button>
          </Row>
        </Section>
      </div>
    </SidebarLayout>
  );
}
