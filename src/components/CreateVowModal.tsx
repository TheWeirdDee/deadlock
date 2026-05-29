 'use client';

/**
 * CreateVowModal — popup form for initiating a new on-chain vow.
 *
 * Contract function called: `create-vow`
 * Arguments (in order):
 *   1. title (string-utf8)
 *   2. description (string-utf8)
 *   3. vow-type (uint): 1=burn, 2=rival, 3=cause
 *   4. stake-amount (uint, in microSTX)
 *   5. deadline-block (uint, Stacks block height)
 *   6. rival (optional principal): set for RIVAL type, none otherwise
 *   7. cause-wallet (optional principal): set for CAUSE type, none otherwise
 *
 * Pending vow strategy:
 *   After broadcasting, saves the vow locally to localStorage ('pending_vows')
 *   so it appears in the feed immediately before on-chain confirmation.
 *   The feed page reconciles and removes confirmed pending vows on re-load.
 */

import { useState } from 'react';
import { useConnect } from '@stacks/connect-react';
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
import { contractDetails, getNetwork } from '@/lib/contract';

/**
 * CreateVowModal provides a multi-step popup form containing input validation
 * and hooks to invoke the `create-vow` Clarity contract call transaction.
 * @param isOpen - Flag controlling modal render status
 * @param onClose - Handler invoked to dismiss the modal
 */
export function CreateVowModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { doContractCall } = useConnect();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(VOW_TYPES.BURN);
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [target, setTarget] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert STX input to microSTX (1 STX = 1,000,000 microSTX) and validate
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }
    const stakeAmountNumber = Math.round(parsedAmount * 1_000_000);
    const stakeAmount = BigInt(stakeAmountNumber);
    const deadlineBlock = parseInt(deadline, 10);
    if (!Number.isInteger(deadlineBlock) || deadlineBlock <= 0) {
      alert('Please enter a valid deadline block');
      return;
    }

    // Build Clarity contract call arguments.
    // rival and causeWallet are optional — use someCV(principal) or noneCV()
    // based on the vow type selected by the user.
    const args = [
      stringUtf8CV(title),
      stringUtf8CV(description),
      uintCV(Number(type)),
      uintCV(stakeAmountNumber),
      uintCV(deadlineBlock),
      // Arg 6: rival address — only for RIVAL type vows
      type === VOW_TYPES.RIVAL ? someCV(principalCV(target)) : noneCV(),
      // Arg 7: cause wallet — only for CAUSE type vows
      type === VOW_TYPES.CAUSE ? someCV(principalCV(target)) : noneCV(),
    ];

    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'create-vow',
      functionArgs: args,
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
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
      onCancel: () => {
        console.log('Transaction cancelled');
      },
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
        className="relative w-full max-w-xl glass-card p-6 md:p-8 bg-[#111] border-white/10 max-h-[90vh] overflow-y-auto"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Deadline Block</label>
              <input 
                required
                type="number"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors"
                placeholder="165000"
              />
            </div>
            {type !== VOW_TYPES.BURN && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase opacity-40">
                  {type === VOW_TYPES.RIVAL ? 'Rival Address' : 'Cause Wallet'}
                </label>
                <input 
                  required
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors"
                  placeholder="SP..."
                />
              </div>
            )}
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
