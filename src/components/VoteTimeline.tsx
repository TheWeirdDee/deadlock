'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VoteSnapshot {
  block: number;
  yes: number;
  no: number;
  ts: number;
}

function storageKey(vowId: string | number) {
  return `deadlock_vote_snapshots_${vowId}`;
}

function loadSnapshots(vowId: string | number): VoteSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey(vowId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshot(vowId: string | number, snap: VoteSnapshot) {
  try {
    const existing = loadSnapshots(vowId);
    const last = existing[existing.length - 1];
    if (last && last.yes === snap.yes && last.no === snap.no) return;
    const updated = [...existing, snap].slice(-50);
    localStorage.setItem(storageKey(vowId), JSON.stringify(updated));
  } catch {}
}

interface Props {
  vowId: string | number;
  yesVotes: number;
  noVotes: number;
  currentBlock: number | null;
}

export function VoteTimeline({ vowId, yesVotes, noVotes, currentBlock }: Props) {
  const [snapshots, setSnapshots] = useState<VoteSnapshot[]>([]);

  useEffect(() => {
    if (currentBlock === null) return;
    const snap: VoteSnapshot = { block: currentBlock, yes: yesVotes, no: noVotes, ts: Date.now() };
    saveSnapshot(vowId, snap);
    setSnapshots(loadSnapshots(vowId));
  }, [vowId, yesVotes, noVotes, currentBlock]);

  if (snapshots.length < 2) {
    return (
      <div className="p-4 text-center text-[10px] text-ink-subtle uppercase tracking-widest border border-line rounded-lg">
        Timeline builds as votes come in — visit again to see changes
      </div>
    );
  }

  const data = snapshots.map((s, i) => ({
    name: i === 0 ? `#${s.block}` : `+${s.block - snapshots[0].block}`,
    'YES': s.yes,
    'NO': s.no,
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: 'var(--fg-subtle)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 9, fill: 'var(--fg-subtle)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--fg)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
          <Line type="monotone" dataKey="YES" stroke="#4ade80" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="NO" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
