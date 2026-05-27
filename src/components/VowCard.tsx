import { motion } from 'framer-motion';
import Link from 'next/link';
import { VOW_TYPES } from '@/lib/types';

// Docs: VowCard presentation notes (annotation)

/**
 * Returns the Tailwind border/text color class for a given vow type.
 * Used to consistently apply type-specific accent colors across the card.
 */
function getTypeColor(vowType: number): string {
  if (vowType === VOW_TYPES.BURN) return 'border-purple-400 text-purple-400';
  if (vowType === VOW_TYPES.RIVAL) return 'border-blue-400 text-blue-400';
  return 'border-green-400 text-green-400'; // CAUSE
}

/**
 * Returns the hover background + text class for a vow type action button.
 */
function getTypeButtonClass(vowType: number): string {
  if (vowType === VOW_TYPES.BURN) return 'bg-purple-400/10 text-purple-400 hover:bg-purple-400 hover:text-white';
  if (vowType === VOW_TYPES.RIVAL) return 'bg-blue-400/10 text-blue-400 hover:bg-blue-400 hover:text-white';
  return 'bg-green-400/10 text-green-400 hover:bg-green-400 hover:text-white'; // CAUSE
}

/**
 * Returns a human-readable label for the vow type enum value.
 */
function getTypeLabel(vowType: number): string {
  if (vowType === VOW_TYPES.BURN) return 'BURN';
  if (vowType === VOW_TYPES.RIVAL) return 'RIVAL';
  return 'CAUSE';
}

/**
 * VowCard component representing a summary grid item of a single commitment
 * vow card with details of stake amount, deadline, and a view action.
 * @param vow - Vow object mapping fields
 * @param index - Index offset in list for loading delay animations
 */
export function VowCard({ vow, index }: { vow: any; index: number }) {
  const typeLabel = getTypeLabel(vow.vowType);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className={`glass-card p-6 flex flex-col h-full border-t-2 border-white/10`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`status-badge ${getTypeColor(vow.vowType)}`} aria-label={`Vow type: ${typeLabel}`}>
          {typeLabel}
        </span>
        <span className="text-[10px] opacity-40 flex items-center gap-1 max-w-[180px]">
          <span className="truncate">VOW #{vow.id}</span>
          {vow.status === 'PENDING' && (
            <a 
              href={`https://explorer.hiro.so/txid/0x${String(vow.id).replace('pending-', '')}?chain=mainnet`}
              target="_blank" 
              rel="noopener noreferrer"
              title="View on Explorer"
              className="text-yellow-500 hover:text-yellow-400 transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          )}
        </span>
      </div>

      <h4 className="text-2xl font-bold mb-2 uppercase leading-tight truncate">{vow.title}</h4>
      <p className="text-sm opacity-60 mb-6 flex-grow line-clamp-3 leading-relaxed">
        {vow.description === 'Farming description' ? 'A public vow has been made. The stakes are high, and the world is watching.' : vow.description}
      </p>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] opacity-40 uppercase">STAKE</span>
          <span className="font-bold text-xl">{Number(vow['stake-amount']) / 1000000} STX</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[10px] opacity-40 uppercase">DEADLINE</span>
          <span className="text-xs">BLOCK #{vow['deadline-block']}</span>
        </div>

        {vow.status === 'PENDING' ? (
          <button disabled className="w-full py-2 font-bold uppercase text-xs transition-all bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 animate-pulse cursor-not-allowed">
            PENDING CONFIRMATION...
          </button>
        ) : (
          <Link href={`/vow/${vow.id}`} className="w-full">
            <button
              className={`w-full py-2 font-bold uppercase text-xs transition-all ${getTypeButtonClass(vow.vowType)}`}
              aria-label={`View vow #${vow.id}: ${vow.title}`}
            >
              VIEW CHALLENGE
            </button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
