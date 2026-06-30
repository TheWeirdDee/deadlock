'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, UserSession } from '@stacks/connect';
import { AnimatePresence } from 'framer-motion';
import { getVowCount, getVow } from '@/lib/contract';
import { loadVowCache, patchVowInCache } from '@/lib/vowCache';
import { VowCard } from '@/components/VowCard';
import { SidebarLayout } from '@/components/SidebarLayout';
import { useRouter } from 'next/navigation';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';

type StatusFilter = 'all' | 'active' | 'completed' | 'failed' | 'challenged';
type TypeFilter = 'all' | 'burn' | 'rival' | 'cause';

export default function FeedPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const userSessionRef = useRef<UserSession | null>(null);
  if (!userSessionRef.current && typeof window !== 'undefined') {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionRef.current = new UserSession({ appConfig });
  }
  const userSession = userSessionRef.current;

  useEffect(() => {
    try {
      if (userSession && userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
      }
    } catch (e) {
      console.error("Session load error", e);
    }
    fetchVows();
  }, [router]);

  useEffect(() => {
    const handleUpdate = () => fetchVows();
    window.addEventListener('vows_updated', handleUpdate);
    return () => window.removeEventListener('vows_updated', handleUpdate);
  }, []);

  const filteredVows = useMemo(() => {
    return vows.filter(vow => {
      const q = search.trim().toLowerCase();
      if (q) {
        const title = (vow.title ?? '').toLowerCase();
        const desc = (vow.description ?? '').toLowerCase();
        const creator = (vow.creator ?? '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !creator.includes(q)) return false;
      }

      const vowStatus = Number(vow.status ?? 0);
      if (statusFilter === 'active' && vowStatus !== VOW_STATUS.ACTIVE) return false;
      if (statusFilter === 'completed' && vowStatus !== VOW_STATUS.COMPLETED) return false;
      if (statusFilter === 'failed' && vowStatus !== VOW_STATUS.FAILED) return false;
      if (statusFilter === 'challenged' && vowStatus !== VOW_STATUS.CHALLENGED) return false;

      const vowType = Number(vow.vowType ?? vow['vow-type'] ?? 0);
      if (typeFilter === 'burn' && vowType !== VOW_TYPES.BURN) return false;
      if (typeFilter === 'rival' && vowType !== VOW_TYPES.RIVAL) return false;
      if (typeFilter === 'cause' && vowType !== VOW_TYPES.CAUSE) return false;

      return true;
    });
  }, [vows, search, statusFilter, typeFilter]);

  function mergePending(onchain: any[]): any[] {
    let pending: any[] = [];
    try {
      const stored = localStorage.getItem('pending_vows');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((p: any) =>
          !onchain.some(v => v.title === p.title && v.description === p.description)
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem('pending_vows', JSON.stringify(filtered));
        }
        pending = filtered;
      }
    } catch {}
    return [...pending, ...onchain];
  }

  async function fetchVows() {
    const cache = loadVowCache();
    const cached50 = cache.vows.slice().reverse().slice(0, 50);
    if (cached50.length > 0) {
      setVows(mergePending(cached50));
      setLoading(false);
    }

    try {
      setLoading(cached50.length === 0);
      const count = await getVowCount();
      const freshVows: any[] = [];

      for (let i = count; i > Math.max(0, count - 50); i--) {
        try {
          const vow = await getVow(i);
          if (vow) {
            const vowWithId = { ...vow, id: i };
            freshVows.push(vowWithId);
            patchVowInCache(vowWithId);
            setVows(mergePending([...freshVows]));
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error('[feed] Error fetching vow', i, err);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SidebarLayout activePage="feed">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 flex flex-col gap-8">
        <div className="space-y-4 mb-6 border-b border-line pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bebas tracking-wider mb-1">VOWS FEED</h1>
              <p className="text-ink-muted text-sm">Browse all active and completed challenges across the protocol.</p>
            </div>
            <span className="text-xs opacity-40 uppercase tracking-widest bg-surface-raised px-3 py-1.5 rounded-full border border-line flex-shrink-0">
              AUTO-REFRESHING ON-CHAIN
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, description, or creator address..."
              className="w-full bg-surface-raised border border-line focus:border-ink-muted pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none transition-colors rounded-lg"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink text-xs">✕</button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {(['all', 'active', 'completed', 'failed', 'challenged'] as StatusFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full border transition-all ${
                    statusFilter === f
                      ? 'border-ink-muted bg-surface-hover text-ink'
                      : 'border-line text-ink-subtle hover:border-ink-muted hover:text-ink-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="w-px bg-line self-stretch hidden sm:block" />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'burn', 'rival', 'cause'] as TypeFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full border transition-all ${
                    typeFilter === f
                      ? f === 'burn' ? 'border-purple-400/70 bg-purple-400/10 text-purple-400'
                        : f === 'rival' ? 'border-blue-400/70 bg-blue-400/10 text-blue-400'
                        : f === 'cause' ? 'border-green-400/70 bg-green-400/10 text-green-400'
                        : 'border-ink-muted bg-surface-hover text-ink'
                      : 'border-line text-ink-subtle hover:border-ink-muted hover:text-ink-muted'
                  }`}
                >
                  {f === 'all' ? 'ALL TYPES' : f}
                </button>
              ))}
            </div>
          </div>

          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span>{filteredVows.length} result{filteredVows.length !== 1 ? 's' : ''}</span>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }} className="text-purple-400 hover:text-purple-300 transition-colors">
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="w-full">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 glass-card animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              {filteredVows.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-line-strong">
                  <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {search || statusFilter !== 'all' || typeFilter !== 'all' ? 'NO MATCHING VOWS' : 'NO VOWS FOUND'}
                  </h3>
                  <p className="text-ink-muted text-sm max-w-sm mx-auto">
                    {search || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'There are no vows active on the network right now. Create one to get started!'}
                  </p>
                  {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }} className="mt-4 text-sm font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 px-4 py-2 rounded-full transition-colors">
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredVows.map((vow, idx) => (
                      <VowCard key={vow.id} vow={vow} index={idx} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </SidebarLayout>
  );
}
