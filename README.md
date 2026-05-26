# Deadlock dApp — Decentralized Accountability Vows

Deadlock is a decentralized, public accountability protocol built on the **Stacks Blockchain (Bitcoin Layer 2)**. It enables developers to publicly commit to goals (Vows) by locking Stacks (STX) tokens. If the commitment deadline passes without verified proof, the funds are slashed based on the chosen Vow Type (burned, sent to a rival, or donated to a cause).

---

## ⚡ Core Features

1. **Escrow Accountability Vows:**
   * **Burn Vow:** misses result in permanently burning the creator's STX stake.
   * **Rival Vow:** allows an opponent to match the stake and compete; winner takes all.
   * **Cause Vow:** missed deadlines automatically route the STX to a public charity/cause wallet.
2. **On-Chain Reputation System:**
   * User profiles calculate a global XP rating based on vow completion history and community participation.
   * Features a Global Leaderboard with local caching to minimize Stacks node API queries.
3. **Spectator Prediction Pools:**
   * Third-party users can bet on the success or failure of active commitments.
   * ROI Calculator dynamic sliders estimate multipliers and yields.
4. **Decentralized Verification Panel:**
   * Automated verification rendering for Twitter status posts, GitHub commit diffs, Loom video walkthroughs, and standard link previews.
5. **Dynamic Countdown & Calendar integrations:**
   * Live block countdown queries the Stacks tip height to estimate exact date-time targets.
   * Integrated Google Calendar exports and iCal ICS file downloads.

---

## 🛠️ Getting Started

### Prerequisites

* Node.js (v18+)
* Stacks Hiro Wallet browser extension (for on-chain signing)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV
   NEXT_PUBLIC_CONTRACT_NAME=deadlock-clar
   NEXT_PUBLIC_NETWORK=mainnet
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Build production static routes:
   ```bash
   npm run build
   ```

---

## 🧪 Simulation Testing

A background simulation farmer script is provided in this repository to populate mock transaction data across 50 developer wallets:

```bash
# Run simulator with clean states
npm run divine -- --reset

# Check log progress
tail -f private/scripts/state/friend-farmer.log
```
