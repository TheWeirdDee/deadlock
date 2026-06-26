'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '@/components/SidebarLayout';
import { CreateVowModal } from '@/components/CreateVowModal';
import { useToast } from '@/components/Toast';

const STORAGE_KEY = 'deadlock_rival_challenges';

interface RivalChallenge {
  id: string;
  poster: string;
  title: string;
  description: string;
  stakeSTX: number;
  durationDays: number;
  postedAt: number;
}

function loadChallenges(): RivalChallenge[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChallenges(entries: RivalChallenge[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export default function RivalsPage() {
  const { doOpenAuth } = useConnect();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<RivalChallenge[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefillRival, setPrefillRival] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stakeSTX, setStakeSTX] = useState('');
  const [durationDays, setDurationDays] = useState('7');

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
    } catch {}
    setChallenges(loadChallenges());
  }, []);

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      toast('Connect your wallet to post a rival challenge.', 'error');
      doOpenAuth();
      return;
    }
    if (!title || !stakeSTX || isNaN(Number(stakeSTX)) || Number(stakeSTX) <= 0) {
      toast('Please fill in all fields with valid values.', 'error');
      return;
    }

    const challenge: RivalChallenge = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      poster: userAddress,
      title: title.trim(),
      description: description.trim(),
      stakeSTX: Number(stakeSTX),
      durationDays: Number(durationDays),
      postedAt: Date.now(),
    };

    const updated = [challenge, ...challenges];
    saveChallenges(updated);
    setChallenges(updated);
    setTitle('');
    setDescription('');
    setStakeSTX('');
    setDurationDays('7');
    setShowForm(false);
    toast('Challenge posted! Rivals can now accept it.', 'success');
  };

  const handleDelete = (id: string) => {
    const updated = challenges.filter(c => c.id !== id);
    saveChallenges(updated);
    setChallenges(updated);
    toast('Challenge removed.', 'info');
  };

  const handleAccept = (challenge: RivalChallenge) => {
    if (!userAddress) {
      toast('Connect your wallet to accept a challenge.', 'error');
      doOpenAuth();
      return;
    }
    if (challenge.poster === userAddress) {
      toast("You can't accept your own challenge.", 'error');
      return;
    }
    setPrefillRival(challenge.poster);
    setIsModalOpen(true);
    toast(`Pre-filled rival vow against ${challenge.poster.slice(0, 8)}...`, 'info');
  };

  const activeCount = challenges.length;

  return (
    <SidebarLayout activePage="rivals">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-4xl font-bebas tracking-wider mb-1 flex items-center gap-3">
              RIVAL DISCOVERY
              <span className="text-blue-400">⚔️</span>
            </h1>
            <p className="text-ink-muted text-sm">Open rival challenges looking for an opponent. Accept one, or post your own.</p>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <span className="text-xs font-mono text-blue-400 border border-blue-500/30 bg-blue-500/5 px-3 py-1.5 rounded-full">
                {activeCount} open challenge{activeCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => {
                if (!userAddress) { doOpenAuth(); return; }
                setShowForm(!showForm);
              }}
              className="px-6 py-2.5 bg-ink text-surface font-bold uppercase rounded-full tracking-widest text-xs hover:opacity-85 transition-all active:scale-95 font-bebas flex items-center gap-2"
            >
              + POST CHALLENGE
            </button>
          </div>
        </div>

        {/* Post Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 border-blue-500/20 bg-blue-500/5 space-y-4"
            >
              <h3 className="text-xl font-bold font-bebas tracking-wider text-blue-400">POST A RIVAL CHALLENGE</h3>
              <form onSubmit={handlePost} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase opacity-40">Challenge Title</label>
                    <input
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-surface-raised border border-line p-3 outline-none focus:border-ink-muted transition-colors text-sm"
                      placeholder="e.g. WHO CAN SHIP FIRST"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase opacity-40">Stake Per Side (STX)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={stakeSTX}
                      onChange={e => setStakeSTX(e.target.value)}
                      className="w-full bg-surface-raised border border-line p-3 outline-none focus:border-ink-muted transition-colors text-sm"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase opacity-40">Description / Rules</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-surface-raised border border-line p-3 outline-none focus:border-ink-muted transition-colors text-sm h-20 resize-none"
                    placeholder="What's the goal? What counts as proof?"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase opacity-40">Duration</label>
                  <div className="flex gap-2 flex-wrap">
                    {['7', '14', '30', '60', '90'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationDays(d)}
                        className={`px-4 py-2 text-xs font-bold border transition-all rounded ${
                          durationDays === d ? 'border-blue-400 bg-blue-400/10 text-blue-400' : 'border-line text-gray-500 hover:border-ink-muted hover:text-ink'
                        }`}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-line text-xs font-bold uppercase tracking-widest hover:border-white/30 transition-all rounded">
                    CANCEL
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase text-xs tracking-widest transition-all rounded">
                    POST CHALLENGE
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenge List */}
        {challenges.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center border-dashed border-white/20">
            <div className="text-5xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold mb-2 font-bebas tracking-wider">NO OPEN CHALLENGES</h3>
            <p className="text-ink-muted text-sm max-w-sm">Be the first to post a rival challenge. Find an opponent and let the stakes decide who delivers.</p>
            <button
              onClick={() => { if (!userAddress) { doOpenAuth(); return; } setShowForm(true); }}
              className="mt-6 text-sm font-bold text-blue-400 hover:text-blue-300 border border-blue-500/30 px-5 py-2 rounded-full transition-colors"
            >
              Post First Challenge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {challenges.map((c, idx) => {
                const isOwn = c.poster === userAddress;
                const age = Math.floor((Date.now() - c.postedAt) / 60000);
                const ageLabel = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.floor(age / 60)}h ago` : `${Math.floor(age / 1440)}d ago`;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="glass-card p-6 border-blue-500/20 hover:border-blue-500/40 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">OPEN CHALLENGE</span>
                      </div>
                      <span className="text-[10px] text-ink-subtle font-mono">{ageLabel}</span>
                    </div>

                    <h4 className="text-xl font-bold font-bebas tracking-wider mb-2 group-hover:text-blue-300 transition-colors">
                      {c.title}
                    </h4>

                    {c.description && (
                      <p className="text-sm text-ink-muted leading-relaxed mb-4 line-clamp-2">{c.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-surface-raised p-3 rounded-lg">
                        <div className="text-[9px] text-ink-subtle uppercase tracking-widest mb-1">Stake Per Side</div>
                        <div className="text-lg font-bold font-bebas text-ink">{c.stakeSTX} STX</div>
                      </div>
                      <div className="bg-surface-raised p-3 rounded-lg">
                        <div className="text-[9px] text-ink-subtle uppercase tracking-widest mb-1">Duration</div>
                        <div className="text-lg font-bold font-bebas text-ink">{c.durationDays} DAYS</div>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-gray-600 mb-4 truncate">
                      Posted by: {isOwn ? <span className="text-purple-400">YOU</span> : c.poster}
                    </div>

                    <div className="flex gap-2">
                      {isOwn ? (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="flex-1 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-widest transition-all rounded"
                        >
                          REMOVE
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAccept(c)}
                          className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase text-xs tracking-widest transition-all rounded font-bebas"
                        >
                          ACCEPT CHALLENGE ⚔️
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setPrefillRival(null); }} />
    </SidebarLayout>
  );
}
