 'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SidebarLayout({ children, activePage }: { children: React.ReactNode, activePage: 'analytics' | 'dashboard' | 'docs' | 'feed' | 'leaderboard' | 'profile' | 'rivals' | 'status' }) {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  const userSessionRef = useRef<UserSession | null>(null);
  if (!userSessionRef.current && typeof window !== 'undefined') {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionRef.current = new UserSession({ appConfig });
  }
  const userSession = userSessionRef.current;

  useEffect(() => {
    if (userSession && userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleLogin = () => doOpenAuth();
  const handleLogout = () => {
    if (userSession) userSession.signUserOut();
    router.push('/');
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet || "SP...ADDRESS";

  if (!userData) {
    return (
      <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-4 md:px-12 md:pt-8 md:pb-12 lg:px-24 lg:pt-8 lg:pb-24 relative overflow-hidden bg-surface text-ink font-space">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
          <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />
        
        <div className="w-full flex-1 flex flex-col relative z-10 max-w-6xl pb-20 lg:pb-0">
          {children}
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-line bg-surface/95 backdrop-blur-md">
          {[
            { href: '/feed', label: 'Feed', page: 'feed', icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            )},
            { href: '/leaderboard', label: 'Board', page: 'leaderboard', icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            )},
            { href: '/analytics', label: 'Analytics', page: 'analytics', icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            )},
            { href: '/docs', label: 'Docs', page: 'docs', icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            )},
            { href: '/status', label: 'Status', page: 'status', icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            )},
          ].map(({ href, label, page, icon }) => {
            const isActive = activePage === page;
            return (
              <Link key={page} href={href} className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-widest uppercase transition-colors ${isActive ? 'text-purple-400' : 'text-ink-subtle hover:text-ink-muted'}`}>
                <span className={isActive ? 'text-purple-400' : ''}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-surface text-ink font-space relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <aside className="hidden lg:flex flex-col w-64 border-r border-line glass-card m-4 mr-0 rounded-r-none h-[calc(100vh-32px)]">
        <div className="p-6 border-b border-line">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 bg-purple-500 rotate-45 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[225deg]">
              <div className="w-3 h-3 bg-surface -rotate-45"></div>
            </div>
            <h1 className="text-2xl font-bold tracking-tighter font-bebas text-ink">DEADLOCK</h1>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          <div>
            <p className="text-[10px] text-ink-subtle uppercase tracking-widest mb-4 px-2">General</p>
            <ul className="space-y-1 text-sm font-bold tracking-widest text-ink-muted">
              <li>
                <Link href="/dashboard" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'dashboard' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/feed" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'feed' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Vows Feed
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'leaderboard' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/rivals" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'rivals' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Rival Discovery ⚔️
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <p className="text-[10px] text-ink-subtle uppercase tracking-widest mb-4 px-2">Tools</p>
            <ul className="space-y-1 text-sm font-bold tracking-widest text-ink-muted">
              <li>
                <Link href="/analytics" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'analytics' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/docs" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'docs' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  Developer Docs
                </Link>
              </li>
              <li>
                <Link href="/status" className={`flex items-center px-2 py-2 rounded-md transition-colors ${activePage === 'status' ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-surface-raised hover:text-ink'}`}>
                  System Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-line bg-surface-raised rounded-b-xl">
          <div className="flex items-center justify-between mb-2 px-2">
            <p className="text-[10px] text-ink-subtle uppercase tracking-widest">Profile</p>
            <ThemeToggle />
          </div>
          <div className="px-2">
            {userData ? (
              <Link href={`/profile/${userAddress}`} className={`text-xs font-mono truncate mb-2 block transition-colors ${activePage === 'profile' ? 'text-purple-400' : 'text-ink-muted hover:text-purple-400'}`} title="View Profile">
                {userAddress}
              </Link>
            ) : (
              <p className="text-xs font-mono text-ink-muted truncate mb-2">{userAddress}</p>
            )}
            <button onClick={handleLogout} className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Log out</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen relative z-10 pb-20 lg:pb-8">
        {children}
      </div>

      {/* Mobile / tablet bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-line bg-surface/95 backdrop-blur-md">
        {[
          { href: '/dashboard', label: 'Home', page: 'dashboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          )},
          { href: '/feed', label: 'Feed', page: 'feed', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          )},
          { href: '/leaderboard', label: 'Board', page: 'leaderboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          )},
          { href: '/analytics', label: 'Analytics', page: 'analytics', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          )},
          { href: `/profile/${userAddress}`, label: 'Profile', page: 'profile', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )},
        ].map(({ href, label, page, icon }) => {
          const isActive = activePage === page;
          return (
            <Link
              key={page}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-widest uppercase transition-colors ${
                isActive ? 'text-purple-400' : 'text-ink-subtle hover:text-ink-muted'
              }`}
            >
              <span className={isActive ? 'text-purple-400' : ''}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
