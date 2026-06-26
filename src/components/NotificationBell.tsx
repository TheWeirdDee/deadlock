'use client';

import { useState } from 'react';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/deadlineNotifications';
import { useToast } from '@/components/Toast';

export function NotificationBell() {
  const { toast } = useToast();
  const [perm, setPerm] = useState<string>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    return getNotificationPermission();
  });

  if (perm === 'unsupported') return null;

  const handleClick = async () => {
    if (perm === 'granted') {
      toast('Deadline reminders are active. You\'ll be notified 24h and 2h before each vow expires.', 'info');
      return;
    }
    if (perm === 'denied') {
      toast('Notifications blocked by browser. Allow them in browser settings to enable reminders.', 'error');
      return;
    }
    const granted = await requestNotificationPermission();
    setPerm(granted ? 'granted' : 'denied');
    if (granted) {
      toast('Deadline reminders enabled — you\'ll get notified before vows expire.', 'success');
    } else {
      toast('Notification permission denied.', 'error');
    }
  };

  return (
    <button
      onClick={handleClick}
      title={perm === 'granted' ? 'Reminders active' : 'Enable deadline reminders'}
      className={`relative p-2 rounded-full border transition-all duration-200 ${
        perm === 'granted'
          ? 'border-purple-500/50 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
          : 'border-line text-ink-subtle bg-white/5 hover:border-white/30 hover:text-white'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {perm === 'granted' && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full" />
      )}
    </button>
  );
}
