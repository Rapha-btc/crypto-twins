
;; sip-09
;; written by Rafa
;;; implementing sip 09 to work with NFTs
;; day 51

(define-trait nft-trait

    (
        ;;last token id
        (get-last-token-id () (response uint uint))
        ;;URI metadata
        (get-token-uri (uint) (response (optional (string-ascii 256)) uint))
        ;;get owner
        (get-token-owner (uint) (response (optional principal) uint)) ;; response is optional so the concat needs to be wrapped in some
        ;; Transfer
        (transfer (uint principal principal) (response bool uint))

    )
)