'use client';

import { useState, useEffect } from 'react';

let _cachedPrice: number | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function useSTXPrice(): number | null {
  const [price, setPrice] = useState<number | null>(_cachedPrice);

  useEffect(() => {
    const now = Date.now();
    if (_cachedPrice !== null && now - _cacheTime < CACHE_TTL) {
      setPrice(_cachedPrice);
      return;
    }

    fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd')
      .then(r => r.json())
      .then(data => {
        const p = data?.blockstack?.usd;
        if (typeof p === 'number' && p > 0) {
          _cachedPrice = p;
          _cacheTime = Date.now();
          setPrice(p);
        }
      })
      .catch(() => {});
  }, []);

  return price;
}

export function formatUSD(stx: number, price: number | null): string | null {
  if (price === null || stx === 0) return null;
  const usd = stx * price;
  if (usd < 0.01) return '<$0.01';
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(2)}`;
}
