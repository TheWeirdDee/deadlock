(define-constant CONTRACT-OWNER tx-sender)
(define-constant BURN-ADDRESS 'SP000000000000000000002Q6VF78)

;; The contract's own principal — used as recipient for inbound STX transfers.
;; Evaluated at deploy time inside as-contract? context so tx-sender = contract.
(define-constant SELF (as-contract? () tx-sender))

(define-constant ERR-NOT-FOUND (err u100))
(define-constant ERR-UNAUTHORIZED (err u101))
(define-constant ERR-ALREADY-EXISTS (err u102))
(define-constant ERR-DEADLINE-PASSED (err u103))
(define-constant ERR-DEADLINE-NOT-PASSED (err u104))
(define-constant ERR-ALREADY-SETTLED (err u105))
(define-constant ERR-INVALID-AMOUNT (err u106))
(define-constant ERR-INVALID-TYPE (err u107))
(define-constant ERR-CHALLENGE-WINDOW-CLOSED (err u108))
(define-constant ERR-ALREADY-VOTED (err u109))
(define-constant ERR-NOT-READY-FOR-VOTING (err u110))

(define-constant VOW-TYPE-BURN u1)
(define-constant VOW-TYPE-RIVAL u2)
(define-constant VOW-TYPE-CAUSE u3)

(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-COMPLETED u2)
(define-constant STATUS-FAILED u3)
(define-constant STATUS-CHALLENGED u4)

;; ~288 blocks = 48 hours at 10 min/block
(define-constant CHALLENGE-WINDOW u288)

;; ---- DATA ----

(define-data-var vow-nonce uint u0)

(define-map vows
  { vow-id: uint }
  {
    creator: principal,
    title: (string-utf8 200),
    description: (string-utf8 500),
    vow-type: uint,
    stake-amount: uint,
    deadline-block: uint,
    status: uint,
    rival: (optional principal),
    cause-wallet: (optional principal),
    rival-stake: uint,
    created-at: uint,
    settled-at: (optional uint),
    proof-url: (optional (string-utf8 300)),
    challenge-end-block: (optional uint),
    yes-votes: uint,
    no-votes: uint
  }
)

(define-map spectator-bets
  { vow-id: uint, spectator: principal }
  { amount: uint, prediction: bool, claimed: bool }
)

(define-map spectator-pools
  { vow-id: uint }
  { success-pool: uint, failure-pool: uint }
)

(define-map community-votes
  { vow-id: uint, voter: principal }
  { voted: bool }
)

;; ---- READ-ONLY ----

(define-read-only (get-vow (vow-id uint))
  (map-get? vows { vow-id: vow-id })
)

(define-read-only (get-vow-count)
  (var-get vow-nonce)
)

(define-read-only (get-spectator-bet (vow-id uint) (spectator principal))
  (map-get? spectator-bets { vow-id: vow-id, spectator: spectator })
)

(define-read-only (get-spectator-pool (vow-id uint))
  (default-to
    { success-pool: u0, failure-pool: u0 }
    (map-get? spectator-pools { vow-id: vow-id })
  )
)

(define-read-only (has-voted (vow-id uint) (voter principal))
  (default-to false
    (get voted (map-get? community-votes { vow-id: vow-id, voter: voter }))
  )
)

;; ---- WRITE ----

(define-public (create-vow
    (title (string-utf8 200))
    (description (string-utf8 500))
    (vow-type uint)
    (stake-amount uint)
    (deadline-block uint)
    (rival (optional principal))
    (cause-wallet (optional principal))
  )
  (let ((vow-id (+ (var-get vow-nonce) u1)))
    (asserts! (> stake-amount u0) ERR-INVALID-AMOUNT)
    (asserts! (> deadline-block stacks-block-height) ERR-DEADLINE-PASSED)
    (asserts!
      (or (is-eq vow-type VOW-TYPE-BURN)
        (or (is-eq vow-type VOW-TYPE-RIVAL) (is-eq vow-type VOW-TYPE-CAUSE)))
      ERR-INVALID-TYPE
    )
    ;; Inbound: user sends STX to contract. SELF = contract principal at deploy time.
    (try! (stx-transfer? stake-amount tx-sender (unwrap-panic SELF)))
    (map-set vows { vow-id: vow-id }
      {
        creator: tx-sender,
        title: title,
        description: description,
        vow-type: vow-type,
        stake-amount: stake-amount,
        deadline-block: deadline-block,
        status: STATUS-ACTIVE,
        rival: rival,
        cause-wallet: cause-wallet,
        rival-stake: u0,
        created-at: stacks-block-height,
        settled-at: none,
        proof-url: none,
        challenge-end-block: none,
        yes-votes: u0,
        no-votes: u0
      }
    )
    (map-set spectator-pools { vow-id: vow-id }
      { success-pool: u0, failure-pool: u0 }
    )
    (var-set vow-nonce vow-id)
    (ok vow-id)
  )
)

(define-public (accept-rival-vow (vow-id uint) (stake-amount uint))
  (let ((vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get vow-type vow) VOW-TYPE-RIVAL) ERR-INVALID-TYPE)
    (asserts! (is-eq (some tx-sender) (get rival vow)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get status vow) STATUS-ACTIVE) ERR-ALREADY-SETTLED)
    ;; Prevent rival from double-accepting and trapping extra STX
    (asserts! (is-eq (get rival-stake vow) u0) ERR-ALREADY-EXISTS)
    (asserts! (>= stake-amount (get stake-amount vow)) ERR-INVALID-AMOUNT)
    (try! (stx-transfer? stake-amount tx-sender (unwrap-panic SELF)))
    (map-set vows { vow-id: vow-id } (merge vow { rival-stake: stake-amount }))
    (ok true)
  )
)

