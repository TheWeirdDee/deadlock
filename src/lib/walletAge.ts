const _cache = new Map<string, number | null>();

const HIRO_BASE =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_NETWORK === 'testnet'
    ? 'https://api.testnet.hiro.so'
    : 'https://api.mainnet.hiro.so';

export async function getWalletFirstBlock(address: string): Promise<number | null> {
  if (_cache.has(address)) return _cache.get(address)!;

  try {
    const key = process.env.NEXT_PUBLIC_HIRO_API_KEY;
    const headers: Record<string, string> = key ? { 'x-api-key': key } : {};
    const res = await fetch(
      `${HIRO_BASE}/extended/v1/address/${address}/transactions?limit=1&order=asc`,
      { headers }
    );
    if (!res.ok) { _cache.set(address, null); return null; }
    const data = await res.json();
    const firstBlock: number | null = data.results?.[0]?.block_height ?? null;
    _cache.set(address, firstBlock);
    return firstBlock;
  } catch {
    _cache.set(address, null);
    return null;
  }
}

export function walletAgeLabel(
  firstBlock: number | null,
  currentBlock: number
): { label: string; color: string; title: string } | null {
  if (firstBlock === null || currentBlock <= 0) return null;
  const blocksOld = currentBlock - firstBlock;
  const daysOld = Math.floor((blocksOld * 600) / 86400);

  if (daysOld < 7) {
    return { label: 'NEW', color: 'border-orange-400/50 text-orange-400 bg-orange-400/5', title: `Wallet ~${daysOld}d old — treat votes with caution` };
  }
  if (daysOld < 30) {
    return { label: '<30D', color: 'border-yellow-500/40 text-yellow-500 bg-yellow-500/5', title: `Wallet ~${daysOld} days old` };
  }
  return null;
}
