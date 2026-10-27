# Security Specification — The Best Windows Firestore Rules

## 1. Data Invariants
1. **Default-Deny Global Gate**: Every path outside explicitly declared collections (`/test/connection`, `/settings/pricing`, `/admin_gate/{gateId}`, `/quotes/{quoteId}`, `/customers/{customerId}`) is denied for all reads and writes.
2. **Pricing Config Integrity (`/settings/pricing`)**:
   - Publicly readable via single-document `get` (`allow list: if false`, `allow delete: if false`).
   - Must contain at least 1 profile (`profiles.size() >= 1`, `profileOrder.size() >= 1`), bounded maps/lists (`<= 200`), strict key allowlist, `serverUpdatedAt == request.time`, and monotonically increasing integer `version` (`incoming().version > existing().version` on update).
   - Writes are strictly gated: requires either verified Google admin (`mohamed.m.alhasaneen@gmail.com` with `email_verified == true`) OR an atomic batch write updating `/admin_gate/pricing_write` in the same commit (`getAfter(...).data.verifiedAt == request.time`).
3. **Write-Only Cryptographic Admin Gate (`/admin_gate/{gateId}`)**:
   - `allow read, delete: if false;` — strictly unreadable by all clients.
   - Only `gateId in ['auth_check', 'pricing_write']` allowed.
   - Requires exact keys `['proof', 'verifiedAt']`, 64-char lowercase hex `proof`, `verifiedAt == request.time`, and server-side salted SHA-256 verification matching the expected digest (or verified Google admin).
4. **Quotes & Customers (`/quotes/{quoteId}`, `/customers/{customerId}`)**:
   - Validated via `isValidDocId`, strict `hasAll`/`hasOnly` schema helpers, bounded string/list/map sizes, and non-negative numeric checks.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Direct Pricing Overwrite**: `setDoc('/settings/pricing', validPricingPayload)` without atomic `/admin_gate/pricing_write` batch -> Rejected (`getAfter` check fails).
2. **Wrong Passcode Proof in Batch**: Atomic batch writing invalid 64-char hex `proof` to `/admin_gate/pricing_write` + `/settings/pricing` -> Rejected (`hasValidPasscodeProof` SHA-256 mismatch).
3. **Replay Attack on Admin Gate**: Reading `/admin_gate/pricing_write` to steal `proof` -> Rejected (`allow read: if false`).
4. **Stale Timestamp Replay**: Sending client `Timestamp` instead of `serverTimestamp()` for `verifiedAt` or `serverUpdatedAt` -> Rejected (`== request.time` fails).
5. **Stale Version Downgrade / Overwrite**: Updating `/settings/pricing` with `version <= existing().version` -> Rejected (`incoming().version > existing().version` fails).
6. **Empty Profiles DoS**: Updating `/settings/pricing` with `profiles: {}` or `profileOrder: []` -> Rejected (`profiles.size() >= 1 && profileOrder.size() >= 1` fails).
7. **Shadow Field Injection**: Writing `{ ...validPricingPayload, isAdmin: true }` to `/settings/pricing` -> Rejected (`keys().hasOnly(...)` fails).
8. **Email Spoofing Attack**: Authenticated user with `email == 'mohamed.m.alhasaneen@gmail.com'` but `email_verified == false` attempting pricing write -> Rejected (`email_verified == true` check fails).
9. **Pricing Deletion Attack**: `deleteDoc('/settings/pricing')` -> Rejected (`allow delete: if false`).
10. **Settings Collection Scraping**: `getDocs(collection(db, 'settings'))` -> Rejected (`allow list: if false`).
11. **Oversized Document ID Poisoning**: Creating `/quotes/<300-char-junk>` -> Rejected (`isValidDocId` fails).
12. **Value Poisoning on Update**: Updating `totalPrice` on `/quotes/q1` with a string `"free"` or negative `-500` -> Rejected (`isValidQuote` enforces `totalPrice is number && totalPrice >= 0`).

## 3. Red Team Audit Summary
- **Shadow Update Test**: PASS (`hasOnly` enforced on all collections in both `create` and `update`).
- **Email Spoofing Test**: PASS (`request.auth.token.email_verified == true` enforced in `isBootstrappedAdmin()`).
- **Value Poisoning Test**: PASS (`isValidPricingConfig`, `isValidAdminGate`, `isValidQuote`, and `isValidCustomer` wrap every `create` and `update` path).
- **Atomicity / Stale Overwrite Test**: PASS (`getAfter` enforces atomic gate verification; `incoming().version > existing().version` prevents stale overwrites).
