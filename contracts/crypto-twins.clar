;; To-do list:
;; market place
;; ability to change the treshholds by a vote of citycoiners

;; // How to design the a hodl score to the user?
;; // the lock-period is not kept, so simply look up stacked 1 cycle in the past and give more weight to the hodle score by adding the 2 stacked cycle -1 and current
;; // allow user to vote if they have the NFT and give them a # of votes equal to 
;; // BTC: stacked N + stacked N-1 /10
;; // STX: stacked N + stacked N-1 /3
;; // CC: stacked N + stacked N-1 
;; // look up the repo by Wilson Bright shared by Ken Rogers

;; sizeable bitcoin call fold/ map functions


;; Crypto-twins is a project by Manie
;; Rafa is simply helping Manie with the code

;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  Cons, Vars & Maps ;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Define NFT
(define-non-fungible-token crypto-twins uint) ;; 

;; Define maps

;; we want 3 tiers of the NFTs
;; what if an NFT can change tiers as a function of how much a Ccoiner stacks?
;; tier tresholds of {2m, 1m, 500k} for respectively tiers {BTC, STX, CC}, it's turtles all the way down!
;; do we create a map for each NFT where tier is BTC, STX or CC and score-ref-height a reference to calculate the hodl score?
(define-map tier uint { tier:  (string-ascii 3), score-ref-height: uint})
;; then when we mint or when we transfer, we record the block-height and the tier (the tier is a function of the total-stacked of the recipient or minter)
;; and the score can be deduce by substracting the current-block-height to the score-ref-height

(define-map limited-edition principal { vip: (string-ascii 3) }) ;; once it's set it locks the user out of the minting process (1 NFT per account)

;; Error messages
(define-constant ERR_INVALID_USER (err u300))
(define-constant ERR-MINTED-OUT (err u301)) 
(define-constant ERR-COULD-NOT-MINT (err u302)) 
(define-constant ERR-MINT-NOT-ALLOWED-FOR-STACKERS-OF-LESS-THAN (err u303)) ;; doesn't pass the test of the golden BTC stacking standard
(define-constant ERR-LIMITED-EDITION (err u304))
(define-constant BTC-STACKING-CLUB u2000000000000)
(define-constant STX-STACKING-CLUB u1000000000000)
(define-constant CC-STACKING-CLUB u500000000000)

;; advance_chain_tip 1000 (because CC starts at block 50)

;; Adhere to SIP09
(impl-trait .sip-09.nft-trait)

;; Collection limit
(define-constant collection-limit u1000)

;; Root URI
(define-constant collection-root-uri "ipfs://ipfs/QmYcrELFT5c9pjSygFFXk8jfVMHB5cBoWJDGaTvrP/")

;; nft price
;; (define-constant crypto-twins-price u0)

;; Collection Index
(define-data-var collection-index uint u1)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  SIP-09 Functions ;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Get last token id
(define-read-only (get-last-token-id) 
    (ok (var-get collection-index)) 
)

;; Get token uri

(define-read-only (get-token-uri (id uint)) 
    (ok 
        (some (concat collection-root-uri
                (concat 
                    (uint-to-ascii id)
                    ".json")
        ))
    )
)


;; get token owner
(define-read-only (get-token-owner (id uint))
    (ok (nft-get-owner? crypto-twins id))
)

;; Transfer
(define-public (transfer (id uint) (sender principal) (receiver principal))
      (let 
    
        (
            ;; cycle is the current cycle that can be retreived from ccd007-citycoin-stacking in contracts/extensions and using the read only function get-current-reward-cycle
            (cycle (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-current-reward-cycle))
            ;; now we need userId from RECEIVER
            (userId (unwrap! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd003-user-registry get-user-id receiver) ERR_INVALID_USER))
            ;; now we need their total citycoin stacked
            ;; first nyc
            (stacker-nyc (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-stacker u2 cycle userId))
            (nyc-is-stacked (get stacked stacker-nyc))
            
            ;; then mia
            (stacker-mia (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-stacker u1 cycle userId))
            (mia-is-stacked (get stacked stacker-mia))
            ;; add the 2 together
            (total-stacked (+ nyc-is-stacked mia-is-stacked))
        )

        ;; (print total-stacked) ;; you can print this to the console, see how it displays in test 
        
        ;; assert that total-stacked is higher than 500k, i.e this is a free mint for stackers of more than 2 million citycoins combined
        (asserts! (>= total-stacked CC-STACKING-CLUB) ERR-MINT-NOT-ALLOWED-FOR-STACKERS-OF-LESS-THAN);; at min you're a CCoiner to become a crypto-twin!

        (asserts! (is-eq tx-sender sender) (err u1)) ;; can't transfer on behalf of owner

        
        (print userId)

        (if (>= total-stacked BTC-STACKING-CLUB)
            (begin 
                (map-set tier id { tier: "BTC", score-ref-height: block-height })
                (print "BTC")

            )
            (if (>= total-stacked STX-STACKING-CLUB)
                (begin
                    (map-set tier id { tier: "STX", score-ref-height: block-height })
                    (print "STX")
                )
                (begin 
                    (map-set tier id { tier: "CC", score-ref-height: block-height })
                    (print "CC")
                )
            )
        )

        (nft-transfer? crypto-twins id sender receiver) ;; in this function sender is the owner of the NFT, 
        ;;but it can be called by anyone, hence check the tx-sender is the owner or abort!

    ) 
)

