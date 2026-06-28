'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'deadlock_onboarding_seen';

const STEPS = [
  {
    icon: '⚔️',
    title: 'WHAT IS DEADLOCK?',
    body: 'Deadlock is a public accountability protocol on Bitcoin. You make a vow, stake real STX, and either deliver proof before the deadline — or your stake gets slashed. No admin. No mercy.',
    color: 'from-red-500/20 to-purple-500/20',
    accent: 'text-red-400',
  },
  {
    icon: '🔥',
    title: 'THREE VOW TYPES',
    body: (
      <div className="space-y-3 text-left">
        <div className="flex items-start gap-3 bg-surface-raised p-3 rounded-lg border border-line">
          <span className="text-red-400 font-bold text-sm mt-0.5 shrink-0">BURN</span>
          <span className="text-ink-muted text-sm">Failed stake is permanently burned. Maximum personal accountability.</span>
        </div>
        <div className="flex items-start gap-3 bg-surface-raised p-3 rounded-lg border border-line">
          <span className="text-blue-400 font-bold text-sm mt-0.5 shrink-0">RIVAL</span>
          <span className="text-ink-muted text-sm">Challenge a specific wallet. They match your stake. Winner takes both pools.</span>
        </div>
        <div className="flex items-start gap-3 bg-surface-raised p-3 rounded-lg border border-line">
          <span className="text-green-400 font-bold text-sm mt-0.5 shrink-0">CAUSE</span>
          <span className="text-ink-muted text-sm">Failed stake goes to a public-good beneficiary address of your choosing.</span>
        </div>
      </div>
    ),
    color: 'from-purple-500/20 to-blue-500/20',
    accent: 'text-purple-400',
  },
  {
    icon: '🗳️',
    title: 'COMMUNITY ADJUDICATION',
    body: 'When you submit proof, a challenge window opens. Any wallet can vote SUCCESS or FAILURE. The community decides whether your proof counts. Majority wins — on-chain, irreversible.',
    color: 'from-blue-500/20 to-teal-500/20',
    accent: 'text-blue-400',
  },
  {
    icon: '📡',
    title: 'SPECTATE & BET',
    body: "Don't have a vow? Bet on others. Stake STX on any active vow's success or failure. If you're right, you share the losing pool proportionally. The ROI calculator shows your potential payout before you commit.",
    color: 'from-teal-500/20 to-green-500/20',
    accent: 'text-green-400',
  },
  {
    icon: '🏆',
    title: 'REPUTATION & LEADERBOARD',
    body: 'Every completed vow earns you +100 XP. Every failed vow costs -150 XP. Your reputation is public, on-chain-derived, and permanent. Build an IRONCLAD track record — or expose yourself as a VOW BREAKER.',
    color: 'from-yellow-500/20 to-red-500/20',
    accent: 'text-yellow-400',
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setVisible(false);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-surface/85 backdrop-blur-md"
            onClick={dismiss}
          />

          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.28 }}
            className="relative w-full max-w-lg glass-card bg-surface-card border-line p-8 space-y-6"
          >
            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-ink' : 'w-1.5 bg-surface-hover hover:bg-surface-raised'
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-3xl border border-line`}>
              {current.icon}
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h3 className={`text-2xl font-bold font-bebas tracking-wider ${current.accent}`}>
                {current.title}
              </h3>
              {typeof current.body === 'string' ? (
                <p className="text-ink-muted text-sm leading-relaxed">{current.body}</p>
              ) : (
                <div className="text-ink-muted text-sm leading-relaxed">{current.body}</div>
              )}
            </div>

            {/* Nav */}
            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 border border-line text-xs font-bold tracking-widest uppercase hover:border-white/30 hover:bg-surface-raised transition-all rounded"
                >
                  BACK
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-2.5 bg-ink text-surface font-bold text-xs tracking-widest uppercase hover:opacity-85 transition-all rounded"
                >
                  NEXT →
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 bg-ink text-surface font-bold text-xs tracking-widest uppercase hover:opacity-85 transition-all rounded"
                >
                  LET'S GO →
                </button>
              )}
            </div>

            {/* Skip */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-ink-subtle hover:text-ink-muted text-xs font-mono tracking-widest transition-colors"
            >
              SKIP
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
