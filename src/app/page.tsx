'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { getVowCount, getVow, contractDetails } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';
import { CreateVowModal } from '@/components/CreateVowModal';

export default function Home() {
  const { doOpenAuth } = useConnect();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
    fetchVows();
  }, []);

  async function fetchVows() {
    try {
      const count = await getVowCount();
      const fetchedVows = [];
      // Fetch last 10 vows for now
      for (let i = count; i > Math.max(0, count - 10); i--) {
        const vow = await getVow(i);
        if (vow) fetchedVows.push({ ...vow, id: i });
      }
      setVows(fetchedVows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = () => {
    doOpenAuth();
  };

  const handleLogout = () => {
    userSession.signUserOut();
    window.location.reload();
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24 relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rotate-45 flex items-center justify-center">
            <div className="w-4 h-4 bg-black -rotate-45"></div>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">DEADLOCK</h1>
        </div>
        
        <div className="flex gap-4 items-center">
          {userData ? (
            <div className="flex gap-4 items-center">
              <span className="text-xs opacity-50 hidden md:block">{userData.profile.stxAddress.mainnet.slice(0, 6)}...{userData.profile.stxAddress.mainnet.slice(-4)}</span>
              <button onClick={handleLogout} className="btn-outline text-xs py-1 px-4">Logout</button>
            </div>
          ) : (
            <button onClick={handleLogin} className="btn-primary">Connect Wallet</button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="w-full max-w-4xl text-center mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 tracking-tight leading-none">
            PUT YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-green-400">STX</span> WHERE YOUR MOUTH IS.
          </h2>
          <p className="text-base sm:text-xl opacity-60 max-w-2xl mx-auto mb-10 px-4">
            Secure, decentralized accountability vows. Burn it, give it to a rival, or support a cause. 
            Public failure is the ultimate motivator.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary py-4 px-10 text-xl"
            >
              Create New Vow
            </button>
            <button className="btn-outline py-4 px-10 text-xl">Browse All</button>
          </div>
        </motion.div>
      </section>

      {/* Vows Feed */}
      <section className="w-full max-w-6xl">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <h3 className="text-3xl font-bold">LATEST CHALLENGES</h3>
          <span className="text-xs opacity-40">AUTO-REFRESHING ON-CHAIN</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 glass-card animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {vows.map((vow, idx) => (
                <VowCard key={vow.id} vow={vow} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-32 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-xs opacity-30 uppercase tracking-widest">
          © 2026 DEADLOCK PROTOCOL | SECURED BY BITCOIN
        </div>
        <div className="flex gap-8 text-xs opacity-30 font-bold">
          <a href="#" className="hover:opacity-100 transition-opacity">CONTRACT</a>
          <a href="#" className="hover:opacity-100 transition-opacity">DOCS</a>
          <a href="#" className="hover:opacity-100 transition-opacity">TWITTER</a>
        </div>
      </footer>
    </main>
  );
}

function VowCard({ vow, index }: { vow: any; index: number }) {
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
        {vow.description}
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
