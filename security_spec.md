# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **PII Isolation**: `users/{userId}` holds `email` and is readable/writable strictly by `request.auth.uid == userId`. No list access is permitted on `/users`.
2. **Unique Username Integrity**: `usernames/{username}` enforces lowercase `^[a-z0-9_]{3,20}$` document IDs matching `data.username` and `data.uid == request.auth.uid`. One user cannot overwrite or hijack another user's username document.
3. **Chat Participant Isolation**: `chats/{chatId}` strictly contains 2 distinct valid participant UIDs, and `request.auth.uid` must be in `participants`. Non-participants cannot read, list, create, or update any chat or subcollection.
4. **Master Gate Enforcement**: All subcollections (`/chats/{chatId}/messages/{messageId}` and `/chats/{chatId}/memberStates/{userId}`) fetch the parent `/chats/{chatId}` via `get()` (or `getAfter()` for atomic initial message/state creation) to verify `request.auth.uid in chat.data.participants`.
5. **Sender & Read-Receipt Integrity**: Only the sender (`senderId == request.auth.uid`) can create a message (`status == 'sent'`, `isDeleted == false`) or soft-delete their own message. Only the recipient (`request.auth.uid != existing().senderId`) can transition `status` from `'sent'` to `'read'` (terminal state).
6. **Temporal & Immutable Field Integrity**: `createdAt` must equal `request.time` on creation and never change on update. `updatedAt`/`readAt`/`editedAt` must equal `request.time` on update.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **PII Cross-Read**: User B attempts `getDoc('/users/userA')` -> DENIED (owner-only).
2. **User Directory Scraping**: User B attempts `list('/users')` -> DENIED (no list on `/users`).
3. **Username Hijack**: User B attempts `setDoc('/usernames/alice', { uid: 'userB', ... })` when `/usernames/alice` belongs to User A -> DENIED.
4. **Shadow Ghost Field on Profile**: User A creates `/publicProfiles/userA` with extra field `isAdmin: true` -> DENIED (`hasOnly` check).
5. **Unauthenticated / Anonymous Write**: Unauthenticated or anonymous user attempts to write a message -> DENIED (`isVerified()` requires non-anonymous sign-in).
6. **Non-Participant Chat Spy**: User C attempts `getDoc('/chats/userA_userB/messages/msg1')` -> DENIED (Master Gate fails).
7. **Chat Participant Tampering**: User A updates `/chats/userA_userB` to replace `participants` with `['userA', 'userC']` -> DENIED (`affectedKeys` + immutability).
8. **Sender Spoofing**: User A creates `/chats/userA_userB/messages/msg1` with `senderId: 'userB'` -> DENIED (`senderId == request.auth.uid`).
9. **Self-Read Manipulation**: User A creates a message directly with `status: 'read'` -> DENIED (`status == 'sent'` on create).
10. **Read-Receipt Revert (Terminal State Bypass)**: User B updates a `'read'` message back to `status: 'sent'` -> DENIED.
11. **Oversized Message / ID Poisoning**: User A sends a message with `text` > 2000 chars or `messageId` > 128 chars -> DENIED.
12. **Client Timestamp Forgery**: User A creates a message with `createdAt: Timestamp(2099-01-01)` -> DENIED (`createdAt == request.time`).