(define-public (spectate (vow-id uint) (prediction bool) (amount uint))
  (let (
    (vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND))
    (pool (get-spectator-pool vow-id))
  )
    (asserts! (is-eq (get status vow) STATUS-ACTIVE) ERR-ALREADY-SETTLED)
    (asserts! (< stacks-block-height (get deadline-block vow)) ERR-DEADLINE-PASSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (is-none (get-spectator-bet vow-id tx-sender)) ERR-ALREADY-EXISTS)
    (try! (stx-transfer? amount tx-sender (unwrap-panic SELF)))
    (map-set spectator-bets { vow-id: vow-id, spectator: tx-sender }
      { amount: amount, prediction: prediction, claimed: false }
    )
    (map-set spectator-pools { vow-id: vow-id }
      (if prediction
        (merge pool { success-pool: (+ (get success-pool pool) amount) })
        (merge pool { failure-pool: (+ (get failure-pool pool) amount) })
      )
    )
    (ok true)
  )
)

(define-public (submit-completion (vow-id uint) (proof-url (string-utf8 300)))
  (let ((vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get creator vow)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get status vow) STATUS-ACTIVE) ERR-ALREADY-SETTLED)
    (asserts! (<= stacks-block-height (get deadline-block vow)) ERR-DEADLINE-PASSED)
    (map-set vows { vow-id: vow-id }
      (merge vow {
        status: STATUS-CHALLENGED,
        proof-url: (some proof-url),
        challenge-end-block: (some (+ stacks-block-height CHALLENGE-WINDOW))
      })
    )
    (ok true)
  )
)

(define-public (vote-on-vow (vow-id uint) (vote-success bool))
  (let ((vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status vow) STATUS-CHALLENGED) ERR-UNAUTHORIZED)
    (asserts!
      (< stacks-block-height (unwrap! (get challenge-end-block vow) ERR-NOT-READY-FOR-VOTING))
      ERR-CHALLENGE-WINDOW-CLOSED
    )
    (asserts! (not (has-voted vow-id tx-sender)) ERR-ALREADY-VOTED)
    (map-set community-votes { vow-id: vow-id, voter: tx-sender } { voted: true })
    (map-set vows { vow-id: vow-id }
      (if vote-success
        (merge vow { yes-votes: (+ (get yes-votes vow) u1) })
        (merge vow { no-votes: (+ (get no-votes vow) u1) })
      )
    )
    (ok true)
  )
)

(define-public (finalize-challenged-vow (vow-id uint))
  (let (
    (vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND))
    (challenge-end (unwrap! (get challenge-end-block vow) ERR-NOT-READY-FOR-VOTING))
  )
    (asserts! (is-eq (get status vow) STATUS-CHALLENGED) ERR-UNAUTHORIZED)
    (asserts! (>= stacks-block-height challenge-end) ERR-CHALLENGE-WINDOW-CLOSED)
    (if (> (get yes-votes vow) (get no-votes vow))
      (settle-success vow-id vow)
      (settle-failure vow-id vow)
    )
  )
)

(define-public (claim-failure (vow-id uint))
  (let ((vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status vow) STATUS-ACTIVE) ERR-ALREADY-SETTLED)
    (asserts! (> stacks-block-height (get deadline-block vow)) ERR-DEADLINE-NOT-PASSED)
    (settle-failure vow-id vow)
  )
)

