 'use client';

// Docs: Header navigation and wallet controls (annotation)

import Link from 'next/link';

interface HeaderProps {
  /** User session data containing profile information and wallets */
  userData: any;
  /** Function triggered to authenticate wallet via stacks connect */
  handleLogin: () => void;
  /** Function triggered to sign out user and clear storage */
  handleLogout: () => void;
}

/**
 * Header navigation bar containing general layout controls, logo, links,
 * and standard Stacks wallet Connect authentication buttons.
 */
export function Header({ userData, handleLogin, handleLogout }: HeaderProps) {
  return (
    <header className="w-full max-w-6xl flex justify-between items-center mb-8 relative z-30">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 bg-purple-600 rotate-45 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[225deg]">
          <div className="w-4 h-4 bg-purple-200 -rotate-45"></div>
        </div>
        <h1 className="text-3xl font-bold tracking-tighter font-bebas text-white">DEADLOCK</h1>
      </Link>
      
      {/* Navigation Links - Centered */}
      <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest text-gray-400">
        <Link href="/#feed" className="hover:text-white transition-colors relative py-1 group">
          VOWS FEED
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/leaderboard" className="hover:text-white transition-colors relative py-1 group">
          LEADERBOARD
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/analytics" className="hover:text-white transition-colors relative py-1 group">
          ANALYTICS
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/docs" className="hover:text-white transition-colors relative py-1 group">
          DEVELOPER DOCS
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
        </Link>
      </nav>
      
      <div className="flex gap-4 items-center">
        {userData ? (
          <div className="flex gap-4 items-center">
            <Link href="/dashboard" className="text-xs bg-white/5 border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-colors text-white hidden md:block tracking-widest font-bold">
              DASHBOARD
            </Link>
            <button onClick={handleLogout} className="text-xs font-bold tracking-widest uppercase hover:text-white text-gray-400 transition-colors">
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin} 
            className="text-xs font-bold tracking-widest uppercase px-6 py-2.5 bg-white text-black rounded-full hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
