# JurisCrypt Security Specification

## Data Invariants
1. **Case Integrity**: A case must have a valid `petitionerId` matching the creator's UID.
2. **Status Transitions**: Only users with the `judge` role can modify a case's `status`.
3. **Identity Protection**: User roles (`petitioner`, `judge`, `court_clerk`) are stored in `/users/{uid}` and cannot be self-assigned or modified by the user.
4. **Permanent Audit**: `filedAt` timestamps are immutable after creation.

## The Dirty Dozen Payloads (Unauthorized Attempts)

1. **Self-Promotion**: Authenticated user trying to set `role: 'judge'` on their own profile.
2. **Case Hijacking**: User A trying to update Case B (owned by User B).
3. **Status Forgery**: Petitioner trying to set Case status to `resolved` without judicial review.
4. **Timestamp Manipulation**: Updating `filedAt` to a backdated value.
5. **Orphaned Case**: Creating a case with a `petitionerId` that doesn't match `request.auth.uid`.
6. **Malicious ID**: Using a 2KB string as a case ID.
7. **Cross-User Leak**: Non-judge user listing all cases (should only list their own).
8. **Summon Tampering**: Recipient trying to delete a judicial summon.
9. **Ghost Field Injection**: Adding `isCourtApproved: true` to a case payload.
10. **Precedent Corruption**: Unauthorized user trying to write to the `precedents` archive.
11. **Email Spoofing**: Accessing PII with a non-verified email.
12. **Role Escalation**: Petitioner trying to write to `/users` with a role field.

## Failure Scenarios (Audit Table)

| Collection | Attack Scenario | Rule Safeguard | Status |
|---|---|---|---|
| `/users` | Modify own role | `!incoming().diff(existing()).affectedKeys().hasAny(['role'])` | ✅ |
| `/cases` | Update status by owner | `isJudgeAction() && isAdmin()` | ✅ |
| `/cases` | Edit other's case | `resource.data.petitionerId == request.auth.uid` | ✅ |
| `/precedents` | Anonymous write | `allow write: if false` | ✅ |
