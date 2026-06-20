'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { 
  AnchorMode, 
  PostConditionMode, 
  uintCV, 
  stringUtf8CV, 
  noneCV, 
  someCV, 
  principalCV 
} from '@stacks/transactions';
import { motion } from 'framer-motion';
import { VOW_TYPES } from '@/lib/types';
import { contractDetails, getNetwork, getCurrentBlockHeight } from '@/lib/contract';
import { useToast } from '@/components/Toast';

export function CreateVowModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { doContractCall, doOpenAuth } = useConnect();
  const { toast } = useToast();
  
  const userSessionRef = useRef<UserSession | null>(null);
  if (!userSessionRef.current && typeof window !== 'undefined') {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionRef.current = new UserSession({ appConfig });
  }
  const userSession = userSessionRef.current;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(VOW_TYPES.BURN);
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState('');

  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [deadlineMode, setDeadlineMode] = useState<'duration' | 'custom'>('duration');
  const [durationDays, setDurationDays] = useState('7');
  const [customDeadline, setCustomDeadline] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getCurrentBlockHeight()
      .then(height => { if (active) setCurrentBlock(height); })
      .catch(e => console.error('Failed to fetch block height:', e));
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userSession || !userSession.isUserSignedIn()) {
      alert('Please connect your Stacks wallet to initiate a Vow');
      doOpenAuth();
      return;
    }
    
    // Convert STX input to microSTX (1 STX = 1,000,000 microSTX) and validate
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }
    const stakeAmountNumber = Math.round(parsedAmount * 1_000_000);
    const stakeAmount = BigInt(stakeAmountNumber);

    let deadlineBlock = 0;
    if (deadlineMode === 'duration') {
      if (currentBlock === null) {
        alert('Still fetching current Stacks block height. Please wait.');
        return;
      }
      deadlineBlock = currentBlock + Math.round(Number(durationDays) * 144);
    } else {
      deadlineBlock = parseInt(customDeadline, 10);
      if (!Number.isInteger(deadlineBlock) || deadlineBlock <= 0) {
        alert('Please enter a valid deadline block number');
        return;
      }
      if (currentBlock !== null && deadlineBlock <= currentBlock) {
        alert(`Deadline block must be in the future (greater than current block #${currentBlock})`);
        return;
      }
    }

    if (type !== VOW_TYPES.BURN && !target) {
      alert(`Please enter a valid Stacks address for the ${type === VOW_TYPES.RIVAL ? 'rival' : 'cause beneficiary'}`);
      return;
    }

    let args;
    try {
      args = [
        stringUtf8CV(title),
        stringUtf8CV(description),
        uintCV(Number(type)),
        uintCV(stakeAmountNumber),
        uintCV(deadlineBlock),
        type === VOW_TYPES.RIVAL ? someCV(principalCV(target)) : noneCV(),
        type === VOW_TYPES.CAUSE ? someCV(principalCV(target)) : noneCV(),
      ];
    } catch (error) {
      alert('Invalid wallet address format. Please make sure the target address is a valid Stacks principal (starts with SP).');
      return;
    }

    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'create-vow',
      functionArgs: args,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        toast('Vow submitted — it will appear once confirmed on-chain.', 'success');
        try {
          const pendingVow = {
            id: `pending-${data.txId}`,
            title,
            description,
            vowType: type,
            'stake-amount': stakeAmount.toString(),
            'deadline-block': deadlineBlock,
            creator: '',
            status: 'PENDING'
          };

          const existingPending = JSON.parse(localStorage.getItem('pending_vows') || '[]');
          localStorage.setItem('pending_vows', JSON.stringify([pendingVow, ...existingPending]));
          window.dispatchEvent(new Event('vows_updated'));
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') console.error('Failed to save pending vow', e);
        }
        onClose();
      },
      onCancel: () => toast('Transaction cancelled.', 'info'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl glass-card p-6 md:p-8 bg-[#111] border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-3xl md:text-4xl font-bold mb-8 uppercase">INITIATE VOW</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase opacity-40">Vow Type</label>
            <div className="flex flex-wrap md:flex-nowrap gap-2">
              {[
                { id: VOW_TYPES.BURN, label: 'BURN', color: 'border-red-500' },
                { id: VOW_TYPES.RIVAL, label: 'RIVAL', color: 'border-blue-400' },
                { id: VOW_TYPES.CAUSE, label: 'CAUSE', color: 'border-green-400' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex-1 min-w-[80px] py-3 text-sm font-bold border transition-all ${
                    type === t.id ? t.color + ' bg-white/5' : 'border-white/10 opacity-40 hover:opacity-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase opacity-40">Title</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors"
              placeholder="e.g. SHIP DEADLOCK FRONTEND"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase opacity-40">Stake Amount (STX) - Min 0.002 STX</label>
            <input 
              required
              type="number"
              step="0.000001"
              min="0.002"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors"
              placeholder="100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deadline Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase opacity-40 block">Deadline Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeadlineMode('duration')}
                    className={`flex-1 py-2.5 text-xs font-bold border transition-all ${
                      deadlineMode === 'duration' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    DURATION (DAYS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeadlineMode('custom')}
                    className={`flex-1 py-2.5 text-xs font-bold border transition-all ${
                      deadlineMode === 'custom' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    SPECIFIC BLOCK
                  </button>
                </div>
              </div>

              {deadlineMode === 'duration' ? (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40 block">Vow Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { days: '1', label: '1 Day' },
                      { days: '3', label: '3 Days' },
                      { days: '7', label: '7 Days' },
                      { days: '14', label: '14 Days' },
                      { days: '30', label: '30 Days' },
                      { days: '90', label: '90 Days' },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setDurationDays(opt.days)}
                        className={`py-2.5 text-xs font-mono font-bold border transition-all ${
                          durationDays === opt.days ? 'border-white bg-white/10' : 'border-white/5 opacity-55 hover:opacity-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40 block">Target Block Number</label>
                  <input 
                    required={deadlineMode === 'custom'}
                    type="number"
                    value={customDeadline}
                    onChange={e => setCustomDeadline(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3.5 outline-none focus:border-white transition-colors"
                    placeholder="e.g. 165000"
                  />
                </div>
              )}
            </div>

            {/* Target Address & Calculation info */}
            <div className="space-y-4">
              {type !== VOW_TYPES.BURN ? (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40 block">
                    {type === VOW_TYPES.RIVAL ? 'Rival Address' : 'Cause Wallet'}
                  </label>
                  <input 
                    required
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors text-sm font-mono"
                    placeholder="SP..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40 block">Forfeit Destination</label>
                  <div className="w-full bg-white/5 border border-dashed border-red-500/20 text-red-400 p-3 text-xs font-mono select-none">
                    BURN ADDRESS: SP0000...2Q6VF78
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase opacity-40 block">Live Calculation</label>
                {currentBlock !== null ? (
                  <div className="p-3 bg-white/5 border border-white/10 rounded font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-50">Current Block:</span>
                      <span className="font-bold text-gray-300">#{currentBlock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-50">Deadline Block:</span>
                      <span className="font-bold text-purple-400">
                        #{deadlineMode === 'duration' 
                          ? currentBlock + Math.round(Number(durationDays) * 144) 
                          : (parseInt(customDeadline) || '—')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-50">Est. Date:</span>
                      <span className="font-bold text-blue-400">
                        {(() => {
                          const targetBlock = deadlineMode === 'duration' 
                            ? currentBlock + Math.round(Number(durationDays) * 144) 
                            : parseInt(customDeadline);
                          if (isNaN(targetBlock)) return '—';
                          const delta = targetBlock - currentBlock;
                          const estSecs = delta * 600;
                          const estDate = new Date(Date.now() + estSecs * 1000);
                          return `${estDate.toLocaleDateString()} at ${estDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        })()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/10 rounded font-mono text-xs text-center text-gray-500 animate-pulse">
                    Fetching current Stacks block height...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase opacity-40">Description / Proof Conditions</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors h-24 resize-none"
              placeholder="If I don't deploy this by block X, my stake is forfeit."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" className="flex-1 btn-primary">Lock Vow</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
