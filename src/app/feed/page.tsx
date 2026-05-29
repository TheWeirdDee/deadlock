 'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { motion, AnimatePresence } from 'framer-motion';
import { getVowCount, getVow } from '@/lib/contract';
import { VowCard } from '@/components/VowCard';
import { SidebarLayout } from '@/components/SidebarLayout';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    } else {
      router.push('/');
    }
    fetchVows();
  }, [router]);

  useEffect(() => {
    const handleUpdate = () => fetchVows();
    window.addEventListener('vows_updated', handleUpdate);
    return () => window.removeEventListener('vows_updated', handleUpdate);
  }, []);

  async function fetchVows() {
    try {
      setLoading(true);
      const count = await getVowCount();
      console.log('[feed] Vow count:', count);
      const fetchedVows: any[] = [];

      // 200ms delay between requests to respect Hiro API rate limits
      for (let i = count - 1; i >= Math.max(0, count - 50); i--) {
        console.log('[feed] Fetching vow id', i);
        try {
          const vow = await getVow(i);
          if (vow) {
            console.log('[feed] Vow data', vow);
            fetchedVows.push({ ...vow, id: i });
          }
        } catch (err) {
          console.error('[feed] Error fetching vow', i, err);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      
      let pendingVows = [];
      try {
        const stored = localStorage.getItem('pending_vows');
        if (stored) {
          const parsed = JSON.parse(stored);
          pendingVows = parsed.filter((pending: any) => {
            return !fetchedVows.some(
              confirmed => confirmed.title === pending.title && 
                           confirmed.description === pending.description
            );
          });
          if (pendingVows.length !== parsed.length) {
            localStorage.setItem('pending_vows', JSON.stringify(pendingVows));
          }
        }
      } catch (err) {
        console.error("Error reading pending vows", err);
      }
      
      setVows([...pendingVows, ...fetchedVows]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!userData) {
    return null;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {vows.map((vow, idx) => (
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
