const CACHE_KEY = 'deadlock_vows_cache';

export interface VowCacheData {
  lastSyncedId: number;
  vows: any[];
}

export function loadVowCache(): VowCacheData {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.vows) && typeof parsed.lastSyncedId === 'number') {
        return parsed as VowCacheData;
      }
    }
  } catch {}
  return { lastSyncedId: 0, vows: [] };
}

export function saveVowCache(data: VowCacheData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function patchVowInCache(vow: any): void {
  const cache = loadVowCache();
  const idx = cache.vows.findIndex((v: any) => v.id === vow.id);
  if (idx >= 0) {
    cache.vows[idx] = vow;
  } else {
    cache.vows.push(vow);
    if (typeof vow.id === 'number' && vow.id > cache.lastSyncedId) {
      cache.lastSyncedId = vow.id;
    }
  }
  saveVowCache(cache);
}