(define-public (claim-spectator-winnings (vow-id uint))
  (let (
    ;; Capture caller BEFORE as-contract? changes tx-sender to the contract
    (claimer tx-sender)
    (vow (unwrap! (get-vow vow-id) ERR-NOT-FOUND))
    (bet (unwrap! (get-spectator-bet vow-id tx-sender) ERR-NOT-FOUND))
    (pool (get-spectator-pool vow-id))
  )
    (asserts!
      (or (is-eq (get status vow) STATUS-COMPLETED)
          (is-eq (get status vow) STATUS-FAILED))
      ERR-DEADLINE-NOT-PASSED
    )
    (asserts! (not (get claimed bet)) ERR-ALREADY-SETTLED)
    (let (
      (vow-succeeded (is-eq (get status vow) STATUS-COMPLETED))
      (bet-correct (is-eq (get prediction bet) vow-succeeded))
    )
      (asserts! bet-correct ERR-UNAUTHORIZED)
      (let (
        (winning-pool (if vow-succeeded (get success-pool pool) (get failure-pool pool)))
        (losing-pool  (if vow-succeeded (get failure-pool pool) (get success-pool pool)))
        ;; Guard division by zero: if all bets one-sided, winner gets stake back only
        (share (if (is-eq winning-pool u0) u0 (/ (* (get amount bet) losing-pool) winning-pool)))
        (payout (+ (get amount bet) share))
      )
        (map-set spectator-bets { vow-id: vow-id, spectator: claimer }
          (merge bet { claimed: true })
        )
        ;; Outbound: contract sends to claimer. Must declare with-stx allowance.
        (try! (as-contract? ((with-stx payout))
          (try! (stx-transfer? payout tx-sender claimer))
        ))
        (ok payout)
      )
    )
  )
)

;; ---- PRIVATE ----

(define-private (settle-success (vow-id uint) (vow {
    creator: principal, title: (string-utf8 200), description: (string-utf8 500),
    vow-type: uint, stake-amount: uint, deadline-block: uint, status: uint,
    rival: (optional principal), cause-wallet: (optional principal), rival-stake: uint,
    created-at: uint, settled-at: (optional uint), proof-url: (optional (string-utf8 300)),
    challenge-end-block: (optional uint), yes-votes: uint, no-votes: uint
  }))
  (begin
    (map-set vows { vow-id: vow-id }
      (merge vow { status: STATUS-COMPLETED, settled-at: (some stacks-block-height) })
    )
    ;; Return creator's stake
    (try! (as-contract? ((with-stx (get stake-amount vow)))
      (try! (stx-transfer? (get stake-amount vow) tx-sender (get creator vow)))
    ))
    ;; Return rival's stake only if they actually accepted
    (if (and (is-eq (get vow-type vow) VOW-TYPE-RIVAL) (> (get rival-stake vow) u0))
      (try! (as-contract? ((with-stx (get rival-stake vow)))
        (try! (stx-transfer? (get rival-stake vow) tx-sender
          (unwrap! (get rival vow) ERR-NOT-FOUND)))
      ))
      true
    )
    (ok true)
  )
)

(define-private (settle-failure (vow-id uint) (vow {
    creator: principal, title: (string-utf8 200), description: (string-utf8 500),
    vow-type: uint, stake-amount: uint, deadline-block: uint, status: uint,
    rival: (optional principal), cause-wallet: (optional principal), rival-stake: uint,
    created-at: uint, settled-at: (optional uint), proof-url: (optional (string-utf8 300)),
    challenge-end-block: (optional uint), yes-votes: uint, no-votes: uint
  }))
  (begin
    (map-set vows { vow-id: vow-id }
      (merge vow { status: STATUS-FAILED, settled-at: (some stacks-block-height) })
    )
    (if (is-eq (get vow-type vow) VOW-TYPE-BURN)
      ;; Burn: creator's stake goes to burn address
      (try! (as-contract? ((with-stx (get stake-amount vow)))
        (try! (stx-transfer? (get stake-amount vow) tx-sender BURN-ADDRESS))
      ))
      (if (is-eq (get vow-type vow) VOW-TYPE-RIVAL)
        ;; Rival accepted: send both stakes to rival
        ;; Rival never accepted: burn creator's stake instead
        (if (> (get rival-stake vow) u0)
          (try! (as-contract? ((with-stx (+ (get stake-amount vow) (get rival-stake vow))))
            (try! (stx-transfer?
              (+ (get stake-amount vow) (get rival-stake vow))
              tx-sender
              (unwrap! (get rival vow) ERR-NOT-FOUND)))
          ))
          (try! (as-contract? ((with-stx (get stake-amount vow)))
            (try! (stx-transfer? (get stake-amount vow) tx-sender BURN-ADDRESS))
          ))
        )
        ;; Cause: creator's stake goes to cause wallet
        (try! (as-contract? ((with-stx (get stake-amount vow)))
          (try! (stx-transfer? (get stake-amount vow) tx-sender
            (unwrap! (get cause-wallet vow) ERR-NOT-FOUND)))
        ))
      )
    )
    (ok true)
  )
)
