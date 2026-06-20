# Deadlock — Decentralized Accountability Protocol

Deadlock is a public accountability protocol built on the **Stacks Blockchain (Bitcoin L2)**. Creators lock STX tokens against a self-imposed deadline. If proof of completion is not submitted and verified before the deadline block, the stake is slashed — burned, transferred to a rival, or donated to a cause — with no admin keys and no escape hatches.

---

## Core Features

**Vow Types**
- **Burn Vow** — failed vows send the stake to the burn address permanently.
- **Rival Vow** — a named rival matches the stake; the winner takes the combined pool.
- **Cause Vow** — failed vows route the stake to a designated public-good wallet.

**Community Adjudication**
- Creators submit a proof URL (GitHub PR, Twitter thread, Loom, etc.) to open a voting window.
- Any wallet can cast a `vote-success` or `vote-failure` within the challenge window.
- After the window closes, anyone can finalize the settlement on-chain.

**Spectator Prediction Pools**
- Any wallet can bet STX on success or failure of any active vow.
- Payouts are parimutuel: winning bettors split the losing pool proportionally.
- An ROI calculator on each vow page simulates payout before committing.

**Reputation Leaderboard**
- Every address accumulates XP based on vow outcomes (+100 per completion, −150 per failure, +10 per active).
- Leaderboard is computed client-side from the shared vow cache and stored with a 10-minute TTL to reduce repeat API calls.

**Live Block Countdown**
- Deadline blocks are converted to estimated wall-clock times using the current Stacks tip height (~10 min/block).
- Countdowns refresh every 60 seconds. Google Calendar and iCal (.ics) export included.

---

## Getting Started

### Prerequisites

- Node.js v18+
- [Hiro Wallet](https://wallet.hiro.so) browser extension

### Installation

```bash
git clone https://github.com/TheWeirdDee/deadlock
cd deadlock
npm install
```

### Environment Variables

Create `.env.local` with the following:

```env
# Required
NEXT_PUBLIC_CONTRACT_ADDRESS=SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV
NEXT_PUBLIC_CONTRACT_NAME=deadlock-clar
NEXT_PUBLIC_NETWORK=mainnet

# Optional — increases Hiro API rate limit
NEXT_PUBLIC_HIRO_API_KEY=your_key_here

# Optional — enables Plausible privacy-first analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

Get a free Hiro API key at [platform.hiro.so](https://platform.hiro.so). The anonymous tier is rate-limited to ~25 req/min; a key raises this significantly and is recommended for production.

### Dev Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages |
| `src/app/vow/[id]/page.tsx` | Server wrapper — exports `generateMetadata` for per-vow OG tags |
| `src/app/vow/[id]/VowPageClient.tsx` | Client component — all vow detail interactivity |
| `src/app/dashboard/` | Connected-wallet dashboard (my vows + spectator bets) |
| `src/app/feed/` | Paginated public vow feed |
| `src/app/leaderboard/` | On-chain reputation rankings |
| `src/app/analytics/` | Protocol-wide stats (real on-chain data) |
| `src/lib/contract.ts` | All Stacks read-only calls and `getCurrentBlockHeight()` |
| `src/lib/vowCache.ts` | localStorage vow cache keyed by `lastSyncedId` |
| `src/components/Toast.tsx` | Global toast system with `ToastProvider` and `useToast` |
| `src/components/CreateVowModal.tsx` | Create-vow flow with deadline picker and stake input |
| `next.config.js` | Security headers (CSP, HSTS, X-Frame-Options) + optional Sentry |

---

## Smart Contract Functions

| Function | Type | Description |
|----------|------|-------------|
| `create-vow` | Write | Creates a new vow with type, stake, deadline, optional rival/cause |
| `submit-completion` | Write | Creator submits proof URL, opens adjudication window |
| `vote-on-vow` | Write | Any wallet votes success/failure during challenge window |
| `claim-failure` | Write | Anyone triggers failure settlement after deadline expires |
| `finalize-challenged-vow` | Write | Anyone finalizes after adjudication window closes |
| `spectate` | Write | Place a STX bet on success or failure |
| `claim-spectator-winnings` | Write | Claim payout after a settled vow |
| `accept-rival-vow` | Write | Rival accepts a Rival Vow by matching the stake |
| `get-vow` | Read | Fetch full vow struct by ID |
| `get-vow-count` | Read | Total number of vows created |
| `get-spectator-pool` | Read | Success/failure pool sizes for a vow |
| `get-spectator-bet` | Read | A specific wallet's bet on a vow |
| `has-voted` | Read | Check if a wallet has already voted on a vow |

---

## Security

- Content Security Policy, HSTS, X-Frame-Options, and other HTTP security headers are set in `next.config.js`.
- All user-generated content (vow titles, descriptions, proof URLs) is sanitized with DOMPurify before rendering.
- No admin keys. Contract logic is fully on-chain with no upgrade path.
- Optional Sentry error monitoring: install `@sentry/nextjs` to activate (the config wrapper is already in `next.config.js`).
