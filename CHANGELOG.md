## 1.0.7 (2026-05-14)

- **Bug Fixes:**
  - Fixed issue with serial number parsing in attendance records
  - Resolved buffer handling problems when reading fingerprint templates
  - Corrected timezone handling in attendance timestamps

- **Enhancements:**
  - Improved error handling for network communication
  - Added more comprehensive logging for debugging purposes
  - Enhanced performance when processing large batches of attendance records

- **Documentation:**
  - Updated README with examples for new error handling patterns
  - Added inline documentation for all public methods


Features
- User Service Refactoring: Migrated core user management logic to a dedicated UserService.
- ID-Based User Management: Updated methods to primarily use user_id (string) instead of the internal numerical uid for improved developer experience and consistency with hardware storage.
- Enhanced setUser: Added automatic uid generation when creating new users if the user_id does not exist.

> 🛠 Refactoring & Fixes
> - `index.ts`:
>  - `setUser()`: Signature changed to use user_id as the primary identifier.
>  - `deleteUser()`: Changed parameter from uid to user_id.
>  - `getUserTemplate()` / `deleteFinger()` / `enrollUser()`: All updated to use user_id and include better parameter documentation.
>  - `verifyUser()`: Now takes user_id instead of uid.
> - `UserService`:
>   - `getUserByUserId()`: Now includes an auto-fetch mechanism if the local cache is empty.
>   - `getUsers()`: Standardized return format.

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