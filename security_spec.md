# VitalSource Security Specification

## Data Invariants
1. A patient's health metrics can only be created by the patient themselves.
2. A doctor can only read metrics of patients with whom they have a record in the system (simplified as any doctor for now, but hardened via `isDoctor` check).
3. Role (`patient` vs `doctor`) is immutable after creation.
4. Document IDs must be valid alphanumeric strings of reasonable length.
5. All timestamps must be server-generated (`request.time`).

## The Dirty Dozen Payloads (Red Team)
1. **Identity Spoofing**: Attempt to create a user profile with a different `uid`.
2. **Role Escalation**: Attempt to update a `patient` profile to a `doctor` role.
3. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a user document.
4. **Data Poisoning**: Attempt to write 1MB of junk text into a `notes` field.
5. **ID Hijacking**: Attempt to write a metric with a 1.5KB document ID.
6. **Cross-Tenant Read**: Patient A attempting to read Patient B's metrics.
7. **Timestamp Fraud**: Attempt to set a manual `createdAt` date in the past.
8. **Orphaned Writes**: Attempt to create a consultation for a non-existent patient ID (requires `get` check in rules).
9. **Bulk Scrape**: Authenticated user attempting to `list` all users without a specialized filter.
10. **Resource Exhaustion**: Sending an array of 10,000 metrics in one batch.
11. **PII Leak**: Non-doctor user attempting to `get` a private user profile.
12. **State Shortcutting**: Attempting to set a consultation status to `completed` without going through `scheduled`.

## Evaluation
| Vulnerability | Mitigation | Status |
|---------------|------------|--------|
| Identity Spoofing | `data.uid == request.auth.uid` | Protected |
| Role Escalation | `incoming().role == existing().role` | Protected |
| Shadow Field Injection | `isValidUser` strict key check | Protected |
| Resource Poisoning | `.size()` checks on strings | Protected |
| ID Poisoning | `isValidId()` on document IDs | Protected |
| Cross-Tenant Read | `isOwner(resource.data.userId)` | Protected |
| Timestamp Fraud | `data.timestamp == request.time` | Protected |
| PII Access | `allow list` checks `resource.data` | Protected |