;; in the transfer above, we verify they have enough tokens to receive the NFT before we transfer it
;; is this is enough, or do we need to add a contract for market place non-custodial
;; for the transfer function, it's maybe a little more complex than the trivial case, to include non-custodial market place?
;; yes, you could check that the user listing the nft has enough tokens, and that the user buying the nft has enough

;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  Core Functions ;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Core minting function
(define-public (mint (user principal)) 
    (let 
    
        (
            ;; cycle is the current cycle that can be retreived from ccd007-citycoin-stacking in contracts/extensions and using the read only function get-current-reward-cycle
            (cycle (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-current-reward-cycle))
            ;; now we need userId from tx-sender
            (userId (unwrap! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd003-user-registry get-user-id user) ERR_INVALID_USER))
            ;; now we need their total citycoin stacked
            ;; first nyc
            (stacker-nyc (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-stacker u2 cycle userId))
            (nyc-is-stacked (get stacked stacker-nyc))
            
            ;; then mia
            (stacker-mia (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd007-citycoin-stacking get-stacker u1 cycle userId))
            (mia-is-stacked (get stacked stacker-mia))
            ;; add the 2 together
            (total-stacked (+ nyc-is-stacked mia-is-stacked))

            ;; index of the nft collection
            (current-index (var-get collection-index))
            (next-index (+ current-index u1))
        )

        ;; assert that current index lower than collection limit
        (asserts! (<= current-index collection-limit) ERR-MINTED-OUT)

        ;; (print total-stacked) ;; you can print this to the console, see how it displays in test 

        ;; assert that total-stacked is higher than 2m, i.e this is a free mint for stackers of more than 2 million citycoins combined
        (asserts! (>= total-stacked CC-STACKING-CLUB) ERR-MINT-NOT-ALLOWED-FOR-STACKERS-OF-LESS-THAN)

        ;; print that this is a free mint
        (print "free mint")
        (print userId)
        
        ;; 1 NFT per account
        (asserts! (map-insert limited-edition user {vip: "yes"}) ERR-LIMITED-EDITION)
        (map-insert limited-edition user {vip: "yes"})  ;; this should exit if the user already has an NFT

        
        (if (>= total-stacked BTC-STACKING-CLUB)
            (map-set tier current-index { tier: "BTC", score-ref-height: block-height })
            (if (>= total-stacked STX-STACKING-CLUB)
                (map-set tier current-index { tier: "STX", score-ref-height: block-height })
                (map-set tier current-index { tier: "CC", score-ref-height: block-height })
            )
        )

        ;; Mint crypto-twins
        (unwrap! (nft-mint? crypto-twins current-index tx-sender) ERR-COULD-NOT-MINT)   

        ;; var set current-index
        (var-set collection-index next-index)
        ;; (ok (map-get? tier current-index))
        ;; (ok (map-get? limited-edition user))
        (ok current-index)
    )
  )


;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  Helper Func ;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; @param value; the unit we're casting into a string to concatenate
;; thanks to Lnow for the guidance
(define-read-only (uint-to-ascii (value uint))
  (if (<= value u9)
    (unwrap-panic (element-at "0123456789" value))
    (get r (fold uint-to-ascii-inner
      0x000000000000000000000000000000000000000000000000000000000000000000000000000000
      {v: value, r: ""}
    ))
  )
)

(define-read-only (uint-to-ascii-inner (i (buff 1)) (d {v: uint, r: (string-ascii 39)}))
  (if (> (get v d) u0)
    {
      v: (/ (get v d) u10),
      r: (unwrap-panic (as-max-len? (concat (unwrap-panic (element-at "0123456789" (mod (get v d) u10))) (get r d)) u39))
    }
    d
  )
)