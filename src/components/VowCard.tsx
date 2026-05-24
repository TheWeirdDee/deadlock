import { motion } from 'framer-motion';
import Link from 'next/link';
import { VOW_TYPES } from '@/lib/types';

export function VowCard({ vow, index }: { vow: any; index: number }) {
  const typeClass = 
    vow.vowType === VOW_TYPES.BURN ? 'glow-burn' :
    vow.vowType === VOW_TYPES.RIVAL ? 'glow-rival' : 'glow-cause';
  
  const typeLabel = 
    vow.vowType === VOW_TYPES.BURN ? 'BURN' :
    vow.vowType === VOW_TYPES.RIVAL ? 'RIVAL' : 'CAUSE';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className={`glass-card p-6 flex flex-col h-full border-t-2 ${typeClass}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`status-badge ${
          vow.vowType === VOW_TYPES.BURN ? 'border-red-500 text-red-500' :
          vow.vowType === VOW_TYPES.RIVAL ? 'border-blue-400 text-blue-400' : 'border-green-400 text-green-400'
        }`}>
          {typeLabel}
        </span>
        <span className="text-[10px] opacity-40">VOW #{vow.id}</span>
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

        <Link href={`/vow/${vow.id}`} className="w-full">
          <button className={`w-full py-2 font-bold uppercase text-xs transition-all ${
            vow.vowType === VOW_TYPES.BURN ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' :
            vow.vowType === VOW_TYPES.RIVAL ? 'bg-blue-400/10 text-blue-400 hover:bg-blue-400 hover:text-white' : 
            'bg-green-400/10 text-green-400 hover:bg-green-400 hover:text-white'
          }`}>
            VIEW CHALLENGE
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
