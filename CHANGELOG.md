## 1.0.6
- **Refactor (Attendance Model):** Updated `Attendance` class constructor and properties.
    - Reordered constructor parameters for better consistency.
    - Added JSDoc comments to all properties (`sn`, `user_id`, `type`, `record_time`, etc.).
    - Improved default value handling for `type` and `state`.
- **Architecture Refactor:** Moved logic from `ztcp.ts` into specialized service classes for a cleaner code separation.
    - Created `UserService` to handle user-related operations (fetching users, templates, enrollment, etc.).
    - Created `TransactionService` to manage attendance logs and record processing.
    - Updated `ZTCP` to act as a communication layer, delegating domain logic to `_userService` and `_transactionService`.
- **Documentation (Commands):** Comprehensive update to `COMMANDS` enum.
    - Added detailed JSDoc comments and hex code references for many protocol commands (e.g., `CMD_ACK_OK`, `CMD_AUTH`, `CMD_CONNECT`).
- **Testing:** Added `tests/Template.test.ts` containing integration tests for:
    - User template retrieval.
    - Base64 fingerprint template uploading.
    - Fingerprint deletion.

## 1.0.5

## 1.0.4
- Better Types implementation. 

## 1.0.4-development (2025-12)
- Fix extraneous values when parsing buffers in serial number, for example.
- Added method getNetworkParams()
- update jest dependencie, due to security risks.

## 1.0.3-development  (2025-05)
- Changed attendance record time to UTC. since its imposible to set timezone in some devices.


## 1.0.2-development (2025-05)
- Fixed Read with buffer, now i can get all Finger templates.
- Changed commands constant to enums.
- Added short comments for every command.

## 1.0.0 (2025-03) 
Huge Changes in this version. featured by implementation of Typescript.
-  Added support for devices with communication Key
- Get All Templates.
- Delete a Template by Id.
- Enroll User.
- Copy templates between users.
- Testing refactor with Jest.