import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { 
  callReadOnlyFunction, 
  cvToJSON, 
  principalCV, 
  uintCV, 
  someCV, 
  noneCV, 
  stringUtf8CV, 
  boolCV,
  ReadOnlyFunctionOptions 
} from '@stacks/transactions';


if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
  console.error('[deadlock] Missing NEXT_PUBLIC_CONTRACT_ADDRESS env var');
}
if (!process.env.NEXT_PUBLIC_NETWORK) {
  console.error('[deadlock] Missing NEXT_PUBLIC_NETWORK env var (expected "mainnet" or "testnet")');
}


const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
  ? new StacksMainnet() 
  : new StacksTestnet();

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
      console.warn(`[deadlock] Retry ${i + 1}/${attempts} after error:`, e);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const contractName = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'deadlock-clar';

export const getNetwork = () => network;

function cleanCV(obj: any): any {
  if (obj === null || obj === undefined) return null;
  
  if (typeof obj === 'object') {
    if ('type' in obj && obj.type && typeof obj.type === 'string' && obj.type.startsWith('(optional')) {
      if (obj.value === null || obj.value === undefined || obj.value === 'none') {
        return null;
      }
      return cleanCV(obj.value);
    }
    
    if ('type' in obj && obj.type && typeof obj.type === 'string' && obj.type.startsWith('(tuple')) {
      const tupleObj: any = {};
      for (const [k, v] of Object.entries(obj.value)) {
        const cleanedKey = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const cleanedVal = cleanCV(v);
        tupleObj[k] = cleanedVal;
        tupleObj[cleanedKey] = cleanedVal;
      }
      return tupleObj;
    }
    
    if ('type' in obj && 'value' in obj) {
      if (obj.type === 'uint' || obj.type === 'int') {
        return Number(obj.value);
      }
      if (obj.type === 'bool') {
        return obj.value === true || obj.value === 'true';
      }
      if (obj.type === 'principal') {
        return obj.value;
      }
      if (obj.type && (obj.type.startsWith('string') || obj.type.startsWith('(string'))) {
        return obj.value;
      }
      return cleanCV(obj.value);
    }
    
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedKey = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const cleanedVal = cleanCV(v);
      newObj[k] = cleanedVal;
      newObj[cleanedKey] = cleanedVal;
    }
    return newObj;
  }
  
  return obj;
}

export async function getVowCount(): Promise<number> {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-vow-count',
    functionArgs: [],
    network,
    senderAddress: contractAddress,
  };

  console.log('[contract] Fetching vow count');
  if (process.env.NODE_ENV !== 'production') console.debug('[contract] Fetching vow count');
  const result = await withRetry(() => callReadOnlyFunction(options), 5, 1000);
  const count = Number(cleanCV(cvToJSON(result)));
  if (process.env.NODE_ENV !== 'production') console.debug('[contract] Vow count fetched:', count);
  return count;
}

export async function getVow(vowId: number) {
  const args = [uintCV(Number(vowId))];
  if (process.env.NODE_ENV !== 'production') console.debug('[contract] Fetching vow', vowId);
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-vow',
    functionArgs: args,
    network,
    senderAddress: contractAddress,
  };

  try {
    const result = await withRetry(() => callReadOnlyFunction(options), 5, 1000);
    const vow = cleanCV(cvToJSON(result));
    if (process.env.NODE_ENV !== 'production') console.debug('[contract] Vow fetched:', vow);
    return vow;
  } catch (err) {
     
    throw new Error(`getVow(${vowId}) failed: ${String(err)}`);
  }
}

export async function getSpectatorPool(vowId: number) {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-spectator-pool',
    functionArgs: [uintCV(Number(vowId))],
    network,
    senderAddress: contractAddress,
  };

  try {
    const result = await withRetry(() => callReadOnlyFunction(options));
    return cleanCV(cvToJSON(result));
  } catch (err) {
    throw new Error(`getSpectatorPool(${vowId}) failed: ${String(err)}`);
  }
}

/**
 * Prevents the frontend from showing vote buttons to addresses that have
 * already cast a vote, avoiding failed duplicate-vote transactions.
 */
export async function getHasVoted(vowId: number, voterAddress: string): Promise<boolean> {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'has-voted',
    functionArgs: [uintCV(Number(vowId)), principalCV(voterAddress)],
    network,
    senderAddress: contractAddress,
  };

  try {
    const result = await withRetry(() => callReadOnlyFunction(options));
    return Boolean(cleanCV(cvToJSON(result)));
  } catch (err) {
    throw new Error(`getHasVoted(${vowId}, ${voterAddress}) failed: ${String(err)}`);
  }
}

export const contractDetails = {
  address: contractAddress,
  name: contractName,
};

let cachedBlockHeightPromise: Promise<number> | null = null;
let lastFetchTime = 0;

export function getCurrentBlockHeight(): Promise<number> {
  const now = Date.now();
  if (cachedBlockHeightPromise && (now - lastFetchTime < 60000)) {
    return cachedBlockHeightPromise;
  }
  
  lastFetchTime = now;
  cachedBlockHeightPromise = (async () => {
    try {
      const network = getNetwork();
      const apiBase = network.coreApiUrl || (process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so');
      const res = await fetch(`${apiBase}/v2/info`);
      if (res.ok) {
        const info = await res.json();
        if (info.stacks_tip_height) {
          return Number(info.stacks_tip_height);
        }
      }
    } catch (e) {
      console.error('Failed to fetch block height:', e);
    }
    return 165000; // Safe fallback
  })();
  
  return cachedBlockHeightPromise;
}

