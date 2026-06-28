 'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '@/components/SidebarLayout';
import { getVowCount, getVow } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';
import Link from 'next/link';

interface LeaderboardEntry {
  address: string;
  reputation: number;
  totalVows: number;
  completedVows: number;
  failedVows: number;
  activeVows: number;
  totalStaked: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [sortBy, setSortBy] = useState<'reputation' | 'winRate' | 'staked'>('reputation');

  useEffect(() => {
    syncAndAggregate();
  }, []);

  async function syncAndAggregate() {
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
          await new Promise(r => setTimeout(r, 150));
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

      const statsMap: Record<string, LeaderboardEntry> = {};

      const getOrCreateEntry = (addr: string): LeaderboardEntry => {
        if (!statsMap[addr]) {
          statsMap[addr] = {
            address: addr,
            reputation: 100,
            totalVows: 0,
            completedVows: 0,
            failedVows: 0,
            activeVows: 0,
            totalStaked: 0,
          };
        }
        return statsMap[addr];
      };

      for (const vow of updatedVows) {
        const creatorEntry = getOrCreateEntry(vow.creator);
        const stakeSTX = Number(vow.stakeAmount || vow['stake-amount'] || 0) / 1000000;
        
        creatorEntry.totalVows += 1;
        creatorEntry.totalStaked += stakeSTX;

        const status = Number(vow.status);
        if (status === VOW_STATUS.COMPLETED) {
          creatorEntry.completedVows += 1;
          creatorEntry.reputation += 100;
        } else if (status === VOW_STATUS.FAILED) {
          creatorEntry.failedVows += 1;
          creatorEntry.reputation = Math.max(0, creatorEntry.reputation - 150);
        } else {
          creatorEntry.activeVows += 1;
          creatorEntry.reputation += 10;
        }

        if (Number(vow.vowType) === VOW_TYPES.RIVAL && vow.rival) {
          const rivalEntry = getOrCreateEntry(vow.rival);
          const rivalStake = Number(vow.rivalStake || vow['rival-stake'] || 0) / 1000000;
          
          if (rivalStake > 0) {
            rivalEntry.totalVows += 1;
            rivalEntry.totalStaked += rivalStake;

            if (status === VOW_STATUS.COMPLETED) {
              rivalEntry.failedVows += 1;
              rivalEntry.reputation = Math.max(0, rivalEntry.reputation - 150);
            } else if (status === VOW_STATUS.FAILED) {
              rivalEntry.completedVows += 1;
              rivalEntry.reputation += 100;
            } else {
              rivalEntry.activeVows += 1;
              rivalEntry.reputation += 10;
            }
          }
        }
      }

      const rawLeaderboard = Object.values(statsMap);
      setLeaderboard(rawLeaderboard);
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (sortBy === 'reputation') return b.reputation - a.reputation;
      if (sortBy === 'winRate') {
        const getWinRate = (entry: LeaderboardEntry) => {
          const finished = entry.completedVows + entry.failedVows;
          return finished === 0 ? 0 : entry.completedVows / finished;
        };
        return getWinRate(b) - getWinRate(a);
      }
      return b.totalStaked - a.totalStaked;
    });
  }, [leaderboard, sortBy]);

  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-400/20 via-amber-500/10 to-transparent border-yellow-500/40 text-yellow-400';
    if (index === 1) return 'from-slate-300/20 via-gray-400/10 to-transparent border-gray-400/40 text-gray-300';
    if (index === 2) return 'from-amber-700/20 via-amber-800/10 to-transparent border-amber-800/40 text-amber-600';
    return 'from-white/5 to-transparent border-white/10 text-gray-400';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇 GOLD';
    if (index === 1) return '🥈 SILVER';
    if (index === 2) return '🥉 BRONZE';
    return `#${index + 1}`;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <SidebarLayout activePage="leaderboard">
      <div className="space-y-12 max-w-6xl mt-4 mb-24 relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-4">
          <div>
            <h2 className="text-4xl font-bold font-bebas tracking-wider mb-2">REPUTATION LEADERBOARD</h2>
            <p className="text-gray-400 text-sm font-space leading-relaxed">
              Global rankings based on vow commitments, completion ratios, and total value locked.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={syncAndAggregate} 
              disabled={loading}
              className="text-xs px-4 py-2 border border-white/20 hover:border-white/50 hover:bg-white/5 disabled:opacity-50 text-white font-bold tracking-widest uppercase rounded-full transition-all duration-300 font-bebas flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  SYNCING...
                </>
              ) : "SYNC ON-CHAIN DATA"}
            </button>
          </div>
        </div>

        {loading && syncProgress.total > 0 && (
          <div className="glass-card p-6 border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between text-xs font-bold tracking-widest mb-2 font-mono">
              <span className="text-purple-400 uppercase">Fetching vows from Stacks mainnet...</span>
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

        {!loading && sortedLeaderboard.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/20 rounded-xl bg-white/5">
            <p className="text-gray-400 font-space tracking-wider">No active vows found on-chain yet.</p>
          </div>
        ) : (
          <>
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedLeaderboard.slice(0, 3).map((entry, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.15 }}
                    key={entry.address}
                    className={`bg-gradient-to-b ${getRankColor(idx)} border rounded-2xl p-6 flex flex-col justify-between h-56 shadow-[0_0_30px_rgba(255,255,255,0.02)] relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold tracking-widest uppercase border border-current px-2.5 py-1 rounded-full bg-black/40">
                        {getRankBadge(idx)}
                      </span>
                      <span className="text-sm font-mono opacity-50 font-bold">
                        {((entry.completedVows / (entry.completedVows + entry.failedVows || 1)) * 100).toFixed(0)}% WIN
                      </span>
                    </div>

                    <div className="my-4">
                      <h4 className="text-base font-mono font-bold tracking-tight text-white mb-1 truncate">
                        {formatAddress(entry.address)}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono truncate">{entry.address}</p>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[8px] text-gray-500 tracking-widest uppercase font-bold">STAKED VOLUME</p>
                        <p className="text-lg font-bebas font-bold text-white tracking-wide">{entry.totalStaked.toFixed(1)} STX</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-gray-500 tracking-widest uppercase font-bold">REPUTATION</p>
                        <p className="text-2xl font-bebas font-bold tracking-wider text-purple-400">{entry.reputation} XP</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold font-bebas tracking-widest uppercase">GLOBAL RANKINGS</h3>
              <div className="flex gap-4 text-xs font-bold tracking-widest">
                <button 
                  onClick={() => setSortBy('reputation')} 
                  className={`transition-colors ${sortBy === 'reputation' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
                >
                  REPUTATION
                </button>
                <button 
                  onClick={() => setSortBy('winRate')} 
                  className={`transition-colors ${sortBy === 'winRate' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
                >
                  SUCCESS RATE
                </button>
                <button 
                  onClick={() => setSortBy('staked')} 
                  className={`transition-colors ${sortBy === 'staked' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
                >
                  TOTAL STAKED
                </button>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 border-b border-white/10">
                      <th className="p-4 pl-6 font-normal w-24">Rank</th>
                      <th className="p-4 font-normal">Wallet Address</th>
                      <th className="p-4 font-normal text-center">Total Vows</th>
                      <th className="p-4 font-normal text-center">Completed</th>
                      <th className="p-4 font-normal text-center">Failed</th>
                      <th className="p-4 font-normal text-center">Success Rate</th>
                      <th className="p-4 font-normal text-right">Volume Staked</th>
                      <th className="p-4 pr-6 font-normal text-right">Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboard.map((entry, index) => {
                      const winRate = entry.completedVows + entry.failedVows === 0 
                        ? 0 
                        : (entry.completedVows / (entry.completedVows + entry.failedVows)) * 100;
                      
                      return (
                        <motion.tr 
                          layout
                          key={entry.address} 
                          className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm"
                        >
                          <td className="p-4 pl-6 font-bold font-mono text-gray-400">
                            {index < 3 ? (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 border ${
                                index === 0 ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5' :
                                index === 1 ? 'border-gray-400/40 text-gray-300 bg-gray-400/5' :
                                'border-amber-800/40 text-amber-600 bg-amber-800/5'
                              }`}>
                                {index === 0 ? "1ST" : index === 1 ? "2ND" : "3RD"}
                              </span>
                            ) : `#${index + 1}`}
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-300 select-all">
                            {entry.address}
                          </td>
                          <td className="p-4 text-center text-gray-400 font-mono">{entry.totalVows}</td>
                          <td className="p-4 text-center text-green-400 font-bold font-mono">{entry.completedVows}</td>
                          <td className="p-4 text-center text-red-500 font-bold font-mono">{entry.failedVows}</td>
                          <td className="p-4 text-center">
                            <span className={`text-xs font-mono font-bold ${
                              winRate >= 75 ? 'text-green-400' :
                              winRate >= 50 ? 'text-yellow-400' :
                              winRate > 0 ? 'text-red-400' : 'text-gray-600'
                            }`}>
                              {winRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-300 font-mono">
                            {entry.totalStaked.toFixed(1)} STX
                          </td>
                          <td className="p-4 pr-6 text-right font-bold font-bebas tracking-wide text-purple-400 text-lg">
                            {entry.reputation} XP
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
