import { StacksMainnet, StacksTestnet } from '@stacks/network';
import {
  callReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  ReadOnlyFunctionOptions,
} from '@stacks/transactions';
import {
  Vow,
  SpectatorPool,
  SpectatorBet,
  DeadlockClientConfig,
  VowType,
  VowStatus,
} from './types';

const DEFAULT_MAINNET_ADDRESS = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV';
const DEFAULT_CONTRACT_NAME = 'deadlock-clar';

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i) + Math.random() * 100));
    }
  }
  throw lastError;
}

function cleanCV(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;

  const o = obj as Record<string, unknown>;

  if ('type' in o && typeof o['type'] === 'string') {
    if (o['type'].startsWith('(optional')) {
      if (o['value'] === null || o['value'] === undefined || o['value'] === 'none') return null;
      return cleanCV(o['value']);
    }
    if (o['type'].startsWith('(tuple')) {
      const t: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o['value'] as Record<string, unknown>)) {
        const ck = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        t[k] = cleanCV(v);
        t[ck] = cleanCV(v);
      }
      return t;
    }
    if ('value' in o) {
      if (o['type'] === 'uint' || o['type'] === 'int') return Number(o['value']);
      if (o['type'] === 'bool') return o['value'] === true || o['value'] === 'true';
      if (o['type'] === 'principal') return o['value'];
      if (typeof o['type'] === 'string' && (o['type'].startsWith('string') || o['type'].startsWith('(string'))) return o['value'];
      return cleanCV(o['value']);
    }
  }

  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const ck = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    r[k] = cleanCV(v);
    r[ck] = cleanCV(v);
  }
  return r;
}

function toVow(raw: Record<string, unknown>, id: number): Vow {
  return {
    id,
    creator: String(raw['creator'] ?? ''),
    title: String(raw['title'] ?? ''),
    description: String(raw['description'] ?? ''),
    vowType: Number(raw['vowType'] ?? raw['vow-type'] ?? 0) as VowType,
    stakeAmount: Number(raw['stakeAmount'] ?? raw['stake-amount'] ?? 0),
    deadlineBlock: Number(raw['deadlineBlock'] ?? raw['deadline-block'] ?? 0),
    status: Number(raw['status'] ?? 0) as VowStatus,
    rival: (raw['rival'] as string | null) ?? null,
    causeWallet: (raw['causeWallet'] ?? raw['cause-wallet'] ?? null) as string | null,
    rivalStake: Number(raw['rivalStake'] ?? raw['rival-stake'] ?? 0),
    createdAt: Number(raw['createdAt'] ?? raw['created-at'] ?? 0),
    settledAt: raw['settledAt'] != null ? Number(raw['settledAt']) : (raw['settled-at'] != null ? Number(raw['settled-at']) : null),
    proofUrl: (raw['proofUrl'] ?? raw['proof-url'] ?? null) as string | null,
    challengeEndBlock: raw['challengeEndBlock'] != null
      ? Number(raw['challengeEndBlock'])
      : raw['challenge-end-block'] != null
      ? Number(raw['challenge-end-block'])
      : null,
    yesVotes: Number(raw['yesVotes'] ?? raw['yes-votes'] ?? 0),
    noVotes: Number(raw['noVotes'] ?? raw['no-votes'] ?? 0),
  };
}

export class DeadlockClient {
  private readonly network: StacksMainnet | StacksTestnet;
  private readonly contractAddress: string;
  private readonly contractName: string;
  private readonly apiBase: string;

  constructor(config: DeadlockClientConfig = {}) {
    const isMainnet = (config.network ?? 'mainnet') === 'mainnet';
    this.network = isMainnet ? new StacksMainnet() : new StacksTestnet();
    this.contractAddress = config.contractAddress ?? DEFAULT_MAINNET_ADDRESS;
    this.contractName = config.contractName ?? DEFAULT_CONTRACT_NAME;
    this.apiBase = isMainnet ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
  }

  private baseOptions(): Pick<ReadOnlyFunctionOptions, 'contractAddress' | 'contractName' | 'network' | 'senderAddress'> {
    return {
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      network: this.network,
      senderAddress: this.contractAddress,
    };
  }

  /** Total number of vows created on-chain. */
  async getVowCount(): Promise<number> {
    const result = await withRetry(() =>
      callReadOnlyFunction({ ...this.baseOptions(), functionName: 'get-vow-count', functionArgs: [] })
    );
    return Number(cleanCV(cvToJSON(result)));
  }

  /** Fetch a single vow by ID. Returns null if not found. */
  async getVow(vowId: number): Promise<Vow | null> {
    const result = await withRetry(() =>
      callReadOnlyFunction({ ...this.baseOptions(), functionName: 'get-vow', functionArgs: [uintCV(vowId)] })
    );
    const raw = cleanCV(cvToJSON(result)) as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return null;
    return toVow(raw, vowId);
  }

  /** Fetch spectator pool totals for a vow. */
  async getSpectatorPool(vowId: number): Promise<SpectatorPool> {
    const result = await withRetry(() =>
      callReadOnlyFunction({ ...this.baseOptions(), functionName: 'get-spectator-pool', functionArgs: [uintCV(vowId)] })
    );
    const raw = cleanCV(cvToJSON(result)) as Record<string, unknown>;
    return {
      successPool: Number(raw['successPool'] ?? raw['success-pool'] ?? 0),
      failurePool: Number(raw['failurePool'] ?? raw['failure-pool'] ?? 0),
    };
  }

  /** Fetch a spectator's bet on a vow. Returns null if no bet placed. */
  async getSpectatorBet(vowId: number, spectator: string): Promise<SpectatorBet | null> {
    const result = await withRetry(() =>
      callReadOnlyFunction({
        ...this.baseOptions(),
        functionName: 'get-spectator-bet',
        functionArgs: [uintCV(vowId), principalCV(spectator)],
      })
    );
    const raw = cleanCV(cvToJSON(result)) as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return null;
    return {
      amount: Number(raw['amount'] ?? 0),
      prediction: Boolean(raw['prediction']),
      claimed: Boolean(raw['claimed']),
    };
  }

  /** Check whether an address has already voted on a challenged vow. */
  async hasVoted(vowId: number, voter: string): Promise<boolean> {
    const result = await withRetry(() =>
      callReadOnlyFunction({
        ...this.baseOptions(),
        functionName: 'has-voted',
        functionArgs: [uintCV(vowId), principalCV(voter)],
      })
    );
    return Boolean(cleanCV(cvToJSON(result)));
  }

  /** Current Stacks tip block height from the Hiro API. */
  async getCurrentBlockHeight(): Promise<number> {
    const res = await fetch(`${this.apiBase}/v2/info`);
    if (!res.ok) throw new Error(`Hiro API error: HTTP ${res.status}`);
    const info = await res.json() as Record<string, unknown>;
    const height = info['stacks_tip_height'];
    if (typeof height === 'number') return height;
    throw new Error('stacks_tip_height missing from /v2/info response');
  }

  /** Fetch all vows from chain (paginated by iterating from 1 to count). */
  async getAllVows(options: { onProgress?: (fetched: number, total: number) => void } = {}): Promise<Vow[]> {
    const count = await this.getVowCount();
    const vows: Vow[] = [];
    for (let i = 1; i <= count; i++) {
      try {
        const vow = await this.getVow(i);
        if (vow) vows.push(vow);
      } catch {
        // skip unfetchable vow
      }
      options.onProgress?.(i, count);
      if (i < count) await new Promise(r => setTimeout(r, 200));
    }
    return vows;
  }
}
