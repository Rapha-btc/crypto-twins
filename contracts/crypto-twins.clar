
;; Crypto-twins is a project by Manie
;; Rafa is simply helping Manie with the code

;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  Cons, Vars & Maps ;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Define NFT
(define-non-fungible-token crypto-twins uint) ;; 

;; Error messages
(define-constant ERR_INVALID_USER (err u300))
(define-constant ERR-MINTED-OUT (err u301)) 
(define-constant ERR-COULD-NOT-MINT (err u302)) 
(define-constant ERR-MINT-NOT-ALLOWED-FOR-STACKERS-OF-LESS-THAN-2-MILLION-CITYCOINS-COMBINED (err u303)) 
(define-constant MIN-STACKING-CLUB u2000000000000)

;; advance_chain_tip 1000 (because CC starts at block 50)

;; Adhere to SIP09
(impl-trait .sip-09.nft-trait)

;; Collection limit
(define-constant collection-limit u200)

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
    (begin
        (asserts! (is-eq tx-sender sender) (err u1))
        (nft-transfer? crypto-twins id sender receiver) ;; in this function sender is the owner of the NFT, 
        ;;but it can be called by anyone, hence check the tx-sender is the owner or abort!
    )
)
;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;  Core Functions ;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Core minting function
(define-public (mint (user principal)) 
    (let 
    
        (
            ;; cycle is the current cycle that can be retreived from ccd007-citycoin-stacking in contracts/extensions and using the read only function get-current-reward-cycle
            (cycle (contract-call? .ccd007-citycoin-stacking get-current-reward-cycle))
            ;; now we need userId from tx-sender
            (userId (unwrap! (contract-call? .ccd003-user-registry get-user-id user) ERR_INVALID_USER))
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

        (print total-stacked) ;; you can print this to the console, see how it displays in test 

        ;; assert that total-stacked is higher than 2m, i.e this is a free mint for stackers of more than 2 million citycoins combined
        (asserts! (>= total-stacked MIN-STACKING-CLUB) ERR-MINT-NOT-ALLOWED-FOR-STACKERS-OF-LESS-THAN-2-MILLION-CITYCOINS-COMBINED)

        ;; print that this is a free mint
        (print "free mint")

        ;; Mint crypto-twins
        (unwrap! (nft-mint? crypto-twins current-index tx-sender) ERR-COULD-NOT-MINT)

        ;; var set current-index
        (ok (var-set collection-index next-index))
        ;; (ok mia-is-stacked)
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