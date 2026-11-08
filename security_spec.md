# Security Specification - EdTech Primary School Management System

## 1. Data Invariants
1. **Strict Ownership (`ownerId == request.auth.uid`)**: Every record in `/users/{userId}`, `/lessons/{lessonId}`, `/students/{studentId}`, `/tt27_records/{recordId}`, `/emulation_scores/{scoreId}`, and `/timetable_slots/{slotId}` belongs exclusively to the authenticated teacher/administrator (`ownerId == request.auth.uid`).
2. **Verified Email**: Write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation**: `/users/{userId}` and `/students/{studentId}` contain PII (`email`, `parentPhone`, `address`) and are strictly readable only by the document owner (`resource.data.ownerId == request.auth.uid`).
4. **No Blanket List Reads**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid`.
5. **Immutable Audit Fields**: `ownerId` and `createdAt` cannot be modified after creation (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/lessons/L1` -> Rejected by `isSignedIn()`.
2. **Unverified Email Spoof**: `auth.token.email_verified = false`, creating `/users/u1` -> Rejected by `isVerifiedUser()`.
3. **Cross-Tenant Identity Spoofing**: `auth.uid = 'userA'`, payload `{ ownerId: 'userB', ... }` -> Rejected by `data.ownerId == request.auth.uid`.
4. **Shadow Field Injection**: Adding `{ isAdmin: true, hacked: 1 }` to `/students/S1` -> Rejected by `data.keys().hasOnly(...)`.
5. **ID Poisoning Attack**: Document ID with 500 characters or special characters `/lessons/a$b%c` -> Rejected by `isValidId(lessonId)`.
6. **Denial of Wallet String Overflow**: `lessonContentSummary` with 50,000 chars -> Rejected by `data.lessonContentSummary.size() <= 1000`.
7. **Ownership Transfer on Update**: Updating `ownerId` from `'userA'` to `'userB'` -> Rejected by `incoming().ownerId == existing().ownerId`.
8. **CreatedAt Tampering on Update**: Modifying `createdAt` timestamp -> Rejected by `incoming().createdAt == existing().createdAt`.
9. **Blanket List Scraping**: Listing `/students` without `where('ownerId', '==', uid)` -> Rejected by `allow list: if isSignedIn() && existing().ownerId == request.auth.uid`.
10. **PII Cross-User Read**: `auth.uid = 'userA'` attempting `get(/users/userB)` -> Rejected by `userId == request.auth.uid`.
11. **Invalid Enum Value**: Setting `role: 'SUPER_HACKER'` in `/users/u1` -> Rejected by `data.role in ['BGH', 'TO_TRUONG', 'GVCN', 'GVBM', 'TONG_PHU_TRACH']`.
12. **Value Type Poisoning on Update**: Updating `score` in `/lessons/L1` to a string `"ten"` -> Rejected by `isValidLessonRecord(incoming())` wrapping the `allow update` block.
