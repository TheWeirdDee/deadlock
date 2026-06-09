 

export interface Vow {
  id: number;
  creator: string;
  title: string;
  description: string;
  /** Numeric vow type categorization (1: Burn, 2: Rival, 3: Cause) */
  vowType: number;
  /** Amount of STX locked in escrow (in microSTX) */
  stakeAmount: bigint;
  /** Stacks block height at which the commitment deadline completes */
  deadlineBlock: number;
  /** Active status index identifier (1: Active, 2: Completed, 3: Failed, 4: Challenged) */
  status: number;
  rival?: string;
  causeWallet?: string;
  /** Amount of STX the rival deposited to match the vow (in microSTX) */
  rivalStake: bigint;
  createdAt: number;
  settledAt?: number;
  proofUrl?: string;
  challengeEndBlock?: number;
  yesVotes: number;
  noVotes: number;
}

export const VOW_TYPES = {
  BURN: 1,
  RIVAL: 2,
  CAUSE: 3,
};

export const VOW_STATUS = {
  ACTIVE: 1,
  COMPLETED: 2,
  FAILED: 3,
  CHALLENGED: 4,
};


export interface SpectatorBet {
  spectator: string;
   
  amount: bigint;
  /** true = bet on creator success; false = bet on creator failure */
  prediction: boolean;
  claimed: boolean;
}

/**
 * Computed client-side from the full on-chain vow history.
 * Not stored on-chain — purely a frontend derived metric.
 */
export interface LeaderboardEntry {
  address: string;
  /** Calculated reputation score (starts at 100, +100 per win, -150 per loss) */
  reputation: number;
  totalVows: number;
  completedVows: number;
  failedVows: number;
  activeVows: number;
  /** Cumulative STX staked across all vows (in STX, not microSTX) */
  totalStaked: number;
}

export const REPUTATION_POINTS = {
  BASELINE: 100,
  WIN: 100,
  LOSS: -150,
  ACTIVE_BONUS: 10,
} as const;
