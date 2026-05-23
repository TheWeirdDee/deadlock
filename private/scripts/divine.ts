/* eslint-disable no-console */
/**
 * deadlock-farmer.ts - drive 50 wallets through deadlock's
 * ungated public functions. Targets ~500 successful tx across 3 days
 * (today, tomorrow, day after) without burning past per-wallet 0.03 STX.
 *
 * Action set:
 *   - vote-yes  Votes true on a vow
 *   - vote-no   Votes false on a vow
 *
 * Run repeatedly to simulate community sentiment. State persists between runs.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { StacksMainnet, StacksTestnet } from '@stacks/network';
import {
  AnchorMode,
  getAddressFromPrivateKey,
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
  standardPrincipalCV,
  stringAsciiCV,
  uintCV,
  trueCV,
  falseCV,
  noneCV,
  someCV,
  stringUtf8CV,
  type ClarityValue,
  callReadOnlyFunction,
  cvToJSON,
} from '@stacks/transactions';

type StacksNetworkName = 'mainnet' | 'testnet';

const DEPLOYER = (process.env.FRIEND_DEPLOYER || 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV').trim();
// Both deployed contracts — alternate between them to maximize unique callers per contract
const TARGET_CONTRACTS: string[] = (
  process.env.DEADLOCK_CONTRACT
    ? [process.env.DEADLOCK_CONTRACT.trim()]
    : ['deadlock-clar']
);

const NETWORK_NAME = (process.env.STACKS_NETWORK || 'mainnet') as StacksNetworkName;
const STACKS_NETWORK = NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const HIRO_API = (process.env.HIRO_API_BASE || (NETWORK_NAME === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so')).replace(/\/+$/, '');
const STACKS_API_KEY = process.env.STACKS_API_KEY || process.env.HIRO_API_KEY || '';

const KEYS_CSV = process.env.FRIEND_KEYS_CSV || path.join(process.cwd(), 'private', 'scripts', 'divine-keys.csv');
const STATE_PATH = process.env.FRIEND_STATE || path.join(process.cwd(), 'private', 'scripts', 'state', 'friend-progress.json');
const LOG_PATH = process.env.FRIEND_LOG || path.join(process.cwd(), 'private', 'scripts', 'state', 'friend-farmer.log');


const WORKERS = Number(process.env.WORKERS || 1);
const SLEEP_MIN_MS = Number(process.env.SLEEP_MIN_MS || 60_000);
const SLEEP_MAX_MS = Number(process.env.SLEEP_MAX_MS || 90_000);
const BASE_FEE_USTX = BigInt(process.env.BASE_FEE_USTX || '3000');
const FEE_JITTER_PCT = Number(process.env.FEE_JITTER_PCT || 0.15);
const SAFE_FEE_USTX = BigInt(process.env.SAFE_FEE_USTX || '4000');

const VOTE_COOLDOWN_MS = 5 * 60 * 1000;         // 5 min buffer

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const randInt = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T>(arr: readonly T[]): T => {
  if (arr.length === 0) throw new Error('pick(empty)');
  return arr[Math.floor(Math.random() * arr.length)];
};

function jitteredFee(base: bigint, pct: number): bigint {
  const mult = 1 + (Math.random() * 2 - 1) * pct;
  return BigInt(Math.max(1000, Math.round(Number(base) * mult)));
}

function randomVowTitle(): string {
  const words = ['Ship', 'Deploy', 'Code', 'Debug', 'Refactor', 'Verify', 'Launch', 'Solve', 'Optimize', 'Test'];
  const nouns = ['Frontend', 'Backend', 'Database', 'Contract', 'AI Agent', 'System', 'API', 'App', 'Script', 'Feature'];
  const seed = crypto.randomBytes(2).toString('hex');
  return `${pick(words)} ${pick(nouns)} #${seed}`;
}

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

type Wallet = { index: number; address: string; privateKey: string };

type WalletState = {
  lastVoteTs: number;
  votesCast: number;
};

type VowState = {
  id: number;
  creator: string;
  vowType: number;
  stakeAmount: number;
  rival: string | null;
  causeWallet: string | null;
  status: number;
  rivalStake: number;
  deadlineBlock: number;
  challengeEndBlock: number | null;
};

type State = {
  startedAt: string;
  walletsState: Record<number, WalletState>;
  vowsState: Record<number, VowState>;
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
};

let logStream: ReturnType<typeof createWriteStream> | null = null;
function log(line: string): void {
  console.log(line);
  if (logStream) logStream.write(line + '\n');
}

function apiHeaders(extra: Record<string, string> = {}): HeadersInit {
  const h: Record<string, string> = { ...extra };
  if (STACKS_API_KEY) h['x-api-key'] = STACKS_API_KEY;
  return h;
}

function hexToBigInt(h: string | undefined): bigint {
  if (!h) return BigInt(0);
  return BigInt(h.startsWith('0x') ? h : '0x' + h);
}

async function fetchAccount(address: string): Promise<{ ustx: bigint; nonce: bigint }> {
  const res = await fetch(`${HIRO_API}/v2/accounts/${address}?proof=0`, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${address}`);
  const j = (await res.json()) as { balance?: string; nonce?: number };
  return {
    ustx: hexToBigInt(j.balance),
    nonce: BigInt(j.nonce ?? 0),
  };
}

async function broadcast(tx: any): Promise<string> {
  const result = await broadcastTransaction(tx, STACKS_NETWORK);
  if (!result.txid) throw new Error('No txid in broadcast result');
  return result.txid;
}

async function loadWallets(): Promise<Wallet[]> {
  const raw = await readFile(KEYS_CSV, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('index,'));
  const wallets: Wallet[] = [];
  for (const line of lines) {
    const [idxRaw, address, privateKey] = line.split(',').map((s) => s.trim());
    if (!address || !privateKey) continue;
    const derived = getAddressFromPrivateKey(privateKey, STACKS_NETWORK.version);
    if (derived !== address) {
      throw new Error(`wallet ${idxRaw} address mismatch: derived=${derived} csv=${address}`);
    }
    wallets.push({ index: Number(idxRaw), address, privateKey });
  }
  return wallets;
}

async function loadState(): Promise<State | null> {
  try {
    const s = JSON.parse(await readFile(STATE_PATH, 'utf8')) as State;
    if (!s.vowsState) s.vowsState = {};
    return s;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function saveState(s: State): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(s, null, 2));
}

function ensureWalletState(s: State, idx: number): WalletState {
  if (!s.walletsState[idx]) {
    s.walletsState[idx] = {
      lastVoteTs: 0,
      votesCast: 0,
    };
  }
  return s.walletsState[idx];
}

type ActionKind = 'vote-yes' | 'vote-no' | 'create-vow' | 'submit-completion' | 'accept-rival-vow' | 'spectate' | 'finalize' | 'claim-failure' | 'claim-winnings';
type Action = {
  kind: ActionKind;
  functionName: string;
  args: ClarityValue[];
  contractName: string;
};

async function pickEligibleAction(
  self: Wallet,
  selfState: WalletState,
  pool: Wallet[],
  now: number,
  maxVowId: number,
  vowsState: Record<number, VowState>,
  blockHeight: number
): Promise<Action | null> {
  // Check if wallet is in vote cooldown
  if (now - selfState.lastVoteTs < VOTE_COOLDOWN_MS) {
    return null;
  }

  const candidates: Action[] = [];
  const contractName = TARGET_CONTRACTS[0];

  // 1. create-vow (always a candidate)
  candidates.push({
    kind: 'create-vow',
    functionName: 'create-vow',
    contractName,
    args: [], // Will generate details when chosen
  });

  // 2. accept-rival-vow
  for (const v of Object.values(vowsState)) {
    if (
      v.vowType === 2 &&
      v.status === 1 &&
      v.rival === self.address &&
      v.rivalStake === 0 &&
      blockHeight < v.deadlineBlock
    ) {
      candidates.push({
        kind: 'accept-rival-vow',
        functionName: 'accept-rival-vow',
        contractName,
        args: [uintCV(v.id), uintCV(v.stakeAmount)],
      });
    }
  }

  // 3. submit-completion
  for (const v of Object.values(vowsState)) {
    if (
      v.creator === self.address &&
      v.status === 1 &&
      blockHeight <= v.deadlineBlock
    ) {
      candidates.push({
        kind: 'submit-completion',
        functionName: 'submit-completion',
        contractName,
        args: [uintCV(v.id), stringUtf8CV("https://proof.com")],
      });
    }
  }

  // 4. vote-yes / vote-no
  const challengedVows = Object.values(vowsState).filter(
    (v) => v.status === 4 && (v.challengeEndBlock === null || blockHeight < v.challengeEndBlock)
  );
  for (const v of challengedVows) {
    try {
      const votedResult = await callReadOnlyFunction({
        contractAddress: DEPLOYER,
        contractName,
        functionName: 'has-voted',
        functionArgs: [uintCV(v.id), standardPrincipalCV(self.address)],
        network: STACKS_NETWORK,
        senderAddress: self.address,
      });
      const voted = cleanCV(cvToJSON(votedResult));
      if (!voted) {
        candidates.push({
          kind: 'vote-yes',
          functionName: 'vote-on-vow',
          contractName,
          args: [uintCV(v.id), trueCV()],
        });
        candidates.push({
          kind: 'vote-no',
          functionName: 'vote-on-vow',
          contractName,
          args: [uintCV(v.id), falseCV()],
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // 5. spectate
  const activeVows = Object.values(vowsState).filter(
    (v) => v.status === 1 && blockHeight < v.deadlineBlock
  );
  const sampleActiveVows = activeVows.slice(0, 3);
  for (const v of sampleActiveVows) {
    try {
      const betResult = await callReadOnlyFunction({
        contractAddress: DEPLOYER,
        contractName,
        functionName: 'get-spectator-bet',
        functionArgs: [uintCV(v.id), standardPrincipalCV(self.address)],
        network: STACKS_NETWORK,
        senderAddress: self.address,
      });
      const cleanedBet = cleanCV(cvToJSON(betResult));
      if (cleanedBet === null) {
        const prediction = Math.random() > 0.5;
        const betAmount = randInt(100, 500);
        candidates.push({
          kind: 'spectate',
          functionName: 'spectate',
          contractName,
          args: [uintCV(v.id), prediction ? trueCV() : falseCV(), uintCV(betAmount)],
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // 6. finalize
  for (const v of Object.values(vowsState)) {
    if (
      v.status === 4 &&
      v.challengeEndBlock !== null &&
      blockHeight >= v.challengeEndBlock
    ) {
      candidates.push({
        kind: 'finalize',
        functionName: 'finalize-challenged-vow',
        contractName,
        args: [uintCV(v.id)],
      });
    }
  }

  // 7. claim-failure
  for (const v of Object.values(vowsState)) {
    if (
      v.status === 1 &&
      blockHeight > v.deadlineBlock
    ) {
      candidates.push({
        kind: 'claim-failure',
        functionName: 'claim-failure',
        contractName,
        args: [uintCV(v.id)],
      });
    }
  }

  // 8. claim-winnings
  const settledVows = Object.values(vowsState).filter(
    (v) => v.status === 2 || v.status === 3
  );
  const sampleSettledVows = settledVows.slice(0, 3);
  for (const v of sampleSettledVows) {
    try {
      const betResult = await callReadOnlyFunction({
        contractAddress: DEPLOYER,
        contractName,
        functionName: 'get-spectator-bet',
        functionArgs: [uintCV(v.id), standardPrincipalCV(self.address)],
        network: STACKS_NETWORK,
        senderAddress: self.address,
      });
      const cleanedBet = cleanCV(cvToJSON(betResult));
      if (cleanedBet && !cleanedBet.claimed) {
        const prediction = cleanedBet.prediction;
        const vowSucceeded = v.status === 2;
        if (prediction === vowSucceeded) {
          candidates.push({
            kind: 'claim-winnings',
            functionName: 'claim-spectator-winnings',
            contractName,
            args: [uintCV(v.id)],
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (candidates.length === 0) return null;
  const chosen = pick(candidates);

  if (chosen.kind === 'create-vow') {
    const vowType = randInt(1, 3);
    const otherWallet = pick(pool.filter(w => w.address !== self.address));
    const rivalVal = vowType === 2 ? someCV(standardPrincipalCV(otherWallet.address)) : noneCV();
    const causeVal = vowType === 3 ? someCV(standardPrincipalCV(otherWallet.address)) : noneCV();
    chosen.args = [
      stringUtf8CV(randomVowTitle()),
      stringUtf8CV("Farming description"),
      uintCV(vowType),
      uintCV(2000), // 0.002 STX
      uintCV(blockHeight + randInt(144, 288)),
      rivalVal,
      causeVal
    ];
  }

  return chosen;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function main(): Promise<void> {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  logStream = createWriteStream(LOG_PATH, { flags: 'a' });

  log(`\n=== deadlock-farmer ${new Date().toISOString()} ===`);
  log(`api=${HIRO_API}  contract=${DEPLOYER}.${TARGET_CONTRACTS[0]}`);

  const wallets = await loadWallets();
  log(`loaded ${wallets.length} wallets from ${KEYS_CSV}`);

  const state: State = (await loadState()) ?? {
    startedAt: new Date().toISOString(),
    walletsState: {},
    vowsState: {},
    totalAttempted: 0,
    totalSucceeded: 0,
    totalFailed: 0,
  };

  async function fetchBlockHeight(): Promise<number> {
    const res = await fetch(`${HIRO_API}/v2/info`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status} info`);
    const j = (await res.json()) as { stacks_tip_height: number };
    return j.stacks_tip_height;
  }

  let maxVowId = 0;
  const vowsState: Record<number, VowState> = state.vowsState || {};

  async function syncVowsState(): Promise<number> {
    const blockHeight = await fetchBlockHeight();
    
    // 1. Fetch max vow ID
    const result = await callReadOnlyFunction({
      contractAddress: DEPLOYER,
      contractName: TARGET_CONTRACTS[0],
      functionName: 'get-vow-count',
      functionArgs: [],
      network: STACKS_NETWORK,
      senderAddress: DEPLOYER,
    });
    const chainMaxId = Number(cvToJSON(result).value);
    
    // 2. Fetch details for new vows
    for (let i = maxVowId + 1; i <= chainMaxId; i++) {
      try {
        const vowResult = await callReadOnlyFunction({
          contractAddress: DEPLOYER,
          contractName: TARGET_CONTRACTS[0],
          functionName: 'get-vow',
          functionArgs: [uintCV(i)],
          network: STACKS_NETWORK,
          senderAddress: DEPLOYER,
        });
        const cleaned = cleanCV(cvToJSON(vowResult));
        if (cleaned) {
          vowsState[i] = {
            id: i,
            creator: cleaned.creator,
            vowType: cleaned.vowType,
            stakeAmount: cleaned.stakeAmount,
            rival: cleaned.rival,
            causeWallet: cleaned.causeWallet,
            status: cleaned.status,
            rivalStake: cleaned.rivalStake,
            deadlineBlock: cleaned.deadlineBlock,
            challengeEndBlock: cleaned.challengeEndBlock,
          };
        }
      } catch (err) {
        log(`failed to fetch vow ${i}: ${err}`);
      }
    }
    
    // 3. Re-fetch details for any vow that is currently non-terminal (status 1 or 4)
    for (const [idStr, vow] of Object.entries(vowsState)) {
      const id = Number(idStr);
      if (vow.status === 1 || vow.status === 4) {
        try {
          const vowResult = await callReadOnlyFunction({
            contractAddress: DEPLOYER,
            contractName: TARGET_CONTRACTS[0],
            functionName: 'get-vow',
            functionArgs: [uintCV(id)],
            network: STACKS_NETWORK,
            senderAddress: DEPLOYER,
          });
          const cleaned = cleanCV(cvToJSON(vowResult));
          if (cleaned) {
            vowsState[id] = {
              id,
              creator: cleaned.creator,
              vowType: cleaned.vowType,
              stakeAmount: cleaned.stakeAmount,
              rival: cleaned.rival,
              causeWallet: cleaned.causeWallet,
              status: cleaned.status,
              rivalStake: cleaned.rivalStake,
              deadlineBlock: cleaned.deadlineBlock,
              challengeEndBlock: cleaned.challengeEndBlock,
            };
          }
        } catch (err) {
          log(`failed to re-sync vow ${id}: ${err}`);
        }
      }
    }
    
    maxVowId = chainMaxId;
    state.vowsState = vowsState;
    return blockHeight;
  }

  // Initial Sync
  try {
    log(`running initial sync...`);
    const initialHeight = await syncVowsState();
    log(`initial sync ok: maxVowId=${maxVowId} height=${initialHeight}`);
  } catch (e) {
    log(`failed to perform initial sync: ${e}`);
  }

  const nonceCache = new Map<string, bigint>();
  const nonceLocks = new Map<string, boolean>();


  async function withNonce<T>(addr: string, fn: (n: bigint) => Promise<T>): Promise<T> {
    while (nonceLocks.get(addr)) {
      await sleep(200 + Math.random() * 300);
    }
    nonceLocks.set(addr, true);
    try {
      let n = nonceCache.get(addr);
      if (n === undefined) {
        const info = await fetchAccount(addr);
        n = info.nonce;
      }
      try {
        const r = await fn(n);
        nonceCache.set(addr, n + BigInt(1));
        return r;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/ConflictingNonce|BadNonce|NonceMismatch/i.test(msg)) {
          const refreshed = await fetchAccount(addr);
          nonceCache.set(addr, refreshed.nonce);
          const r = await fn(refreshed.nonce);
          nonceCache.set(addr, refreshed.nonce + BigInt(1));
          return r;
        }
        throw err;
      }
    } finally {
      nonceLocks.set(addr, false);
    }
  }


  // Balance cache: lazy-load + debit on success so we skip drained wallets.
  const balCache = new Map<string, bigint>();
  async function getBalance(addr: string): Promise<bigint> {
    let b = balCache.get(addr);
    if (b !== undefined) return b;
    try {
      const info = await fetchAccount(addr);
      b = info.ustx;
      balCache.set(addr, b);
      return b;
    } catch {
      return BigInt(0);
    }
  }

  const stop = { stopped: false };
  process.on('SIGINT', () => {
    if (!stop.stopped) {
      log('\n[shutdown] SIGINT - draining...');
      stop.stopped = true;
    }
  });

  function anyWalletEligibleNow(): boolean {
    const now = Date.now();
    for (const w of wallets) {
      const ws = ensureWalletState(state, w.index);
      const bal = balCache.get(w.address);
      if (bal !== undefined && bal < SAFE_FEE_USTX) continue;
      if (now - ws.lastVoteTs >= VOTE_COOLDOWN_MS) return true;
    }
    return false;
  }

  async function workerLoop(workerId: number): Promise<void> {
    while (!stop.stopped) {
      const w = pick(wallets);
      const ws = ensureWalletState(state, w.index);

      const bal = await getBalance(w.address);
      if (bal < SAFE_FEE_USTX) {
        // wallet drained; sleep briefly, try another
        if (!anyWalletEligibleNow()) {
          log(`[w${workerId}] all wallets drained or in cooldown - exiting`);
          stop.stopped = true;
          break;
        }
        await sleep(300);
        continue;
      }

      let blockHeight = 0;
      try {
        blockHeight = await syncVowsState();
      } catch (err) {
        log(`[w${workerId}] failed to sync vows/block height: ${err}`);
        await sleep(5000);
        continue;
      }

      const action = await pickEligibleAction(w, ws, wallets, Date.now(), maxVowId, vowsState, blockHeight);
      if (!action) {
        if (!anyWalletEligibleNow()) {
          log(`[w${workerId}] no eligible actions left - exiting (cooldowns active)`);
          stop.stopped = true;
          break;
        }
        await sleep(300);
        continue;
      }

      const fee = jitteredFee(BASE_FEE_USTX, FEE_JITTER_PCT);
      state.totalAttempted += 1;

      try {
        const txid = await withNonce(w.address, async (nonce) => {
          const tx = await makeContractCall({
            contractAddress: DEPLOYER,
            contractName: action.contractName,
            functionName: action.functionName,
            functionArgs: action.args,
            senderKey: w.privateKey,
            network: STACKS_NETWORK,
            fee,
            nonce,
            postConditionMode: PostConditionMode.Allow,
            anchorMode: AnchorMode.Any,
          });
          return await broadcast(tx);
        });

        const now = Date.now();
        ws.lastVoteTs = now; // Any successful broadcast triggers the cooldown for this wallet
        if (action.kind === 'vote-yes' || action.kind === 'vote-no') {
          ws.votesCast += 1;
        }

        balCache.set(w.address, bal > fee ? bal - fee : BigInt(0));
        state.totalSucceeded += 1;
        log(`[w${workerId}] ok ${action.kind}@${action.contractName} wallet=${shortAddr(w.address)} fee=${fee} tx=${txid}`);
        await saveState(state);
      } catch (err) {
        state.totalFailed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        log(`[w${workerId}] fail ${action.kind} wallet=${shortAddr(w.address)} err=${msg.slice(0, 200)}`);
        const now = Date.now();
        if (/COOLDOWN/.test(msg)) {
          ws.lastVoteTs = now;
        }
        await saveState(state);
      }

      await sleep(randInt(SLEEP_MIN_MS, SLEEP_MAX_MS));
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, i) => workerLoop(i + 1)));

  log('\n=== final ===');
  log(`attempted: ${state.totalAttempted}  ok: ${state.totalSucceeded}  fail: ${state.totalFailed}`);
  await saveState(state);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[fatal] ${msg}`);
  if (logStream) logStream.write(`[fatal] ${msg}\n`);
  process.exitCode = 1;
});
