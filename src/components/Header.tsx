'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  userData: any;
  handleLogin: () => void;
  handleLogout: () => void;
}

export function Header({ userData, handleLogin, handleLogout }: HeaderProps) {
  return (
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 relative z-30">
        <Link href="/" aria-label="Deadlock home" className="flex items-center gap-3 group">
        <div className="w-8 h-8 bg-purple-600 rotate-45 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[225deg]">
          <div className="w-4 h-4 bg-purple-200 -rotate-45"></div>
        </div>
        <h1 className="text-3xl font-bold tracking-tighter font-bebas text-ink">DEADLOCK</h1>
      </Link>

      <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest text-ink-muted">
        <Link href="/#feed" className="hover:text-ink transition-colors relative py-1 group">
          VOWS FEED
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-ink transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/leaderboard" className="hover:text-ink transition-colors relative py-1 group">
          LEADERBOARD
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-ink transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/analytics" className="hover:text-ink transition-colors relative py-1 group">
          ANALYTICS
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-ink transition-all duration-300 group-hover:w-full"></span>
        </Link>
        <Link href="/docs" className="hover:text-ink transition-colors relative py-1 group">
          DEVELOPER DOCS
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-ink transition-all duration-300 group-hover:w-full"></span>
        </Link>
      </nav>

      <div className="flex gap-3 items-center">
        <ThemeToggle />
        <NotificationBell />
        {userData ? (
          <div className="flex gap-3 items-center">
            <Link href="/dashboard" className="text-xs bg-surface-raised border border-line rounded-full px-4 py-2 hover:bg-surface-hover transition-colors text-ink hidden md:block tracking-widest font-bold">
              DASHBOARD
            </Link>
          <button
            onClick={handleLogout}
            aria-label="Disconnect wallet and sign out"
            className="text-xs font-bold tracking-widest uppercase hover:text-ink text-ink-muted transition-colors"
          >
            Logout
          </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="text-xs font-bold tracking-widest uppercase px-6 py-2.5 bg-ink text-surface rounded-full hover:opacity-85 transition-all active:scale-95 shadow-[0_0_20px_rgba(128,128,128,0.15)]"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
