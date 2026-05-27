# DEADLOCK — Agent Handoff Document
**"Your word, on Bitcoin. Forever."**

---

## What You Are Building

DEADLOCK is a public accountability dApp on Stacks (Bitcoin L2).
Users lock STX against a public commitment. Miss the deadline and the stake burns, goes to a rival, or goes to a cause — depending on the vow type they chose.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Smart Contract | Clarity (Stacks mainnet) |
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS |
| Wallet | Hiro Wallet via @stacks/connect |
| Contract interaction | @stacks/transactions |
| Animations | Framer Motion |
| Fonts | Bebas Neue (headings) + Space Mono (body) |
| Deployment | Vercel (frontend) + Stacks mainnet (contract) |

---

## Step-by-Step Build Order

Follow this exact order. Do not skip steps.

### 1. Scaffold the project
```bash
npx create-next-app@latest deadlock --typescript --tailwind --app --src-dir
cd deadlock
npm install @stacks/connect @stacks/connect-react @stacks/auth @stacks/transactions @stacks/network framer-motion
```

### 2. Deploy the smart contract
- Open the file `contracts/deadlock.clar`
- Go to https://explorer.hiro.so and deploy using Hiro Wallet
- Copy the deployed contract address
- Set it as `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`

### 3. Build frontend in this order
1. `src/lib/types.ts` — shared types and constants
2. `src/lib/contract.ts` — all read/write contract helpers
3. `src/components/WalletConnect.tsx` — Hiro wallet connect button
4. `src/components/Countdown.tsx` — live block-based countdown
5. `src/components/VowCard.tsx` — card used in feed
6. `src/components/SpectatorPanel.tsx` — bet on success/failure
7. `src/components/VerdictPanel.tsx` — submit proof or claim failure
8. `src/app/layout.tsx` — root layout with wallet provider
9. `src/app/globals.css` — global styles
10. `src/app/page.tsx` — landing + vow feed
11. `src/app/create/page.tsx` — multi-step vow creation
12. `src/app/vow/[id]/page.tsx` — individual vow page
13. `src/app/profile/[address]/page.tsx` — wallet history

### 4. Deploy frontend
```bash
vercel deploy
```

---

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=SP...your_deployed_address
NEXT_PUBLIC_CONTRACT_NAME=deadlock
NEXT_PUBLIC_NETWORK=mainnet
```

---

## Key Design Rules

- Color scheme: black background `#0a0a0a`, pure white text, orange accents for burn, purple for rival, green for cause
- Font: Bebas Neue for all headings (ALL CAPS), Space Mono for body and numbers
- Every vow has a public shareable URL: `/vow/[id]`
- The share URL and tweet text should be pre-filled on every vow page
- Burn vows show a fire animation on the card when failed
- All monetary values stored in microSTX internally, displayed in STX

---

## Pages Summary

| Route | Purpose |
|---|---|
| `/` | Landing page + live vow feed with filters |
| `/feed` | Full authenticated vow feed (50 most recent on-chain vows) |
| `/dashboard` | Auth-gated: logged-in user's own vows + pending vow status |
| `/analytics` | Recharts visual dashboard: stake volume, vow status, vow types |
| `/leaderboard` | Global reputation leaderboard with cached on-chain vow sync |
| `/docs` | Developer documentation: contract ABI, SDK setup, CLI reference |
| `/vow/[id]` | Public vow page — countdown, ROI calculator, proof embed, calendar |

---

## Notes for Agent

- Always fetch current block height from `https://api.hiro.so/v2/info` → `stacks_tip_height`
- Stacks block time is ~10 minutes. Use `144 blocks = 1 day` for deadline math
- microSTX to STX: divide by `1_000_000`
- The Stacks burn address is `SP000000000000000000002Q6VF78`
- Use `openContractCall` from `@stacks/connect` for all write transactions
- All contract reads use `callReadOnlyFunction` from `@stacks/transactions`
- Do not store any private keys anywhere

---

## Current Build State (as of last handoff)

### Features Implemented
- ✅ Vow creation modal (multi-step: type → details → stake → confirm)
- ✅ Feed page with on-chain vow fetching + pending vow reconciliation
- ✅ Dashboard with my-vows filtering by creator address
- ✅ Analytics with Recharts charts (stake volume by day, status pie, type bar)
- ✅ Leaderboard with reputation scoring + localStorage cache sync
- ✅ Docs page with contract function reference
- ✅ Vow detail page with:
  - Block-height countdown with Hiro API integration
  - ROI simulator slider (spectator pool share calculation)
  - Social proof embed (GitHub commit/PR, Twitter, YouTube)
  - Calendar export (Google Calendar + ICS download)
- ✅ Community adjudication: vote-on-vow, submit-proof, finalize-challenged-vow

### Contract Deployed
- Network: **Stacks Mainnet**
- Address: set in `NEXT_PUBLIC_CONTRACT_ADDRESS`
- Name: set in `NEXT_PUBLIC_CONTRACT_NAME` (default: `deadlock-clar`)

### Known Quirks
- `reactStrictMode: false` — required to prevent double-firing of contract reads
- Leaderboard cache key: `deadlock_vows_cache` in localStorage
- Pending vows cache key: `pending_vows` in localStorage
- `@stacks/*` packages must be listed in `transpilePackages` in `next.config.js`
- Vow field names from chain use kebab-case (`stake-amount`, `deadline-block`);
  always normalise with `vow.stakeAmount || vow['stake-amount']` patterns
