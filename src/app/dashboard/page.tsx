'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { AnimatePresence } from 'framer-motion';
import { getVowCount, getVow } from '@/lib/contract';
import { CreateVowModal } from '@/components/CreateVowModal';
import { Header } from '@/components/Header';
import { VowCard } from '@/components/VowCard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [vows, setVows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    try {
      if (userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
      } else {
        // Redirect to home if not logged in
        router.push('/');
      }
    } catch (e) {
      console.error('Auth session error, clearing local storage:', e);
      router.push('/');
    }
    fetchVows();
  }, [router]);

  useEffect(() => {
    const handleUpdate = () => fetchVows();
    window.addEventListener('vows_updated', handleUpdate);
    return () => window.removeEventListener('vows_updated', handleUpdate);
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
      
      let pendingVows = [];
      try {
        const stored = localStorage.getItem('pending_vows');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only keep pending vows that don't match exactly with a fetched confirmed vow
          pendingVows = parsed.filter((pending: any) => {
            return !fetchedVows.some(
              confirmed => confirmed.title === pending.title && 
                           confirmed.description === pending.description
            );
          });
          // Update local storage to remove confirmed ones
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
    userSession.signUserOut();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24 relative overflow-hidden bg-black text-white">
        <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
  const myVows = vows.filter(v => v.creator === userAddress);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24 relative overflow-hidden bg-black text-white">
      {/* Dynamic Network Nodes Overlay (Subtle for Dashboard) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />

      <section className="w-full max-w-6xl mt-8 mb-24 z-10 relative">
        <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-t-2 border-purple-500">
          <div>
            <h2 className="text-3xl font-bold font-bebas mb-2">WELCOME BACK.</h2>
            <p className="text-sm opacity-60 font-mono tracking-wider text-purple-300">
              {userAddress}
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 md:mt-0 px-8 py-3.5 bg-white text-black font-bold uppercase rounded-full tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] font-bebas flex items-center gap-2"
          >
            CREATE NEW VOW →
          </button>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white">YOUR ACTIVE VOWS</h3>
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
      </section>

      <CreateVowModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}
