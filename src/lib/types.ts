 

/**
 * Represents the structure of a Decentralized Accountability Vow
 * mapped from Clarity contract maps.
 */
export interface Vow {
  /** Unique index identifier representing the Vow ID */
  id: number;
  /** Principal address of the user who committed to the vow */
  creator: string;
  /** Short summary heading for the vow task description */
  title: string;
  /** Detailed specs regarding the goal commitment */
  description: string;
  /** Numeric vow type categorization (1: Burn, 2: Rival, 3: Cause) */
  vowType: number;
  /** Amount of STX locked in escrow (in microSTX) */
  stakeAmount: bigint;
  /** Stacks block height at which the commitment deadline completes */
  deadlineBlock: number;
  /** Active status index identifier (1: Active, 2: Completed, 3: Failed, 4: Challenged) */
  status: number;
  /** Optional principal of the challenger rival */
  rival?: string;
  /** Optional principal of the cause address to receive stake if slashed */
  causeWallet?: string;
  /** Amount of STX the rival deposited to match the vow (in microSTX) */
  rivalStake: bigint;
  /** Stacks block height when the vow transaction was initiated */
  createdAt: number;
  /** Optional Stacks block height when vow was marked complete/failed */
  settledAt?: number;
  /** Optional verification link showing task completion */
  proofUrl?: string;
  /** Optional Stacks block height denoting end of community voting */
  challengeEndBlock?: number;
  /** Total count of community yes-votes verifying task completion */
  yesVotes: number;
  /** Total count of community no-votes challenging task completion */
  noVotes: number;
}

/**
 * Mapping defining supported vow types on-chain.
 */
export const VOW_TYPES = {
  /** Stake is burned to dead address if deadline missed */
  BURN: 1,
  /** High stakes challenge; rival matched stake; winner takes all */
  RIVAL: 2,
  /** Stake is sent to cause wallet if deadline missed */
  CAUSE: 3,
};

/**
 * Mapping defining vow statuses on-chain.
 */
export const VOW_STATUS = {
  /** Vow created; awaiting proof or deadline to elapse */
  ACTIVE: 1,
  /** Verified success; creator stake returned */
  COMPLETED: 2,
  /** Creator failed; stakes slashed according to vow-type */
  FAILED: 3,
 
  CHALLENGED: 4,
};


/**
 * Represents a spectator's bet placed on a vow outcome.
 * Stored in the `spectator-bets` map on-chain, keyed by (vow-id, spectator).
 */
export interface SpectatorBet {
  /** Principal address of the spectator who placed the bet */
  spectator: string;
  /** Amount of STX wagered (in microSTX) */
  amount: bigint;
  /** true = bet on creator success; false = bet on creator failure */
  prediction: boolean;
  /** Whether the spectator has already claimed their winnings */
  claimed: boolean;
}

/**
 * Aggregated reputation entry for a single wallet address.
 * Computed client-side from the full on-chain vow history.
 * Not stored on-chain — purely a frontend derived metric.
 */
export interface LeaderboardEntry {
  /** Stacks principal address of the wallet */
  address: string;
  /** Calculated reputation score (starts at 100, +100 per win, -150 per loss) */
  reputation: number;
  /** Total number of vows the wallet has participated in */
  totalVows: number;
  /** Number of vows successfully completed */
  completedVows: number;
  /** Number of vows that resulted in failure/slash */
  failedVows: number;
  /** Number of currently active (in-progress) vows */
  activeVows: number;
  /** Cumulative STX staked across all vows (in STX, not microSTX) */
  totalStaked: number;
}

/**
 * Reputation scoring constants used by the leaderboard aggregation logic.
 * These values are intentionally not stored on-chain — reputation is a
 * purely informational frontend metric and can be recalculated at any time.
 */
export const REPUTATION_POINTS = {
  /** Baseline score every wallet starts with */
  BASELINE: 100,
  /** Points earned for completing a vow successfully */
  WIN: 100,
  /** Points deducted for a failed/slashed vow */
  LOSS: -150,
  /** Points added for having an active (not yet settled) vow */
  ACTIVE_BONUS: 10,
} as const;
