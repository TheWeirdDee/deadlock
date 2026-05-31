 'use client';


import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { AnimatePresence } from 'framer-motion';
import { getVowCount, getVow } from '@/lib/contract';
import { CreateVowModal } from '@/components/CreateVowModal';
import { SidebarLayout } from '@/components/SidebarLayout';
import { VowCard } from '@/components/VowCard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const appConfig = (typeof window !== 'undefined') ? new AppConfig(['store_write', 'publish_data']) : null;
  const userSession = appConfig ? new UserSession({ appConfig }) : null;

  useEffect(() => {
    try {
      if (userSession && userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
        fetchVows();
      } else {
        router.push('/');
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('Auth session error, clearing local storage:', e);
      router.push('/');
    }
  }, [router, userSession]);

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

  const handleLogin = () => {
    doOpenAuth();
  };

  const handleLogout = () => {
    userSession?.signUserOut();
    router.push('/');
  };

  if (loading) {
    return (
      <SidebarLayout activePage="dashboard">
        <div className="flex-grow flex items-center justify-center h-full min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </SidebarLayout>
    );
  }

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
  const myVows = vows.filter(v => v.creator === userAddress);

  return (
    <SidebarLayout activePage="dashboard">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 relative space-y-16">
        <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-t-2 border-purple-500">
          <div>
            <h2 className="text-3xl font-bold font-bebas mb-2">WELCOME BACK.</h2>
            <p className="text-sm opacity-60 font-mono tracking-wider text-purple-300 mb-6 md:mb-0">
              {userAddress}
            </p>
          </div>
          <div className="flex gap-8 items-center">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Win Rate</p>
              <p className="text-xl font-bold font-bebas text-green-400">85%</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Staked</p>
              <p className="text-xl font-bold font-bebas text-purple-400">{(myVows.reduce((acc, v) => acc + Number(v['stake-amount'] || 0), 0) / 1000000).toFixed(1)} STX</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3.5 bg-white text-black font-bold uppercase rounded-full tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] font-bebas flex items-center gap-2"
            >
              CREATE VOW →
            </button>
          </div>
        </div>

        {myVows.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6 border-b border-purple-500/30 pb-4">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-widest font-bebas">ACTION REQUIRED</h3>
            </div>
            <div className="glass-card border border-purple-500/20 p-6 flex flex-col md:flex-row justify-between items-center bg-purple-900/10 gap-4">
              <div>
                <h4 className="font-bold text-lg">VOW #12 - SHIP FRONTEND</h4>
                <p className="text-sm text-gray-400">Deadline has passed. Submit your proof of completion immediately to avoid slashing.</p>
              </div>
              <button className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold uppercase rounded text-xs tracking-widest transition-colors flex-shrink-0">
                SUBMIT PROOF
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">YOUR ACTIVE VOWS</h3>
          {myVows.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center">
              <p className="text-gray-400 mb-4 tracking-wider">You don't have any active vows yet.</p>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="text-sm font-bold text-white hover:text-purple-400 uppercase tracking-widest border border-white/20 px-6 py-2 rounded-full transition-colors"
              >
                Create your first vow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {myVows.map((vow, idx) => (
                  <VowCard key={vow.id} vow={vow} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white uppercase tracking-widest font-bebas">YOUR SPECTATOR BETS</h3>
          {(() => {
            const spectatorBets: any[] = [];
            
            if (spectatorBets.length === 0) {
              return (
                <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center">
                  <p className="text-gray-400 mb-4 tracking-wider">You haven't placed any spectator bets yet.</p>
                  <button 
                    onClick={() => router.push('/#feed')} 
                    className="text-sm font-bold text-white hover:text-purple-400 uppercase tracking-widest border border-white/20 px-6 py-2 rounded-full transition-colors"
                  >
                    Browse Active Vows
                  </button>
                </div>
              );
            }

            return (
              <div className="glass-card p-6">
                 <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-widest">
                      <th className="pb-4 font-normal">Vow Title</th>
                      <th className="pb-4 font-normal">Staked</th>
                      <th className="pb-4 font-normal">Prediction</th>
                      <th className="pb-4 font-normal text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spectatorBets.map((bet, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-bold text-sm">{bet.title}</td>
                        <td className="py-4 text-purple-400 font-bold">{bet.amount} STX</td>
                        <td className={`py-4 text-xs tracking-widest ${bet.prediction === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>{bet.prediction}</td>
                        <td className="py-4 text-right text-gray-500 text-xs">{bet.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </SidebarLayout>
  );
}
