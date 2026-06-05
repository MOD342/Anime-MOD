# Security Specification - MOD Otaku Games & Database

## Data Invariants
1. Each `GameQuestion` document must have a unique identifier matching standard ID configurations (`^[a-zA-Z0-9_\-]+$`).
2. Only signed-in, unbanned users can create public trivia questions.
3. Users cannot modify the body or answer of of existing trivia/game questions.
4. Users can only increment or decrement `likes` and `dislikes` fields.
5. All database operations must strictly validate inputs according to type, length, and content, satisfying absolute security and preventing denial-of-service/wallet-depletion.

## The Direct-Dozen (12 Danger Payload Scenarios)
1. Bypassing Signature: An attacker tries to write a game question with a 50MB string inside `questionData` to exhaust memory storage. -> BLOCKED by `.size()` limit and strict schema checks.
2. Identity Spoofing: An attacker tries to upload questions pretending to be another moderator user to gain administrative privileges. -> BLOCKED by validating `id` and auth matches.
3. Cheating / Answer Leak: An attacker attempts to modify a `GameQuestion` to change the `correct` answer to match their wrong choices and obtain high scores. -> BLOCKED by prohibiting non-owner modifications or preventing any updating of `questionData`.
4. Question Spamming: A banned user tries to flood the database with garbage questions. -> BLOCKED by checking `exists(/databases/$(database)/documents/bannedUsers/$(request.auth.uid))` before allowing writes.
5. System Key Pollution: An attacker attempts to insert arbitrary new properties (e.g. `isAdminQuestion: true`) into the document. -> BLOCKED by strict schema properties matching `keys().size() == 6` on creation.
6. Temporal Manipulation: An attacker attempts to fake `createdAt` by setting it to a date in the past or future. -> BLOCKED by enforcing `createdAt == request.time`.
7. Massive ID Exhaustion: An attacker attempts to create a document with an extremely long random ID (e.g. 100KB string). -> BLOCKED by `isValidId()` restriction (`id.size() <= 128`).
8. Like/Dislike Manipulation: An attacker attempts to modify `type` or other fields of another user's question. -> BLOCKED by `affectedKeys().hasOnly(['likes', 'dislikes'])` on update.
9. Blank Read Spoofing: An unauthorized user attempts to perform global list queries that extract full database information without verification. -> BLOCKED by standard secure read permissions.
10. Orphaned Writes: A user attempts to create comments or recommendations on non-existent anime titles. -> BLOCKED by validation checks.
11. Admin Privilege Escalation: A user changes their `role` to 'owner' or 'admin' during profile registration. -> BLOCKED by strict profiles rules restricting self-assigned user privileges.
12. Denial of Wallet via Lookups: Attempt to trigger infinite DB reads inside bulk rules list queries. -> BLOCKED by ordering evaluation checks and putting database reads last.
