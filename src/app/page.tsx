 'use client';


import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import Link from 'next/link';
import { getVowCount, getVow, contractDetails } from '@/lib/contract';
import { loadVowCache, saveVowCache } from '@/lib/vowCache';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';
import { loadVowCache, saveVowCache } from '@/lib/vowCache';
import { CreateVowModal } from '@/components/CreateVowModal';
import { Header } from '@/components/Header';
import { VowCard } from '@/components/VowCard';

export default function Home() {
  const { doOpenAuth } = useConnect();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ lockedSTX: 0, activeVowsCount: 0, totalVotesCast: 0 });
  const container = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    lockedSTX: 0,
    activeVowsCount: 0,
    totalVotesCast: 0,
  });

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.hero-title-word', { y: 100, opacity: 0, duration: 1, stagger: 0.15, ease: 'power4.out', delay: 0.2 })
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
      .from('.hero-btn', { scale: 0.9, opacity: 0, duration: 0.5, stagger: 0.15, ease: 'back.out(1.7)' }, '-=0.4');
  }, { scope: container });

  const appConfig = (typeof window !== 'undefined') ? new AppConfig(['store_write', 'publish_data']) : null;
  const userSession = appConfig ? new UserSession({ appConfig }) : null;

  useEffect(() => {
    try {
      if (userSession && userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('Auth session error', e);
    }
    fetchVows();
    computeLiveStats();

    const statsInterval = setInterval(() => { computeLiveStats(); }, 5 * 60 * 1000);
    return () => clearInterval(statsInterval);
  }, []);

  useEffect(() => {
    const handleUpdate = () => fetchVows();
    window.addEventListener('vows_updated', handleUpdate);
    return () => window.removeEventListener('vows_updated', handleUpdate);
  }, []);

  async function fetchVows() {
    try {
      const count = await getVowCount();
      const fetchedVows: any[] = [];
      for (let i = count; i > Math.max(0, count - 10); i--) {
        const vow = await getVow(i);
        if (vow) fetchedVows.push({ ...vow, id: i });
      }
      
      let pendingVows = [];
      try {
        const stored = localStorage.getItem('pending_vows');
        if (stored) {
          const parsed = JSON.parse(stored);
          pendingVows = parsed.filter((pending: any) => {
            return !fetchedVows.some(
              confirmed => confirmed.title === pending.title && 
                           confirmed.description === pending.description
            );
          });
          if (pendingVows.length !== parsed.length) {
            localStorage.setItem('pending_vows', JSON.stringify(pendingVows));
          }
        }
      } catch (err) {
        console.error("Error reading pending vows", err);
      }
      
      setVows([...pendingVows, ...fetchedVows]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function computeLiveStats() {
    try {
      const count = await getVowCount();

      const cache = loadVowCache();
      const updatedVows = [...cache.vows];

      // Show metrics from what's cached immediately
      calculateMetrics(updatedVows);

 
  function calculateMetrics(vowsList: any[]) {
    let escrowSTX = 0, active = 0, votes = 0;
    for (const v of vowsList) {
      const s = Number(v.status || v['status']);
      if (s === VOW_STATUS.ACTIVE || s === VOW_STATUS.CHALLENGED) {
        escrowSTX += Number(v.stakeAmount || v['stake-amount'] || 0) / 1_000_000;
        escrowSTX += Number(v.rivalStake || v['rival-stake'] || 0) / 1_000_000;
        active++;
      }
      votes += Number(v.yesVotes || v['yes-votes'] || 0) + Number(v.noVotes || v['no-votes'] || 0);
    }
    setStats({ lockedSTX: escrowSTX, activeVowsCount: active, totalVotesCast: votes });
  }

  async function computeLiveStats() {
    try {
      const count = await getVowCount();
      const cache = loadVowCache();
      const updatedVows = [...cache.vows];
      calculateMetrics(updatedVows);
      if (count > cache.lastSyncedId) {
        for (let i = cache.lastSyncedId + 1; i <= count; i++) {
          try {
            const vow = await getVow(i);
            if (vow) updatedVows.push({ ...vow, id: i });
          } catch (e) {
            console.error(`Failed to fetch vow #${i} for stats:`, e);
          }
          // Rate-limit protection: 200ms between each read-only call
          await new Promise(r => setTimeout(r, 200));
        }
          } catch {}
          await new Promise(r => setTimeout(r, 200));
        }
        saveVowCache({ lastSyncedId: count, vows: updatedVows });
        calculateMetrics(updatedVows);
      }
    } catch (e) {
      console.error('Failed to compute stats:', e);
    }
  }
  function calculateMetrics(vowsList: any[]) {
    let escrowSTX = 0;
    let active = 0;
    let votes = 0;

    for (const v of vowsList) {
      const statusVal = Number(v.status || v['status']);
      const stakeVal = Number(v.stakeAmount || v['stake-amount'] || 0) / 1000000;
      const rivalStakeVal = Number(v.rivalStake || v['rival-stake'] || 0) / 1000000;
      const yesVotesVal = Number(v.yesVotes || v['yes-votes'] || 0);
      const noVotesVal = Number(v.noVotes || v['no-votes'] || 0);

      if (statusVal === VOW_STATUS.ACTIVE || statusVal === VOW_STATUS.CHALLENGED) {
        escrowSTX += stakeVal + rivalStakeVal;
        active++;
      }
      votes += yesVotesVal + noVotesVal;
    }

    setStats({
      lockedSTX: escrowSTX,
      activeVowsCount: active,
      totalVotesCast: votes,
    });
  }
  const handleLogin = () => {
    doOpenAuth();
  };

  const handleLogout = () => {
    if (userSession) userSession.signUserOut();
    window.location.reload();
  };

  return (
    <main ref={container} className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-30 mix-blend-screen">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[200px]"></div>
      </div>

      <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />

      <section className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-4 mt-4 relative z-10">
            
            <div className="lg:col-span-7 flex flex-col items-start text-left">
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 rounded-full mb-6 shadow-sm">
            <svg className="w-3.5 h-3.5 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">SECURED BY BITCOIN</span>
          </div>
          
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight uppercase leading-[0.95] mb-6">
            PUT YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">STX</span> WHERE YOUR MOUTH IS.
          </h2>
          
          <p className="text-base sm:text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
            Secure, decentralized accountability vows. Burn it, give it to a rival, or support a cause. 
            <span className="text-white font-bold block mt-1">Public failure is the ultimate motivator.</span>
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3.5 bg-white text-black font-bold uppercase rounded-full tracking-widest text-sm hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all active:scale-95 duration-300 shadow-md font-bebas flex items-center gap-2 group"
            >
              CREATE NEW VOW 
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <a href="#feed" className="px-8 py-3.5 border border-white/20 hover:border-white/50 text-white font-bold uppercase rounded-full tracking-widest text-sm hover:bg-white/5 transition-all active:scale-95 duration-300 font-bebas">
              BROWSE ALL
            </a>
          </div>
          
        </div>

        <div className="lg:col-span-5 flex justify-center items-center relative h-[320px] sm:h-[400px] w-full">
          
          <div className="absolute w-[280px] sm:w-[360px] h-[280px] sm:h-[360px] rounded-full border border-white/5 animate-orbit-1"></div>
          <div className="absolute w-[220px] sm:w-[280px] h-[220px] sm:h-[280px] rounded-full border border-dashed border-white/10 animate-orbit-2"></div>
          <div className="absolute w-[160px] sm:w-[200px] h-[160px] sm:h-[200px] rounded-full border border-white/5 animate-orbit-3"></div>
          
          <div className="absolute top-[20%] left-[15%] w-2 h-2 bg-purple-500 rotate-45 animate-pulse"></div>
          <div className="absolute bottom-[25%] right-[10%] w-1.5 h-1.5 bg-blue-400 rotate-45"></div>
          <div className="absolute top-[30%] right-[15%] text-[10px] text-gray-500 font-bold select-none">*</div>
          <div className="absolute bottom-[20%] left-[25%] text-xs text-gray-600 font-bold select-none">✦</div>
          <div className="absolute top-[10%] right-[30%] w-1 h-1 bg-white rounded-full"></div>
          
          <div className="relative w-[180px] sm:w-[230px] h-[180px] sm:h-[230px] rounded-full bg-gradient-to-tr from-purple-900/40 via-blue-900/30 to-black/80 border border-white/15 p-2 overflow-hidden shadow-[0_0_50px_rgba(147,51,234,0.2)]">
            <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-black/60">
              <img 
                src="/hero-skull.png" 
                alt="Deadlock Skull Graphic" 
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>
          </div>
          
        </div>
      </section>
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-24 mb-20 z-20">
        
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto block translate-y-[1px]" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,80 C360,130 720,20 1080,100 C1260,130 1380,100 1440,80 L1440,120 L0,120 Z" fill="#050505" />
        </svg>
        
        <div className="bg-[#050505] border-y border-white/5 py-12 px-6 sm:px-12 md:px-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div id="analytics" className="lg:col-span-7 grid grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="text-3xl sm:text-5xl font-bold font-bebas text-white tracking-wider mb-1">
                  {stats.lockedSTX > 0 ? stats.lockedSTX.toFixed(1) : "2.5M"}
                  <span className="text-purple-500 font-bebas">{stats.lockedSTX > 0 ? " STX" : "+"}</span>
                  {stats.lockedSTX > 0 ? stats.lockedSTX.toFixed(1) : '2.5M'}
                  <span className="text-purple-500 font-bebas">{stats.lockedSTX > 0 ? ' STX' : '+'}</span>
                </h4>
                <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">STX ESCROWED</p>
              </div>

              <div className="border-l border-white/10 pl-6">
                <h4 className="text-3xl sm:text-5xl font-bold font-bebas text-white tracking-wider mb-1">
                  {stats.lockedSTX > 0 ? stats.activeVowsCount : "1.2K"}
                  <span className="text-blue-400 font-bebas">{stats.lockedSTX > 0 ? "" : "+"}</span>
                  {stats.lockedSTX > 0 ? stats.activeVowsCount : '1.2K'}
                  <span className="text-blue-400 font-bebas">{stats.lockedSTX > 0 ? '' : '+'}</span>
                </h4>
                <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">ACTIVE VOWS</p>
              </div>

              <div className="border-l border-white/10 pl-6">
                <h4 className="text-3xl sm:text-5xl font-bold font-bebas text-white tracking-wider mb-1">
                  {stats.lockedSTX > 0 ? stats.totalVotesCast : "45K"}
                  <span className="text-green-400 font-bebas">{stats.lockedSTX > 0 ? "" : "+"}</span>
                  {stats.lockedSTX > 0 ? stats.totalVotesCast : '45K'}
                  <span className="text-green-400 font-bebas">{stats.lockedSTX > 0 ? '' : '+'}</span>
                </h4>
                <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">VOTES CAST</p>
              </div>
            </div>
            
            <div className="lg:col-span-5 flex flex-col items-start lg:items-end text-left lg:text-right w-full">
              
              <div className="flex items-center gap-3 mb-4">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md">JD</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white shadow-md">AS</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gradient-to-tr from-yellow-500 to-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md">MK</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gradient-to-tr from-green-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md">99+</div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white leading-none">200+ ACTIVE SPECTATORS</p>
                  <p className="text-[9px] text-gray-500 tracking-wider mt-0.5">BETTING ON LIVE VOWS</p>
                </div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed to waitlist!'); }} className="relative flex items-center bg-white/5 border border-white/10 rounded-full pl-4 pr-1.5 py-1.5 w-full max-w-sm hover:border-white/20 focus-within:border-white/30 transition-colors">
                <input 
                  type="email" 
                  required
                  placeholder="Join the waitlist for updates..." 
                  className="bg-transparent outline-none border-none text-xs text-white placeholder-gray-500 flex-grow font-space min-w-0" 
                />
                <button 
                  type="submit" 
                  className="w-8 h-8 bg-white text-black hover:bg-gray-200 transition-colors rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 shadow-md"
                >
                  <svg className="w-4 h-4 text-black transform rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
              
            </div>
            
          </div>
        </div>
      </div>

      <section id="feed" className="w-full max-w-6xl">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <h3 className="text-3xl font-bold">{userData ? "GLOBAL CHALLENGES" : "LATEST CHALLENGES"}</h3>
          <span className="text-xs opacity-40">AUTO-REFRESHING ON-CHAIN</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 glass-card animate-pulse"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {vows.slice(0, 9).map((vow, idx) => (
                  <VowCard key={vow.id} vow={vow} index={idx} />
                ))}
              </AnimatePresence>
            </div>
            
            <div className="mt-12 flex justify-center">
              {!userData ? (
                <button 
                  onClick={handleLogin}
                  className="px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 text-white font-bold uppercase rounded-full tracking-widest text-sm hover:bg-white/10 transition-all duration-300 font-bebas flex items-center gap-2"
                >
                  CONNECT WALLET TO VIEW MORE
                </button>
              ) : (
                <Link 
                  href="/feed"
                  className="px-8 py-4 bg-white/5 border border-white/10 hover:border-purple-500/50 text-white font-bold uppercase rounded-full tracking-widest text-sm hover:bg-purple-500/10 transition-all duration-300 font-bebas flex items-center gap-2"
                >
                  VIEW ALL IN DASHBOARD →
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

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
