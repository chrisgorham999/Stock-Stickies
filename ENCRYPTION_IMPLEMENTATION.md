# API Key Encryption Implementation

## Overview

This document explains how API key encryption has been implemented to secure user API keys stored in Firestore.

## Implementation Details

### Encryption Method

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Key Source**: Derived from user's Firebase UID + application salt
- **IV**: Random 12-byte IV generated for each encryption
- **Storage Format**: Base64-encoded encrypted data with IV

### Security Features

1. **User-Specific Keys**: Each user's encryption key is derived from their unique Firebase UID
2. **Strong Encryption**: AES-GCM provides authenticated encryption
3. **Random IVs**: Each encryption uses a unique IV, preventing pattern analysis
4. **Backward Compatibility**: Automatically handles legacy unencrypted keys

### Functions

#### `getEncryptionKey(userId)`
Derives an encryption key from the user's Firebase UID using PBKDF2.

#### `encryptApiKey(apiKey, userId)`
Encrypts an API key before storing in Firestore.
- Returns: `{ encrypted: string, iv: string, version: '1' }`
- Returns: `null` if encryption fails

#### `decryptApiKey(encryptedData, userId)`
Decrypts an API key after loading from Firestore.
- Handles both encrypted (object) and legacy unencrypted (string) formats
- Returns: Decrypted API key string or empty string on failure

### Migration Strategy

The implementation automatically migrates old unencrypted keys:

1. **Loading**: When loading from Firestore, if the data is a plain string (legacy format), it's returned as-is
2. **Saving**: When saving, all API keys are encrypted (if they exist)
3. **Result**: Old keys are automatically encrypted on the next save operation

### Code Locations

- **Encryption Functions**: Lines ~163-250 (after validation functions)
- **Loading (Decryption)**: `useEffect` hook around line 332-355
- **Saving (Encryption)**: 
  - Auto-save `useEffect` around line 370-400
  - `beforeunload` handler around line 402-425
  - `syncNow()` function around line 472-495

### Security Considerations

1. **Key Derivation**: The encryption key is derived from the user's UID, which means:
   - Keys are unique per user
   - Keys cannot be recovered without the user's UID
   - If a user's account is deleted, their encrypted keys become unrecoverable

2. **Salt**: A fixed application salt is used. For enhanced security in production, consider:
   - Using a per-user salt stored in Firestore
   - Rotating the salt periodically
   - Using environment variables for the salt

3. **Error Handling**: Encryption/decryption errors are logged but don't break the application. Failed decryption returns an empty string.

4. **Performance**: 
   - Encryption/decryption is asynchronous and non-blocking
   - PBKDF2 with 100,000 iterations takes ~100-200ms per operation
   - Operations are cached in memory (decrypted keys stored in state)

### Testing

To test the implementation:

1. **New User**: Add API keys - they should be encrypted in Firestore
2. **Existing User**: Existing unencrypted keys should work and be encrypted on next save
3. **Decryption**: Verify API keys work correctly after being encrypted/decrypted
4. **Error Cases**: Test with invalid encrypted data to ensure graceful handling

### Future Enhancements

1. **Per-User Salt**: Store a unique salt per user in Firestore for additional security
2. **Key Rotation**: Implement a mechanism to re-encrypt keys with a new salt
3. **Backend Proxy**: Move to a backend service that handles encryption server-side
4. **Key Derivation Improvement**: Use a more sophisticated key derivation method

### Notes

- The encryption key is derived client-side, which means it's accessible to anyone with access to the code
- This provides protection against database breaches but not against client-side attacks
- For maximum security, consider moving API key storage to a backend service
- The current implementation provides a good balance between security and simplicity for a client-side application
