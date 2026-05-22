# DEADLOCK — Frontend UI Spec

This document tells the agent exactly what to build for each page and component.

---

## Design System

**Background:** `#0a0a0a` (near black)
**Text:** `#ffffff` with opacity variants (`/60`, `/40`, `/20`) for hierarchy
**Accent — Burn:** `#f97316` (orange)
**Accent — Rival:** `#a855f7` (purple)
**Accent — Cause:** `#22c55e` (green)
**Font — Headings:** Bebas Neue, ALL CAPS, tight tracking
**Font — Body/Numbers:** Space Mono
**Border style:** `1px solid rgba(255,255,255,0.1)` default, `0.3` on hover

---

## Component: WalletConnect

- If not connected: white outlined button "Connect Wallet"
- If connected: show shortened address `SP1AB...3F4G` + small ✕ to disconnect
- Uses `@stacks/connect-react` `useConnect` hook and `UserSession`

---

## Component: VowCard

Clickable card linking to `/vow/[id]`

- Top row: vow type label (left) + status badge (right)
- Title in large bold font, max 2 lines
- Short description, max 2 lines, muted
- Bottom row: stake in STX (large) + compact countdown OR result badge
- Tiny creator address at bottom
- Background tint matches vow type: burn=orange/10, rival=purple/10, cause=green/10
- Hover lifts border opacity

---

## Component: Countdown

- Fetches current block from `https://api.hiro.so/v2/info` on mount, refreshes every 60s
- Calculates time remaining using 10 min/block
- Compact mode: single line e.g. `14d 3h`
- Full mode: large number + "blocks remaining" subtext
- When < 24h: text pulses red

---

## Component: SpectatorPanel

Shown on `/vow/[id]` when vow is active and before deadline

- Two big buttons: "BET ON SUCCESS ✓" and "BET ON FAILURE ✗"
- Selected prediction highlights the button
- STX amount input (min 1)
- Shows current pool sizes: "X STX riding on success / Y STX riding on failure"
- Submit button calls `spectate` contract function
- If already bet: show your bet and prediction, disable form

---

## Component: VerdictPanel

Shown on `/vow/[id]` based on status and user role

**If creator + status=active + before deadline:**
- Text input for proof URL
- Button: "SUBMIT PROOF OF COMPLETION"
- Calls `submit-completion`

**If status=active + after deadline:**
- Button: "CLAIM THIS VOW FAILED"
- Anyone can call this (bounty mechanic — consider adding small reward later)
- Calls `claim-failure`

**If status=challenged:**
- Show proof URL as clickable link
- Vote buttons: "✓ THEY DID IT" and "✗ THEY FAILED"
- Show live vote counts
- Show challenge window countdown
- If window passed: "FINALIZE VOW" button → `finalize-challenged-vow`

**If status=completed or failed:**
- Big result banner
- If failed + burn: fire animation, "X STX BURNED FOREVER"
- If failed + rival: "X STX sent to rival"
- If failed + cause: "X STX sent to [cause wallet]"
- If completed: "VOW KEPT ✓" in green

---

## Page: / (Home)

**Hero section:**
- Large headline: "LOCK YOUR WORD."
- Subheadline explains the concept in 2 sentences
- Two CTAs: "MAKE YOUR VOW" (primary) + "SEE ALL VOWS" (secondary)

**Stats bar:**
- Total vows / STX burned / Vows kept — 3 column grid

**Vow Feed:**
- Filter buttons: ALL | ACTIVE | BURN | RIVAL | CAUSE
- Grid of VowCards (3 cols desktop, 1 col mobile)
- Sorted by most recent first
- Empty state with CTA to create

---

## Page: /create

4-step wizard with progress bar at top

**Step 1 — TYPE**
- 3 large selectable cards: Burn / Rival / Cause
- Each shows the label + consequence description
- Selected card has white border

**Step 2 — VOW**
- Large borderless text input for title
- Textarea for description
- Pill buttons for deadline: 7d / 14d / 30d / 60d / 90d
- If rival: show principal address input
- If cause: show wallet address input

**Step 3 — STAKE**
- Giant number showing selected STX amount
- Range slider (1–1000 STX)
- Quick-pick buttons: 10 / 50 / 100 / 500 STX
- Warning box showing exactly what happens if they fail

**Step 4 — CONFIRM**
- Summary of all choices
- "LOCK MY VOW ON BITCOIN" button → triggers wallet transaction
- Wallet not connected: warning shown

---

## Page: /vow/[id]

**Top section:**
- Vow type badge + status badge
- Large title
- Creator address + created date
- Stake amount (very large)
- Countdown (full size) OR result banner

**Middle section:**
- Description
- If rival: show rival address + their stake
- If cause: show cause wallet
- Proof URL if submitted (clickable)

**Spectator section:**
- SpectatorPanel component
- Pool sizes shown as a visual bar (success vs failure ratio)

**Verdict section:**
- VerdictPanel component

**Share section:**
- "SHARE YOUR VOW" heading
- Pre-filled tweet button
- Copy link button

---

## Page: /profile/[address]

- Wallet address as heading (shortened)
- Reputation badges (Oath Keeper / Ironclad / Vow Breaker) — computed from history
- Stats: vows made / kept / failed / active
- Grid of all VowCards for that address
- Empty state if no vows

---

## Animations

- Page load: staggered fade-up on hero elements (Framer Motion)
- VowCard hover: slight scale + border brighten
- Burn result: orange glow + flicker animation on stake amount
- Countdown urgent: red pulse on text
- Step transitions in /create: slide left/right

---

## Mobile

- All pages are single column on mobile
- Header collapses to logo + hamburger (or just logo + wallet button)
- VowCard full width
- Countdown compact on cards
