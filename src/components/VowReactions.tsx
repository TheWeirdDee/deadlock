'use client';

import { useState, useEffect } from 'react';

const REACTIONS = [
  { emoji: '🔥', label: 'LFG' },
  { emoji: '👏', label: 'RESPECT' },
  { emoji: '😬', label: 'RISKY' },
  { emoji: '💀', label: 'DOOMED' },
];

function storageKey(vowId: string | number) {
  return `deadlock_reactions_${vowId}`;
}

function loadCounts(vowId: string | number): Record<string, number> {
  try {
    const raw = localStorage.getItem(storageKey(vowId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCounts(vowId: string | number, counts: Record<string, number>) {
  try {
    localStorage.setItem(storageKey(vowId), JSON.stringify(counts));
  } catch {}
}

function myReactionsKey(vowId: string | number) {
  return `deadlock_my_reactions_${vowId}`;
}

function loadMyReactions(vowId: string | number): Set<string> {
  try {
    const raw = localStorage.getItem(myReactionsKey(vowId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveMyReactions(vowId: string | number, set: Set<string>) {
  try {
    localStorage.setItem(myReactionsKey(vowId), JSON.stringify([...set]));
  } catch {}
}

export function VowReactions({ vowId }: { vowId: string | number }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCounts(loadCounts(vowId));
    setMine(loadMyReactions(vowId));
  }, [vowId]);

  const toggle = (emoji: string) => {
    const newCounts = { ...counts };
    const newMine = new Set(mine);

    if (newMine.has(emoji)) {
      newCounts[emoji] = Math.max(0, (newCounts[emoji] ?? 1) - 1);
      newMine.delete(emoji);
    } else {
      newCounts[emoji] = (newCounts[emoji] ?? 0) + 1;
      newMine.add(emoji);
    }

    setCounts(newCounts);
    setMine(newMine);
    saveCounts(vowId, newCounts);
    saveMyReactions(vowId, newMine);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-[9px] text-ink-subtle font-bold tracking-widest uppercase mr-1">REACT</span>
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            title={label}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-all active:scale-95 ${
              active
                ? 'bg-surface-hover border-line-strong text-white scale-105'
                : 'bg-surface-raised border-line text-ink-muted hover:border-ink-muted hover:text-white'
            }`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
