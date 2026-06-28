'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SidebarLayout } from '@/components/SidebarLayout';
import { getVowCount, getVow } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';

const PAGE_SIZE = 50;

interface LeaderboardEntry {
  address: string;
  reputation: number;
  totalVows: number;
  completedVows: number;
  failedVows: number;
  activeVows: number;
  totalStaked: number;
}

function fmtSTX(stx: number): string {
  if (stx === 0) return '0 STX';
  if (stx < 0.01) return `${stx.toFixed(3)} STX`;
  if (stx < 1) return `${stx.toFixed(2)} STX`;
  return `${stx.toFixed(1)} STX`;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [sortBy, setSortBy] = useState<'reputation' | 'winRate' | 'staked'>('reputation');
  const [page, setPage] = useState(0);

  useEffect(() => { syncAndAggregate(); }, []);
  useEffect(() => { setPage(0); }, [sortBy]);

  async function syncAndAggregate(forceFullResync = false) {
    try {
      setLoading(true);
      const chainCount = await getVowCount();

      let cachedVows: any[] = [];
      let lastSyncedId = 0;
      if (!forceFullResync) {
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
      }

      const updatedVows = forceFullResync ? [] : [...cachedVows];
      const startId = forceFullResync ? 1 : lastSyncedId + 1;

      if (chainCount >= startId) {
        setSyncProgress({ current: 0, total: chainCount - startId + 1 });
        for (let i = startId; i <= chainCount; i++) {
          try {
            const vow = await getVow(i);
            if (vow) updatedVows.push({ ...vow, id: i });
          } catch (e) {
            console.error(`Failed to fetch vow #${i}:`, e);
          }
          setSyncProgress(prev => ({ ...prev, current: prev.current + 1 }));
          await new Promise(r => setTimeout(r, 150));
        }
        try {
          localStorage.setItem('deadlock_vows_cache', JSON.stringify({
            lastSyncedId: chainCount,
            vows: updatedVows,
          }));
        } catch (err) {
          console.error('Failed to write vows cache:', err);
        }
      }

      const statsMap: Record<string, LeaderboardEntry> = {};
      const getOrCreate = (addr: string): LeaderboardEntry => {
        if (!statsMap[addr]) {
          statsMap[addr] = { address: addr, reputation: 100, totalVows: 0, completedVows: 0, failedVows: 0, activeVows: 0, totalStaked: 0 };
        }
        return statsMap[addr];
      };

      for (const vow of updatedVows) {
        const creator = getOrCreate(vow.creator);
        const stakeSTX = Number(vow.stakeAmount || vow['stake-amount'] || 0) / 1_000_000;
        creator.totalVows += 1;
        creator.totalStaked += stakeSTX;
        const status = Number(vow.status);
        if (status === VOW_STATUS.COMPLETED) {
          creator.completedVows += 1;
          creator.reputation += 100;
        } else if (status === VOW_STATUS.FAILED) {
          creator.failedVows += 1;
          creator.reputation = Math.max(0, creator.reputation - 150);
        } else {
          creator.activeVows += 1;
          creator.reputation += 10;
        }

        if (Number(vow.vowType) === VOW_TYPES.RIVAL && vow.rival) {
          const rivalStake = Number(vow.rivalStake || vow['rival-stake'] || 0) / 1_000_000;
          if (rivalStake > 0) {
            const rival = getOrCreate(vow.rival);
            rival.totalVows += 1;
            rival.totalStaked += rivalStake;
            if (status === VOW_STATUS.COMPLETED) {
              rival.failedVows += 1;
              rival.reputation = Math.max(0, rival.reputation - 150);
            } else if (status === VOW_STATUS.FAILED) {
              rival.completedVows += 1;
              rival.reputation += 100;
            } else {
              rival.activeVows += 1;
              rival.reputation += 10;
            }
          }
        }
      }

      setLeaderboard(Object.values(statsMap));
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
        const rate = (e: LeaderboardEntry) => {
          const s = e.completedVows + e.failedVows;
          return s === 0 ? -1 : e.completedVows / s;
        };
        return rate(b) - rate(a);
      }
      return b.totalStaked - a.totalStaked;
    });
  }, [leaderboard, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedLeaderboard.length / PAGE_SIZE));
  const pageEntries = useMemo(
    () => sortedLeaderboard.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sortedLeaderboard, page],
  );

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const podiumColor = (i: number) => {
    if (i === 0) return 'from-yellow-400/20 via-amber-500/10 to-transparent border-yellow-500/40 text-yellow-400';
    if (i === 1) return 'from-slate-300/20 via-gray-400/10 to-transparent border-gray-400/40 text-gray-300';
    return 'from-amber-700/20 via-amber-800/10 to-transparent border-amber-800/40 text-amber-600';
  };
  const podiumLabel = (i: number) => ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'][i];

  const rankBadge = (rank: number) => {
    if (rank === 0) return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-500/5 border border-yellow-500/40 text-yellow-400">1ST</span>
    );
    if (rank === 1) return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-400/5 border border-gray-400/40 text-gray-300">2ND</span>
    );
    if (rank === 2) return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-800/5 border border-amber-800/40 text-amber-600">3RD</span>
    );
    return <span className="text-gray-400">#{rank + 1}</span>;
  };

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
              onClick={() => syncAndAggregate(true)}
              disabled={loading}
              className="text-xs px-4 py-2 border border-white/20 hover:border-red-500/50 hover:bg-red-500/5 disabled:opacity-50 text-gray-400 hover:text-red-400 font-bold tracking-widest uppercase rounded-full transition-all duration-300 font-bebas"
            >
              FULL RESYNC
            </button>
            <button
              onClick={() => syncAndAggregate()}
              disabled={loading}
              className="text-xs px-4 py-2 border border-white/20 hover:border-white/50 hover:bg-white/5 disabled:opacity-50 text-white font-bold tracking-widest uppercase rounded-full transition-all duration-300 font-bebas flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  SYNCING...
                </>
              ) : 'SYNC NEW'}
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
                {sortedLeaderboard.slice(0, 3).map((entry, idx) => {
                  const settled = entry.completedVows + entry.failedVows;
                  const winPct = settled === 0 ? null : ((entry.completedVows / settled) * 100).toFixed(0);
                  return (
                    <motion.div
                      key={entry.address}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.15 }}
                      className={`bg-gradient-to-b ${podiumColor(idx)} border rounded-2xl p-6 flex flex-col justify-between h-56 shadow-[0_0_30px_rgba(255,255,255,0.02)] relative overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold tracking-widest uppercase border border-current px-2.5 py-1 rounded-full bg-black/40">
                          {podiumLabel(idx)}
                        </span>
                        <span className="text-sm font-mono opacity-50 font-bold">
                          {winPct === null ? '— WIN' : `${winPct}% WIN`}
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
                          <p className="text-lg font-bebas font-bold text-white tracking-wide">{fmtSTX(entry.totalStaked)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-gray-500 tracking-widest uppercase font-bold">REPUTATION</p>
                          <p className="text-2xl font-bebas font-bold tracking-wider text-purple-400">{entry.reputation} XP</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold font-bebas tracking-widest uppercase">GLOBAL RANKINGS</h3>
                {!loading && (
                  <span className="text-xs text-gray-600 font-mono">
                    {sortedLeaderboard.length} wallets
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs font-bold tracking-widest">
                {(['reputation', 'winRate', 'staked'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`transition-colors ${sortBy === s ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
                  >
                    {s === 'reputation' ? 'REPUTATION' : s === 'winRate' ? 'SUCCESS RATE' : 'TOTAL STAKED'}
                  </button>
                ))}
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
                    {pageEntries.map((entry, index) => {
                      const rank = index + page * PAGE_SIZE;
                      const settled = entry.completedVows + entry.failedVows;
                      const winRate = settled === 0 ? null : (entry.completedVows / settled) * 100;
                      return (
                        <motion.tr
                          layout
                          key={entry.address}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm"
                        >
                          <td className="p-4 pl-6 font-bold font-mono">
                            {rankBadge(rank)}
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-300 select-all text-xs">
                            {entry.address}
                          </td>
                          <td className="p-4 text-center text-gray-400 font-mono">{entry.totalVows}</td>
                          <td className="p-4 text-center text-green-400 font-bold font-mono">{entry.completedVows}</td>
                          <td className="p-4 text-center text-red-500 font-bold font-mono">{entry.failedVows}</td>
                          <td className="p-4 text-center">
                            <span className={`text-xs font-mono font-bold ${
                              winRate === null ? 'text-gray-600' :
                              winRate >= 75 ? 'text-green-400' :
                              winRate >= 50 ? 'text-yellow-400' :
                              winRate > 0 ? 'text-red-400' : 'text-gray-600'
                            }`}>
                              {winRate === null ? '—' : `${winRate.toFixed(0)}%`}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-300 font-mono">
                            {fmtSTX(entry.totalStaked)}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 font-mono">
                    {sortedLeaderboard.length === 0
                      ? 'No entries'
                      : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, sortedLeaderboard.length)} of ${sortedLeaderboard.length} wallets`}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="text-xs px-4 py-1.5 border border-white/20 hover:border-white/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bebas tracking-widest rounded transition-all"
                    >
                      ← PREV
                    </button>
                    <span className="text-xs font-mono text-gray-500">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="text-xs px-4 py-1.5 border border-white/20 hover:border-white/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bebas tracking-widest rounded transition-all"
                    >
                      NEXT →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
