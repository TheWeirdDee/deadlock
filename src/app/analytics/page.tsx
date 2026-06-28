'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/SidebarLayout';
import { getVowCount, getVow } from '@/lib/contract';
import { VOW_STATUS } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

function fmtAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function vowAction(status: number): string {
  if (status === VOW_STATUS.COMPLETED) return 'CHALLENGE MET';
  if (status === VOW_STATUS.FAILED) return 'VOW FAILED';
  if (status === VOW_STATUS.CHALLENGED) return 'UNDER CHALLENGE';
  return 'VOW ACTIVE';
}

function vowStatusLabel(status: number): string {
  if (status === VOW_STATUS.COMPLETED) return 'Completed';
  if (status === VOW_STATUS.FAILED) return 'Failed';
  if (status === VOW_STATUS.CHALLENGED) return 'Challenged';
  return 'Active';
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  async function loadData(forceFullResync = false) {
    try {
      setLoading(true);
      let cachedVows: any[] = [];
      let lastSyncedId = 0;
      if (!forceFullResync) {
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
      }

      if (!forceFullResync && cachedVows.length > 0) {
        setVows(cachedVows);
        setLoading(false);
      }

      const chainCount = await getVowCount();
      const updatedVows = forceFullResync ? [] : [...cachedVows];
      const startId = forceFullResync ? 1 : lastSyncedId + 1;

      if (chainCount >= startId) {
        for (let i = startId; i <= chainCount; i++) {
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

      setVows(updatedVows);
    } catch (e) {
      console.error('[analytics] load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const computedStats = useMemo(() => {
    if (vows.length === 0) return null;
    let totalSTX = 0;
    let completed = 0;
    let failed = 0;
    let totalVotes = 0;

    for (const v of vows) {
      totalSTX += Number(v.stakeAmount ?? v['stake-amount'] ?? 0) / 1_000_000;
      totalSTX += Number(v.rivalStake ?? v['rival-stake'] ?? 0) / 1_000_000;
      const s = Number(v.status);
      if (s === VOW_STATUS.COMPLETED) completed++;
      if (s === VOW_STATUS.FAILED) failed++;
      totalVotes += Number(v.yesVotes ?? v['yes-votes'] ?? 0) + Number(v.noVotes ?? v['no-votes'] ?? 0);
    }

    const settled = completed + failed;
    const successRate = settled === 0 ? 0 : Math.round((completed / settled) * 100);
    const stxLabel = totalSTX >= 1000 ? `${(totalSTX / 1000).toFixed(1)}K` : totalSTX.toFixed(1);
    const votesLabel = totalVotes >= 1000 ? `${(totalVotes / 1000).toFixed(1)}K` : String(totalVotes);

    return [
      { label: 'Total STX Staked', value: `${stxLabel} STX`, sub: `across ${vows.length} vows`, color: 'text-purple-400' },
      { label: 'Total Vows', value: vows.length.toLocaleString(), sub: `${completed} completed, ${failed} failed`, color: 'text-blue-400' },
      { label: 'Global Success Rate', value: `${successRate}%`, sub: `${settled} settled vows`, color: 'text-green-400' },
      { label: 'Total Votes Cast', value: votesLabel, sub: 'community governance', color: 'text-pink-400' },
    ];
  }, [vows]);

  // Group vows into up to 10 buckets by ID for bar chart
  const barData = useMemo(() => {
    if (vows.length === 0) return [];
    const sorted = [...vows].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const BUCKETS = Math.min(10, sorted.length);
    const size = Math.ceil(sorted.length / BUCKETS);
    const result: { name: string; vows: number }[] = [];
    for (let i = 0; i < sorted.length; i += size) {
      const bucket = sorted.slice(i, i + size);
      result.push({ name: `#${bucket[0].id}–${bucket[bucket.length - 1].id}`, vows: bucket.length });
    }
    return result;
  }, [vows]);

  // Cumulative STX staked for area chart
  const areaData = useMemo(() => {
    if (vows.length === 0) return [];
    const sorted = [...vows].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const POINTS = Math.min(10, sorted.length);
    const step = Math.max(1, Math.floor(sorted.length / POINTS));
    let cumulative = 0;
    const result: { name: string; value: number }[] = [];
    sorted.forEach((v, i) => {
      cumulative += Number(v.stakeAmount ?? v['stake-amount'] ?? 0) / 1_000_000;
      if (i % step === 0 || i === sorted.length - 1) {
        result.push({ name: `#${v.id}`, value: Math.round(cumulative) });
      }
    });
    return result;
  }, [vows]);

  const recentActivity = useMemo(() => {
    return [...vows]
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
      .slice(0, 15)
      .map(v => ({
        user: fmtAddr(v.creator ?? ''),
        vowId: v.id,
        amount: `${(Number(v.stakeAmount ?? v['stake-amount'] ?? 0) / 1_000_000).toFixed(1)} STX`,
        action: vowAction(Number(v.status)),
        status: vowStatusLabel(Number(v.status)),
      }));
  }, [vows]);

  const filteredActivity = useMemo(() => {
    if (activeTab === 'All') return recentActivity;
    return recentActivity.filter(a => a.status === activeTab);
  }, [recentActivity, activeTab]);

  const statusColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-500/10 text-green-400';
    if (status === 'Failed') return 'bg-red-500/10 text-red-400';
    if (status === 'Challenged') return 'bg-blue-500/10 text-blue-400';
    return 'bg-yellow-500/10 text-yellow-400';
  };

  const dotColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-400';
    if (status === 'Failed') return 'bg-red-400';
    if (status === 'Challenged') return 'bg-blue-400';
    return 'bg-yellow-400';
  };

  return (
    <SidebarLayout activePage="analytics">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-[0_0_30px_rgba(168,85,247,0.2)] mb-8">
        <div>
          <h2 className="text-white font-bebas text-2xl tracking-widest mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Protocol is Live on Mainnet
          </h2>
          <p className="text-white/80 text-sm tracking-wider">Join builders committing to ship code and stake their reputation on-chain.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="mt-4 sm:mt-0 px-6 py-2 bg-white text-black font-bold uppercase rounded-md text-xs tracking-widest hover:bg-gray-200 transition-colors">
          Create Vow Now
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bebas tracking-widest">Overview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="text-xs px-4 py-2 border border-white/20 hover:border-red-500/50 hover:bg-red-500/5 disabled:opacity-50 text-gray-400 hover:text-red-400 font-bold tracking-widest uppercase rounded-full transition-all duration-300 font-bebas"
          >
            FULL RESYNC
          </button>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="text-xs px-4 py-2 border border-white/20 hover:border-white/50 hover:bg-white/5 disabled:opacity-50 text-white font-bold tracking-widest uppercase rounded-full transition-all duration-300 font-bebas flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                SYNCING...
              </>
            ) : 'SYNC NEW'}
          </button>
        </div>
      </div>

      {loading && vows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(computedStats ?? []).map((stat, idx) => (
            <div key={idx} className="glass-card p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs text-gray-400 uppercase tracking-widest">{stat.label}</h3>
              </div>
              <p className="text-3xl font-bebas tracking-wider text-white mb-2">{stat.value}</p>
              <p className={`text-[10px] ${stat.color} font-bold tracking-widest`}>{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-1">Vows by ID Range</h3>
              <p className="text-2xl font-bebas tracking-wider text-white">{vows.length.toLocaleString()} Total</p>
              {loading && <p className="text-[10px] text-purple-400 font-bold tracking-widest animate-pulse">SYNCING ON-CHAIN...</p>}
            </div>
          </div>
          <div className="h-[250px] w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="vows" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-xs">Loading chart data...</div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-1">Cumulative STX Staked</h3>
          <p className="text-2xl font-bebas tracking-wider text-white mb-1">
            {areaData.length > 0 ? `${areaData[areaData.length - 1].value.toLocaleString()} STX` : '---'}
          </p>
          <p className="text-[10px] text-green-400 font-bold tracking-widest mb-6">all-time on-chain</p>
          <div className="h-[200px] w-full">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    dot={{ r: 4, fill: '#000', stroke: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-xs">Loading chart data...</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bebas tracking-widest">Recent Activity</h2>
          <span className="text-xs text-gray-500 font-mono">latest {recentActivity.length} vows</span>
        </div>

        <div className="flex gap-6 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          {['All', 'Active', 'Completed', 'Failed', 'Challenged'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${activeTab === tab ? 'text-purple-400 border-b-2 border-purple-400 pb-2 -mb-[9px]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && vows.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/5 animate-pulse rounded" />)}
          </div>
        ) : filteredActivity.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-8">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} vows found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 rounded-t-lg">
                  <th className="p-3 font-normal rounded-tl-lg">Creator</th>
                  <th className="p-3 font-normal">Vow</th>
                  <th className="p-3 font-normal">Stake</th>
                  <th className="p-3 font-normal">Action</th>
                  <th className="p-3 font-normal rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivity.map((activity, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                    <td className="p-3 font-mono text-gray-300">{activity.user}</td>
                    <td className="p-3 text-gray-500 text-xs font-mono">#{activity.vowId}</td>
                    <td className="p-3 font-bold text-white">{activity.amount}</td>
                    <td className="p-3 text-xs tracking-widest text-gray-400">{activity.action}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full flex items-center w-max gap-1 ${statusColor(activity.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor(activity.status)}`}></span>
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
