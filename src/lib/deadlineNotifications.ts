'use client';

const STORAGE_KEY = 'deadlock_notif_scheduled';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

interface ScheduledEntry {
  vowId: number;
  deadlineBlock: number;
  thresholdBlocks: number; // blocks before deadline when this fires
  firedAt: number; // timestamp when notification was sent (0 = not yet)
}

function loadScheduled(): ScheduledEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScheduled(entries: ScheduledEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function fireNotification(title: string, body: string, tag: string) {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/logo.png',
      badge: '/logo.png',
    });
  } catch {}
}

// Call this whenever the vow cache is refreshed or the page loads.
// It checks every scheduled notification and fires any that are now due.
export function checkAndFireDeadlineNotifications(
  currentBlock: number,
  userVows: Array<{ id: number; title: string; deadlineBlock: number; status: number }>
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const THRESHOLDS = [
    { blocks: 144, label: '~24 hours' },    // 1 day
    { blocks: 12, label: '~2 hours' },       // 2 hours
  ];

  const scheduled = loadScheduled();

  for (const vow of userVows) {
    if (vow.status !== 1) continue; // only active vows
    const blocksLeft = vow.deadlineBlock - currentBlock;
    if (blocksLeft < 0) continue; // already expired

    for (const threshold of THRESHOLDS) {
      const tag = `deadlock-vow-${vow.id}-${threshold.blocks}`;
      const existing = scheduled.find(s => s.vowId === vow.id && s.thresholdBlocks === threshold.blocks);

      // Fire if we're within the threshold window and haven't fired yet
      if (blocksLeft <= threshold.blocks && (!existing || existing.firedAt === 0)) {
        fireNotification(
          `⏳ VOW DEADLINE APPROACHING`,
          `"${vow.title}" — ${threshold.label} remaining (${blocksLeft} blocks). Submit proof or lose your stake.`,
          tag
        );
        if (existing) {
          existing.firedAt = Date.now();
        } else {
          scheduled.push({ vowId: vow.id, deadlineBlock: vow.deadlineBlock, thresholdBlocks: threshold.blocks, firedAt: Date.now() });
        }
      } else if (!existing) {
        // Register intent to notify when threshold is reached
        scheduled.push({ vowId: vow.id, deadlineBlock: vow.deadlineBlock, thresholdBlocks: threshold.blocks, firedAt: 0 });
      }
    }
  }

  // Prune stale entries (vows that are settled or far in the past)
  const activeIds = new Set(userVows.map(v => v.id));
  const pruned = scheduled.filter(s => activeIds.has(s.vowId));
  saveScheduled(pruned);
}

export function scheduleDeadlineReminders(
  currentBlock: number,
  userVows: Array<{ id: number; title: string; deadlineBlock: number; status: number }>
) {
  checkAndFireDeadlineNotifications(currentBlock, userVows);
}
