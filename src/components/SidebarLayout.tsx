'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

/**
 * SidebarLayout component containing side navigation menu for authenticated users,
 * and a standard page container wrapping core children views.
 * @param children - Active page children layout
 * @param activePage - Parameter denoting highlighted navigation button
 */
export function SidebarLayout({ children, activePage }: { children: React.ReactNode, activePage: 'analytics' | 'dashboard' | 'docs' | 'feed' | 'leaderboard' }) {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleLogin = () => doOpenAuth();
  const handleLogout = () => {
    userSession.signUserOut();
    router.push('/');
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet || "SP...ADDRESS";

  if (!userData) {
    return (
      <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-4 md:px-12 md:pt-8 md:pb-12 lg:px-24 lg:pt-8 lg:pb-24 relative overflow-hidden bg-black text-white font-space">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
          <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />
        
        <div className="w-full flex-1 flex flex-col relative z-10 max-w-6xl">
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-black text-white font-space relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Sidebar Navigation (Only show if logged in) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 glass-card m-4 mr-0 rounded-r-none h-[calc(100vh-32px)]">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 bg-purple-500 rotate-45 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[225deg]">
              <div className="w-3 h-3 bg-black -rotate-45"></div>
            </div>
            <h1 className="text-2xl font-bold tracking-tighter font-bebas text-white">DEADLOCK</h1>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 px-2">General</p>
            <ul className="space-y-1 text-sm font-bold tracking-widest text-gray-400">
              <li>
                <Link href="/dashboard" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'dashboard' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 hover:text-white'}`}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/feed" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'feed' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 hover:text-white'}`}>
                  Vows Feed
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'leaderboard' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 hover:text-white'}`}>
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 px-2">Tools</p>
            <ul className="space-y-1 text-sm font-bold tracking-widest text-gray-400">
              <li>
                <Link href="/analytics" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'analytics' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 hover:text-white'}`}>
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/docs" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'docs' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 hover:text-white'}`}>
                  Developer Docs
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 px-2">Profile</p>
          <div className="px-2">
            <p className="text-xs font-mono text-gray-400 truncate mb-2">{userAddress}</p>
            <button onClick={handleLogout} className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Log out</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen relative z-10">
        {children}
      </div>
    </main>
  );
}
