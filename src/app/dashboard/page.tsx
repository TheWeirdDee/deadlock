'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { AnchorMode, PostConditionMode, uintCV } from '@stacks/transactions';
import { AnimatePresence } from 'framer-motion';
import { getVowCount, getVow, getSpectatorBet, getCurrentBlockHeight, contractDetails, getNetwork } from '@/lib/contract';
import { CreateVowModal } from '@/components/CreateVowModal';
import { SidebarLayout } from '@/components/SidebarLayout';
import { VowCard } from '@/components/VowCard';
import { useToast } from '@/components/Toast';
import { VOW_STATUS } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface BetEntry {
  vowId: number;
  title: string;
  stakeAmount: number;
  amount: number;
  prediction: boolean;
  claimed: boolean;
  vowStatus: number;
}

export default function DashboardPage() {
  const { doOpenAuth, doContractCall } = useConnect();
  const { toast } = useToast();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [myVows, setMyVows] = useState<any[]>([]);
  const [spectatorBets, setSpectatorBets] = useState<BetEntry[]>([]);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [betsLoading, setBetsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userSessionRef = useRef<UserSession | null>(null);
  if (!userSessionRef.current && typeof window !== 'undefined') {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionRef.current = new UserSession({ appConfig });
  }
  const userSession = userSessionRef.current;

  const fetchDashboard = useCallback(async (address: string) => {
    try {
      // Load full vow cache for accurate stats
      let cachedVows: any[] = [];
      let lastSyncedId = 0;
      try {
        const stored = localStorage.getItem('deadlock_vows_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.vows)) {
            cachedVows = parsed.vows;
            lastSyncedId = parsed.lastSyncedId ?? 0;
          }
        }
      } catch {}

      // Fetch any new vows since last sync
      const chainCount = await getVowCount();
      const block = await getCurrentBlockHeight();
      setCurrentBlock(block);

      const updatedVows = [...cachedVows];
      if (chainCount > lastSyncedId) {
        for (let i = lastSyncedId + 1; i <= chainCount; i++) {
          try {
            const vow = await getVow(i);
            if (vow) updatedVows.push({ ...vow, id: i });
          } catch {}
          await new Promise(r => setTimeout(r, 150));
        }
        try {
          localStorage.setItem('deadlock_vows_cache', JSON.stringify({
            lastSyncedId: chainCount,
            vows: updatedVows,
          }));
        } catch {}
      }

      // Merge pending (locally submitted, not yet on chain)
      let pending: any[] = [];
      try {
        const raw = localStorage.getItem('pending_vows');
        if (raw) {
          const parsed = JSON.parse(raw);
          pending = parsed.filter((p: any) =>
            !updatedVows.some(v => v.title === p.title && v.description === p.description)
          );
          if (pending.length !== parsed.length) {
            localStorage.setItem('pending_vows', JSON.stringify(pending));
          }
        }
      } catch {}

      const created = updatedVows.filter(v => v.creator === address);
      setMyVows([...pending, ...created]);

      // Spectator bets — check most recent 40 vow IDs
      setBetsLoading(true);
      const recentIds = [...updatedVows]
        .sort((a, b) => b.id - a.id)
        .slice(0, 40)
        .map(v => v.id);

      const found: BetEntry[] = [];
      const CONCURRENCY = 5;
      for (let i = 0; i < recentIds.length; i += CONCURRENCY) {
        const batch = recentIds.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (id) => {
            const bet = await getSpectatorBet(id, address);
            if (!bet) return null;
            const vow = updatedVows.find(v => v.id === id);
            return {
              vowId: id,
              title: vow?.title ?? `Vow #${id}`,
              stakeAmount: Number(vow?.stakeAmount ?? vow?.['stake-amount'] ?? 0),
              amount: Number(bet.amount),
              prediction: bet.prediction,
              claimed: bet.claimed,
              vowStatus: Number(vow?.status ?? 0),
            } as BetEntry;
          })
        );
        found.push(...results.filter(Boolean) as BetEntry[]);
      }
      setSpectatorBets(found);
      setBetsLoading(false);
    } catch (e) {
      console.error('[dashboard] fetchDashboard error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (userSession && userSession.isUserSignedIn()) {
        const data = userSession.loadUserData();
        setUserData(data);
        const address = data?.profile?.stxAddress?.mainnet || data?.profile?.stxAddress?.testnet;
        if (address) fetchDashboard(address);
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const address = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
      if (address) fetchDashboard(address);
    };
    window.addEventListener('vows_updated', handleUpdate);
    return () => window.removeEventListener('vows_updated', handleUpdate);
  }, [userData, fetchDashboard]);

  const handleClaim = async (vowId: number) => {
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'claim-spectator-winnings',
      functionArgs: [uintCV(vowId)],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => {
        toast('Claim submitted — winnings will arrive once confirmed on-chain.', 'success');
        const address = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
        if (address) fetchDashboard(address);
      },
      onCancel: () => toast('Claim cancelled.', 'info'),
    });
  };

  const handleLogout = () => {
    userSession?.signUserOut();
    router.push('/');
  };

  if (loading) {
    return (
      <SidebarLayout activePage="dashboard">
        <div className="flex-grow flex items-center justify-center h-full min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </SidebarLayout>
    );
  }

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;

  // Stats from real data
  const settledVows = myVows.filter(v => {
    const s = Number(v.status);
    return s === VOW_STATUS.COMPLETED || s === VOW_STATUS.FAILED;
  });
  const completedVows = settledVows.filter(v => Number(v.status) === VOW_STATUS.COMPLETED);
  const winRate = settledVows.length === 0
    ? null
    : Math.round((completedVows.length / settledVows.length) * 100);
  const totalStakedSTX = myVows.reduce(
    (acc, v) => acc + Number(v.stakeAmount ?? v['stake-amount'] ?? 0) / 1_000_000,
    0
  );

  // Action-required vows: active + past deadline (need claim-failure or proof submission)
  const actionRequired = myVows.filter(v => {
    const status = Number(v.status);
    const deadline = Number(v.deadlineBlock ?? v['deadline-block'] ?? 0);
    if (status === VOW_STATUS.ACTIVE && currentBlock > 0 && deadline > 0 && currentBlock > deadline) {
      return true;
    }
    return false;
  });

  const activeVows = myVows.filter(v => Number(v.status) === VOW_STATUS.ACTIVE);

  return (
    <SidebarLayout activePage="dashboard">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 relative space-y-12">

        {/* Welcome header */}
        <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-t-2 border-purple-500 gap-6">
          <div>
            <h2 className="text-3xl font-bold font-bebas mb-2">WELCOME BACK.</h2>
            <p className="text-sm opacity-60 font-mono tracking-wider text-purple-300 mb-6 md:mb-0 break-all">
              {userAddress}
            </p>
          </div>
          <div className="flex gap-8 items-center flex-wrap">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Win Rate</p>
              <p className={`text-xl font-bold font-bebas ${
                winRate === null ? 'text-gray-500' :
                winRate >= 75 ? 'text-green-400' :
                winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {winRate === null ? 'N/A' : `${winRate}%`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Staked</p>
              <p className="text-xl font-bold font-bebas text-purple-400">
                {totalStakedSTX.toFixed(2)} STX
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3.5 bg-white text-black font-bold uppercase rounded-full tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] font-bebas flex items-center gap-2"
            >
              CREATE VOW →
            </button>
          </div>
        </div>

        {/* Action Required — expired active vows */}
        {actionRequired.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4 border-b border-red-500/30 pb-4">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-widest font-bebas">ACTION REQUIRED</h3>
              <span className="text-xs font-mono text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">{actionRequired.length}</span>
            </div>
            <div className="space-y-3">
              {actionRequired.map((vow: any) => {
                const deadline = Number(vow.deadlineBlock ?? vow['deadline-block'] ?? 0);
                const blocksOver = currentBlock - deadline;
                return (
                  <div
                    key={vow.id}
                    className="glass-card border border-red-500/20 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-red-900/10 gap-4"
                  >
                    <div>
                      <p className="text-[10px] font-mono text-red-400 mb-1 uppercase tracking-widest">
                        VOW #{vow.id} · DEADLINE PASSED {blocksOver > 0 ? `${blocksOver} blocks ago` : ''}
                      </p>
                      <h4 className="font-bold text-white">{vow.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Deadline block #{deadline} · Stake: {Number(vow.stakeAmount ?? vow['stake-amount'] ?? 0) / 1_000_000} STX</p>
                    </div>
                    <a
                      href={`/vow/${vow.id}`}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded text-xs tracking-widest transition-colors flex-shrink-0 font-bebas"
                    >
                      VIEW VOW →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Vows */}
        <div>
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">
            YOUR VOWS
            {activeVows.length > 0 && (
              <span className="ml-3 text-sm font-mono text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full normal-case tracking-normal">
                {activeVows.length} active
              </span>
            )}
          </h3>
          {myVows.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center">
              <p className="text-gray-400 mb-4 tracking-wider">You don&apos;t have any vows yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-sm font-bold text-white hover:text-purple-400 uppercase tracking-widest border border-white/20 px-6 py-2 rounded-full transition-colors"
              >
                Create your first vow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {myVows.map((vow, idx) => (
                  <VowCard key={vow.id ?? idx} vow={vow} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Spectator Bets */}
        <div>
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">
            YOUR SPECTATOR BETS
          </h3>

          {betsLoading ? (
            <div className="flex items-center gap-3 text-gray-500 text-xs font-mono py-6">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              Scanning recent vows for your bets...
            </div>
          ) : spectatorBets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center">
              <p className="text-gray-400 mb-4 tracking-wider">No spectator bets found in recent vows.</p>
              <button
                onClick={() => router.push('/feed')}
                className="text-sm font-bold text-white hover:text-purple-400 uppercase tracking-widest border border-white/20 px-6 py-2 rounded-full transition-colors"
              >
                Browse Active Vows
              </button>
            </div>
          ) : (
            <div className="glass-card p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-widest">
                    <th className="pb-4 font-normal">Vow</th>
                    <th className="pb-4 font-normal">My Bet</th>
                    <th className="pb-4 font-normal">Prediction</th>
                    <th className="pb-4 font-normal">Vow Status</th>
                    <th className="pb-4 font-normal text-right">Claimed</th>
                  </tr>
                </thead>
                <tbody>
                  {spectatorBets.map((bet) => {
                    const statusLabel =
                      bet.vowStatus === VOW_STATUS.COMPLETED ? 'KEPT' :
                      bet.vowStatus === VOW_STATUS.FAILED ? 'FAILED' :
                      bet.vowStatus === VOW_STATUS.CHALLENGED ? 'CHALLENGED' : 'ACTIVE';
                    const statusColor =
                      bet.vowStatus === VOW_STATUS.COMPLETED ? 'text-green-400' :
                      bet.vowStatus === VOW_STATUS.FAILED ? 'text-red-400' :
                      bet.vowStatus === VOW_STATUS.CHALLENGED ? 'text-yellow-400' : 'text-blue-400';
                    const won =
                      (bet.vowStatus === VOW_STATUS.COMPLETED && bet.prediction) ||
                      (bet.vowStatus === VOW_STATUS.FAILED && !bet.prediction);
                    return (
                      <tr key={bet.vowId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4">
                          <a href={`/vow/${bet.vowId}`} className="font-bold text-sm hover:text-purple-400 transition-colors">
                            {bet.title}
                          </a>
                          <p className="text-[10px] text-gray-600 font-mono">#{bet.vowId}</p>
                        </td>
                        <td className="py-4 text-purple-400 font-bold font-bebas text-lg">
                          {(bet.amount / 1_000_000).toFixed(4)} STX
                        </td>
                        <td className={`py-4 text-xs font-bold tracking-widest ${bet.prediction ? 'text-green-400' : 'text-red-400'}`}>
                          {bet.prediction ? 'SUCCESS' : 'FAILURE'}
                        </td>
                        <td className={`py-4 text-xs font-bold tracking-widest ${statusColor}`}>
                          {statusLabel}
                          {(bet.vowStatus === VOW_STATUS.COMPLETED || bet.vowStatus === VOW_STATUS.FAILED) && (
                            <span className={`ml-2 ${won ? 'text-green-400' : 'text-red-500'}`}>
                              {won ? '(WIN)' : '(LOSS)'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {bet.claimed ? (
                            <span className="text-[10px] text-gray-500 font-mono">CLAIMED</span>
                          ) : won ? (
                            <button
                              onClick={() => handleClaim(bet.vowId)}
                              className="text-[10px] font-bold text-green-400 hover:text-green-300 tracking-widest uppercase border border-green-500/30 px-2 py-1 rounded transition-colors"
                            >
                              CLAIM
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-600 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </SidebarLayout>
  );
}
