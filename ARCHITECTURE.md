# DEADLOCK — Architecture

---

## Folder Structure

```
deadlock/
├── contracts/
│   └── deadlock.clar              # Clarity smart contract (deploy this first)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, wraps with wallet Connect provider
│   │   ├── globals.css            # Global styles, fonts, animations
│   │   ├── page.tsx               # Home: hero + live vow feed
│   │   ├── create/
│   │   │   └── page.tsx           # 4-step vow creation wizard
│   │   ├── vow/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Public vow page: countdown, spectators, verdict
│   │   └── profile/
│   │       └── [address]/
│   │           └── page.tsx       # Wallet profile: vow history, reputation
│   │
│   ├── components/
│   │   ├── WalletConnect.tsx      # Hiro wallet button (connect/disconnect/address)
│   │   ├── VowCard.tsx            # Card shown in feed (type, title, stake, countdown)
│   │   ├── Countdown.tsx          # Block-based live countdown timer
│   │   ├── SpectatorPanel.tsx     # Bet STX on whether vow succeeds or fails
│   │   ├── VerdictPanel.tsx       # Creator submits proof; anyone claims failure
│   │   └── BurnAnimation.tsx      # Fire animation shown when a burn vow fails
│   │
│   └── lib/
│       ├── types.ts               # All TypeScript types and constants
│       └── contract.ts            # All read-only and write contract call wrappers
│
├── public/
│   ├── og.png                     # Open Graph image for social sharing
│   └── icon.png                   # App icon
│
├── .env.local                     # Secret env vars (never commit)
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Smart Contract Architecture

### Data Stored On-Chain

**`vows` map** — keyed by `vow-id (uint)`
- creator, title, description
- vow-type: 1=burn, 2=rival, 3=cause
- stake-amount (microSTX)
- deadline-block
- status: 1=active, 2=completed, 3=failed, 4=challenged
- rival (optional principal)
- cause-wallet (optional principal)
- rival-stake
- proof-url (optional)
- challenge-end-block (optional — set when creator submits proof)
- yes-votes / no-votes (community verdict)

**`spectator-bets` map** — keyed by `(vow-id, spectator)`
- amount, prediction (bool), claimed (bool)

**`spectator-pools` map** — keyed by `vow-id`
- success-pool, failure-pool totals

**`community-votes` map** — keyed by `(vow-id, voter)`
- voted (bool) — prevents double voting

---

## Vow Lifecycle

```
CREATE VOW
    │
    ▼
[STATUS: ACTIVE] ◄──── Spectators can bet here
    │
    ├── Deadline passes, no proof → anyone calls claim-failure
    │       │
    │       ▼
    │   [STATUS: FAILED] → burn / rival wins / cause receives
    │
    └── Creator submits proof before deadline → submit-completion
            │
            ▼
        [STATUS: CHALLENGED] ← 48hr community vote window (288 blocks)
            │
            ├── yes-votes > no-votes → finalize → [STATUS: COMPLETED]
            │       Stake returned to creator
            │
            └── no-votes >= yes-votes → finalize → [STATUS: FAILED]
                    Burn / rival / cause receives stake
```

---

## Spectator Mechanic

- Anyone can bet STX on whether a vow will succeed or fail
- Must bet BEFORE the deadline
- Two pools: success-pool and failure-pool
- When vow settles, winners split the losing pool proportionally
- Winners reclaim their original bet + their share of losers' pool

---

## Reputation System (Frontend Only)

Calculated from on-chain vow history per wallet:

| Metric | Badge |
|---|---|
| 3 vows kept in a row | Oath Keeper |
| 10 vows kept total | Ironclad |
| Any failed vow | Vow Breaker (permanent) |
| Active rival vow | In Combat |

No smart contract changes needed — computed client-side from vow history.

---

## Sharing / Virality

Every vow page at `/vow/[id]` has:
- Pre-filled tweet: `"I just locked X STX on [vow title]. If I fail it burns. Watch me: deadlock.xyz/vow/[id] #DEADLOCK"`
- Pre-filled LinkedIn post
- Copy link button
- OG meta tags so link previews show the vow title and stake amount

---

## Contract Read vs Write

| Action | Type | Function |
|---|---|---|
| Get single vow | Read | `get-vow` |
| Get vow count | Read | `get-vow-count` |
| Get spectator pool | Read | `get-spectator-pool` |
| Check if voted | Read | `has-voted` |
| Create vow | Write | `create-vow` |
| Accept rival vow | Write | `accept-rival-vow` |
| Place spectator bet | Write | `spectate` |
| Submit proof | Write | `submit-completion` |
| Vote on challenged vow | Write | `vote-on-vow` |
| Finalize after vote window | Write | `finalize-challenged-vow` |
| Claim failed vow | Write | `claim-failure` |
| Claim spectator winnings | Write | `claim-spectator-winnings` |
