'use client';

import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('deadlock_theme');
    if (stored === 'light') {
      document.documentElement.classList.add('light');
      setLight(true);
    }
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.classList.add('light');
      localStorage.setItem('deadlock_theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('deadlock_theme', 'dark');
    }
  };

  return (
    <button
      onClick={toggle}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      className="w-8 h-8 flex items-center justify-center rounded-full border border-line hover:bg-surface-raised transition-all text-ink-muted hover:text-ink"
    >
      {light ? (
        /* Moon — switch to dark */
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      ) : (
        /* Sun — switch to light */
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      )}
    </button>
  );
}
