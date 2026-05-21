import { principalCV, uintCV, noneCV, someCV, stringUtf8CV, boolCV } from '@stacks/transactions';

export interface Vow {
  id: number;
  creator: string;
  title: string;
  description: string;
  vowType: number;
  stakeAmount: bigint;
  deadlineBlock: number;
  status: number;
  rival?: string;
  causeWallet?: string;
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
