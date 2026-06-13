'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '@/components/SidebarLayout';
import { VowCard } from '@/components/VowCard';
import { getVowCount, getVow } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';

export default function ProfilePage() {
  const { address } = useParams();
  const router = useRouter();
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (address) {
      syncAndFilterVows();
    }
  }, [address]);

  async function syncAndFilterVows() {
    try {
      setLoading(true);
      const chainCount = await getVowCount();
      
      let cachedVows: any[] = [];
      let lastSyncedId = 0;
      try {
        const stored = localStorage.getItem('deadlock_vows_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.vows) && typeof parsed.lastSyncedId === 'number') {
            cachedVows = parsed.vows;
            lastSyncedId = parsed.lastSyncedId;
          }
        }
      } catch (err) {
        console.error('Failed to read vows cache:', err);
      }

      const updatedVows = [...cachedVows];
      
      if (chainCount > lastSyncedId) {
        setSyncProgress({ current: 0, total: chainCount - lastSyncedId });
        
        for (let i = lastSyncedId + 1; i <= chainCount; i++) {
          try {
            const vow = await getVow(i);
            if (vow) {
              updatedVows.push({ ...vow, id: i });
            }
          } catch (e) {
            console.error(`Failed to fetch vow #${i}:`, e);
          }
          setSyncProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        try {
          localStorage.setItem('deadlock_vows_cache', JSON.stringify({
            lastSyncedId: chainCount,
            vows: updatedVows
          }));
        } catch (err) {
          console.error('Failed to write vows cache:', err);
        }
      }

      setVows(updatedVows);
    } catch (e) {
      console.error('Error loading vows for profile:', e);
    } finally {
      setLoading(false);
    }
  }

  const userAddress = typeof address === 'string' ? address : '';
  const myCreatedVows = vows.filter(v => v.creator === userAddress);
  const myRivalVows = vows.filter(v => Number(v.vowType || v['vow-type']) === VOW_TYPES.RIVAL && v.rival === userAddress);
  const allMyVows = [...myCreatedVows, ...myRivalVows];

  // Calculate profile metrics
  let reputation = 100;
  let completedCount = 0;
  let failedCount = 0;
  let activeCount = 0;
  let totalStakedVolume = 0;

  for (const vow of allMyVows) {
    const isCreator = vow.creator === userAddress;
    const stakeSTX = Number(vow.stakeAmount || vow['stake-amount'] || 0) / 1000000;
    const rivalStakeSTX = Number(vow.rivalStake || vow['rival-stake'] || 0) / 1000000;
    
    if (isCreator) {
      totalStakedVolume += stakeSTX;
    } else {
      totalStakedVolume += rivalStakeSTX;
    }

    const status = Number(vow.status);
    if (status === VOW_STATUS.COMPLETED) {
      if (isCreator) {
        completedCount++;
        reputation += 100;
      } else {
        failedCount++;
        reputation = Math.max(0, reputation - 150);
      }
    } else if (status === VOW_STATUS.FAILED) {
      if (isCreator) {
        failedCount++;
        reputation = Math.max(0, reputation - 150);
      } else {
        completedCount++;
        reputation += 100;
      }
    } else {
      activeCount++;
      reputation += 10;
    }
  }

  const finishedCount = completedCount + failedCount;
  const winRate = finishedCount === 0 ? 0 : Math.round((completedCount / finishedCount) * 100);

  // Compute Reputation Badge
  let badgeTitle = 'INITIATE';
  let badgeColor = 'border-gray-500/30 text-gray-400 bg-gray-500/5';
  let badgeIcon = '⚖️';

  if (failedCount > 0 && winRate < 50) {
    badgeTitle = 'VOW BREAKER';
    badgeColor = 'border-red-500/40 text-red-400 bg-red-500/5';
    badgeIcon = '✗';
  } else if (completedCount >= 3 && winRate === 100) {
    badgeTitle = 'OATH KEEPER';
    badgeColor = 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
    badgeIcon = '👑';
  } else if (reputation >= 500) {
    badgeTitle = 'IRONCLAD';
    badgeColor = 'border-purple-500/40 text-purple-400 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
    badgeIcon = '🛡️';
  } else if (activeCount > 0) {
    badgeTitle = 'IN COMBAT';
    badgeColor = 'border-blue-400/40 text-blue-400 bg-blue-400/5';
    badgeIcon = '⚔️';
  }

  const formatFullAddress = (addr: string) => addr;
  const formatShortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-6)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(userAddress);
    alert('Wallet address copied to clipboard!');
  };

  return (
    <SidebarLayout activePage="profile">
      <div className="space-y-12 max-w-6xl mt-4 mb-24 relative z-10 font-space">
        
        {/* Profile Header */}
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-t-2 border-purple-500 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase border rounded-full flex items-center gap-1.5 ${badgeColor}`}>
                <span>{badgeIcon}</span>
                <span>{badgeTitle}</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono tracking-widest">USER ACCOUNT</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white flex items-center gap-2 select-all break-all md:break-normal">
              {formatShortAddress(userAddress)}
              <button 
                onClick={handleCopyAddress}
                title="Copy Address"
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </h1>
            <p className="text-xs text-gray-500 font-mono select-all break-all">{userAddress}</p>
          </div>

          <div className="flex gap-4 items-center">
            <button 
              onClick={() => router.push('/feed')}
              className="px-6 py-2.5 border border-white/10 hover:border-white/30 text-xs font-bold tracking-widest uppercase rounded-full bg-white/5 hover:bg-white/10 transition-all font-bebas"
            >
              Browse Feed
            </button>
          </div>
        </div>

        {/* Sync Progress Loading State */}
        {loading && syncProgress.total > 0 && (
          <div className="glass-card p-6 border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between text-xs font-bold tracking-widest mb-2 font-mono">
              <span className="text-purple-400 uppercase">Synchronizing profile with mainnet...</span>
              <span>{syncProgress.current} / {syncProgress.total} vows</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-5 border-white/10 bg-white/5">
            <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">REPUTATION</div>
            <div className="text-3xl font-bold font-bebas tracking-wider text-purple-400">{reputation} XP</div>
          </div>
          <div className="glass-card p-5 border-white/10 bg-white/5">
            <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">SUCCESS RATE</div>
            <div className={`text-3xl font-bold font-bebas tracking-wider ${
              winRate >= 75 ? 'text-green-400' : winRate >= 50 ? 'text-yellow-400' : winRate > 0 ? 'text-red-400' : 'text-gray-400'
            }`}>{winRate}%</div>
          </div>
          <div className="glass-card p-5 border-white/10 bg-white/5">
            <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">VOLUME STAKED</div>
            <div className="text-3xl font-bold font-bebas tracking-wider text-white">{totalStakedVolume.toFixed(2)} STX</div>
          </div>
          <div className="glass-card p-5 border-white/10 bg-white/5">
            <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">VOW RECORD</div>
            <div className="text-xl font-bold font-bebas tracking-wide text-white">
              <span className="text-green-400">{completedCount} Kept</span>
              <span className="mx-1 text-gray-500">/</span>
              <span className="text-red-500">{failedCount} Failed</span>
              {activeCount > 0 && (
                <>
                  <span className="mx-1 text-gray-500">/</span>
                  <span className="text-blue-400">{activeCount} Active</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vows Created list */}
        <div>
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">CREATOR VOWS ({myCreatedVows.length})</h3>
          
          {loading && myCreatedVows.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 glass-card animate-pulse"></div>
              ))}
            </div>
          ) : myCreatedVows.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center">
              <p className="text-gray-400 tracking-wider">This wallet has not created any accountability vows yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {myCreatedVows.map((vow, idx) => (
                  <VowCard key={vow.id} vow={vow} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Rival Vows list */}
        {myRivalVows.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">RIVAL VOWS ({myRivalVows.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {myRivalVows.map((vow, idx) => (
                  <VowCard key={vow.id} vow={vow} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
