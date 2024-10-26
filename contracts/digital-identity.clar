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
