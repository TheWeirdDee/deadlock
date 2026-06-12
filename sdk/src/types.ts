export enum VowType {
  BURN = 1,
  RIVAL = 2,
  CAUSE = 3,
}

export enum VowStatus {
  ACTIVE = 1,
  COMPLETED = 2,
  FAILED = 3,
  CHALLENGED = 4,
}

export interface Vow {
  id: number;
  creator: string;
  title: string;
  description: string;
  vowType: VowType;
  stakeAmount: number;
  deadlineBlock: number;
  status: VowStatus;
  rival: string | null;
  causeWallet: string | null;
  rivalStake: number;
  createdAt: number;
  settledAt: number | null;
  proofUrl: string | null;
  challengeEndBlock: number | null;
  yesVotes: number;
  noVotes: number;
}

export interface SpectatorPool {
  successPool: number;
  failurePool: number;
}

export interface SpectatorBet {
  amount: number;
  prediction: boolean;
  claimed: boolean;
}

export interface DeadlockClientConfig {
  /** 'mainnet' or 'testnet'. Defaults to 'mainnet'. */
  network?: 'mainnet' | 'testnet';
  /** Override the default contract address. */
  contractAddress?: string;
  /** Override the default contract name. */
  contractName?: string;
}
