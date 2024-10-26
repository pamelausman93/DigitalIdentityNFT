;; Digital Identity NFT Contract
;; Allows users to create and manage their digital identity as NFTs
;; while maintaining privacy through selective disclosure

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-invalid-user (err u102))
(define-constant err-already-verified (err u103))

;; Data Variables
(define-non-fungible-token digital-identity uint)
(define-map identity-data
    uint
    {
        owner: principal,
        verified: bool,
        hash: (string-ascii 64),
        timestamp: uint,
        kyc-level: uint
    })

(define-map user-identity
    principal
    uint)


;; Private Functions
(define-private (is-contract-owner)
    (is-eq tx-sender contract-owner))

(define-private (is-token-owner (token-id uint))
    (let ((token-data (unwrap! (map-get? identity-data token-id)
            err-invalid-user)))
        (is-eq (get owner token-data) tx-sender)))

;; Public Functions
(define-public (create-identity (hash (string-ascii 64)))
    (let ((token-id (+ (default-to u0 (map-get? user-identity tx-sender)) u1)))
        (begin
            (try! (nft-mint? digital-identity token-id tx-sender))
            (map-set identity-data token-id
                {
                    owner: tx-sender,
                    verified: false,
                    hash: hash,
                    timestamp: block-height,
                    kyc-level: u0
                })
            (map-set user-identity tx-sender token-id)
            (ok token-id))))


(define-public (update-identity-data
    (token-id uint)
    (new-hash (string-ascii 64)))
    (begin
        (asserts! (is-token-owner token-id) err-not-token-owner)
        (let ((current-data (unwrap! (map-get? identity-data token-id)
                err-invalid-user)))
            (map-set identity-data token-id
                (merge current-data {
                    hash: new-hash,
                    timestamp: block-height
                }))
            (ok true))))
