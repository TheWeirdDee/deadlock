 'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { motion, AnimatePresence } from 'framer-motion';
import { getVowCount, getVow } from '@/lib/contract';
import { loadVowCache, patchVowInCache } from '@/lib/vowCache';
import { VowCard } from '@/components/VowCard';
import { SidebarLayout } from '@/components/SidebarLayout';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 50;

export default function FeedPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedUpTo, setLoadedUpTo] = useState(0);

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
    // Warm-start: show cached vows immediately so the page isn't blank
    const cache = loadVowCache();
    const cachedPage = cache.vows.slice().reverse().slice(0, PAGE_SIZE);
    if (cachedPage.length > 0) {
      setVows(mergePending(cachedPage));
      setLoading(false);
    }

    try {
      setLoading(cachedPage.length === 0);
      const count = await getVowCount();
      setTotalCount(count);
      const freshVows: any[] = [];

      for (let i = count; i > Math.max(0, count - PAGE_SIZE); i--) {
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
      setLoadedUpTo(Math.max(0, count - PAGE_SIZE));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || loadedUpTo <= 0) return;
    setLoadingMore(true);
    try {
      const from = loadedUpTo;
      const to = Math.max(0, from - PAGE_SIZE);
      const moreFreshVows: any[] = [];
      for (let i = from; i > to; i--) {
        try {
          const vow = await getVow(i);
          if (vow) {
            const vowWithId = { ...vow, id: i };
            moreFreshVows.push(vowWithId);
            patchVowInCache(vowWithId);
            setVows(prev => mergePending([...prev.filter(v => v.id > i), vowWithId, ...prev.filter(v => v.id < i)]));
          }
        } catch {}
        await new Promise(r => setTimeout(r, 200));
      }
      setLoadedUpTo(to);
    } finally {
      setLoadingMore(false);
    }
  }


  return (
    <SidebarLayout activePage="feed">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-4xl font-bebas tracking-wider mb-2">VOWS FEED</h1>
            <p className="text-gray-400 text-sm">Browse all active and completed challenges across the protocol.</p>
          </div>
          <span className="text-xs opacity-40 mt-4 md:mt-0 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            AUTO-REFRESHING ON-CHAIN
          </span>
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
              {vows.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-white/20">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">NO VOWS FOUND</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">There are no vows active on the network right now. Create one to get started!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {vows.map((vow, idx) => (
                        <VowCard key={vow.id} vow={vow} index={idx} />
                      ))}
                    </AnimatePresence>
                  </div>
                  {loadedUpTo > 0 && (
                    <div className="flex justify-center mt-10">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="px-8 py-3 border border-white/20 hover:border-white/50 text-xs font-bold tracking-widest uppercase rounded-full bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50 font-bebas"
                      >
                        {loadingMore ? 'LOADING...' : `LOAD MORE (${loadedUpTo} older vows remaining)`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </SidebarLayout>
  );
}
