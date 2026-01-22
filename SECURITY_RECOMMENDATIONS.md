# Security Recommendations for Stock Stickies Application

## Critical Security Issues

### 1. **Exposed Firebase API Keys in Client-Side Code** ⚠️ CRITICAL
**Location:** Lines 28-35 in `index.html`

**Issue:** Firebase configuration including API keys are hardcoded in the client-side HTML file. While Firebase API keys are meant to be public, they should still be protected with proper security rules.

**Recommendations:**
- ✅ **Firebase Security Rules:** Implement strict Firestore security rules to prevent unauthorized access
- ✅ **App Check:** You're already using App Check (line 49), which is good - ensure it's properly configured
- ✅ **API Key Restrictions:** In Firebase Console, restrict the API key to specific domains/IPs
- ✅ **Environment Variables:** Consider moving to environment-based configuration for different environments (dev/staging/prod)

**Firestore Security Rules Example:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

### 2. **API Keys Stored in Plaintext in Firestore** ⚠️ HIGH
**Location:** Lines 158-159, 177, 246

**Issue:** User-provided API keys (Finnhub and MarketAux) are stored in Firestore without encryption. If Firestore is compromised, these keys are exposed.

**Recommendations:**
- ✅ **Client-Side Encryption:** Encrypt API keys before storing in Firestore using Web Crypto API
- ✅ **Backend Proxy:** Move API calls to a backend service that stores keys securely
- ✅ **Environment Variables:** Store keys server-side and proxy requests through your backend
- ✅ **Key Rotation:** Implement a mechanism for users to rotate their API keys

**Example Encryption Implementation:**
```javascript
// Encrypt before storing
async function encryptApiKey(key, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    data
  );
  return { encrypted: Array.from(encrypted), iv: Array.from(iv) };
}
```

---

### 3. **API Keys Exposed in URLs** ⚠️ HIGH
**Location:** Lines 317, 334, 338, 345, 426, 457, 577

**Issue:** API keys are passed as query parameters in URLs, which can be logged in:
- Browser history
- Server logs
- Network monitoring tools
- Browser developer tools

**Recommendations:**
- ✅ **Use Request Headers:** Move API keys to HTTP headers instead of query parameters
- ✅ **Backend Proxy:** Route all API calls through a backend service
- ✅ **PostMessage API:** If using iframes, use postMessage instead of URL parameters

**Example:**
```javascript
// Instead of:
fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`)

// Use:
fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}`, {
  headers: {
    'X-API-Key': apiKey
  }
})
```

---

### 4. **Missing Content Security Policy (CSP)** ⚠️ MEDIUM
**Issue:** No Content Security Policy headers are set, leaving the application vulnerable to XSS attacks.

**Recommendations:**
- ✅ **Add CSP Meta Tag:** Include CSP in the HTML head
- ✅ **Strict CSP:** Implement a strict CSP that only allows necessary resources

**Example CSP:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
  img-src 'self' data: https:;
  connect-src 'self' https://finnhub.io https://api.marketaux.com https://*.firebaseio.com https://*.googleapis.com;
  font-src 'self' data:;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

---

### 5. **Missing Security Headers** ⚠️ MEDIUM
**Issue:** No security headers are configured to protect against common attacks.

**Recommendations:**
- ✅ **X-Frame-Options:** Prevent clickjacking
- ✅ **X-Content-Type-Options:** Prevent MIME type sniffing
- ✅ **Referrer-Policy:** Control referrer information
- ✅ **Permissions-Policy:** Restrict browser features

**Note:** These headers typically need to be set server-side. If using a static host, configure them in your hosting platform.

**Example (if using Express.js or similar):**
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

---

### 6. **No Input Validation/Sanitization** ⚠️ MEDIUM
**Location:** User input fields throughout the application

**Issue:** While React escapes content by default, there's no explicit validation or sanitization of:
- Note titles and content
- Ticker symbols
- API keys
- Nicknames

**Recommendations:**
- ✅ **Input Length Limits:** Enforce maximum lengths to prevent DoS
- ✅ **Ticker Validation:** Validate ticker symbols match expected format (uppercase letters, 1-5 characters)
- ✅ **API Key Format Validation:** Validate API key formats before storing
- ✅ **Sanitize User Content:** Use a library like DOMPurify if rendering HTML

**Example:**
```javascript
const validateTicker = (ticker) => {
  const tickerRegex = /^[A-Z]{1,5}$/;
  return tickerRegex.test(ticker.trim().toUpperCase());
};

const validateApiKey = (key, type) => {
  if (type === 'finnhub') {
    return /^[a-zA-Z0-9]{20,}$/.test(key); // Example format
  }
  if (type === 'marketaux') {
    return /^[a-zA-Z0-9]{32,}$/.test(key); // Example format
  }
  return false;
};

// Apply limits
const MAX_TITLE_LENGTH = 10; // For tickers
const MAX_CONTENT_LENGTH = 10000; // For note content
const MAX_NICKNAME_LENGTH = 50;
```

---

### 7. **localStorage Security Concerns** ⚠️ MEDIUM
**Location:** Lines 122, 407, 477, 509, 590

**Issue:** Sensitive data (portfolio prices) is cached in localStorage, which is accessible to any script on the page and vulnerable to XSS attacks.

**Recommendations:**
- ✅ **Encrypt Sensitive Data:** Encrypt data before storing in localStorage
- ✅ **Use sessionStorage:** For temporary data, use sessionStorage instead
- ✅ **Clear on Logout:** Explicitly clear localStorage on logout
- ✅ **Consider IndexedDB:** For larger datasets with better security controls

**Example:**
```javascript
// Encrypt before storing
const encryptData = async (data, key) => {
  // Use Web Crypto API to encrypt
  // ... encryption logic
};

// Decrypt after retrieving
const decryptData = async (encryptedData, key) => {
  // Use Web Crypto API to decrypt
  // ... decryption logic
};

// Clear on logout
const handleLogout = async () => {
  localStorage.removeItem('portfolio_prices_cache');
  // ... other cleanup
  await auth.signOut();
};
```

---

### 8. **No Rate Limiting on API Calls** ⚠️ MEDIUM
**Location:** Stock data fetching functions

**Issue:** Client-side API calls have no rate limiting, which could:
- Exhaust user's API quotas
- Lead to unexpected costs
- Be exploited by malicious users

**Recommendations:**
- ✅ **Client-Side Throttling:** Implement request throttling/debouncing
- ✅ **Backend Rate Limiting:** Move API calls to backend with rate limiting
- ✅ **Request Queuing:** Queue requests and process them with delays
- ✅ **Cache Aggressively:** Use longer cache times to reduce API calls

**Example:**
```javascript
// Throttle function
const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }
  };
};

// Apply to API calls
const throttledFetchStock = throttle(fetchStockData, 5000); // 5 second minimum between calls
```

---

### 9. **Error Messages May Leak Information** ⚠️ LOW
**Location:** Error handling throughout the application

**Issue:** Error messages might expose sensitive information about the system.

**Recommendations:**
- ✅ **Generic Error Messages:** Show user-friendly messages, log detailed errors server-side
- ✅ **Error Logging:** Implement proper error logging (e.g., Sentry, LogRocket)
- ✅ **Sanitize Error Messages:** Don't expose stack traces or internal details

**Example:**
```javascript
try {
  // API call
} catch (error) {
  console.error('Detailed error:', error); // Log for debugging
  setStockError('Unable to fetch stock data. Please try again later.'); // User-friendly message
}
```

---

### 10. **Missing HTTPS Enforcement** ⚠️ LOW
**Issue:** No explicit HTTPS enforcement in the code (though this is typically handled by the hosting platform).

**Recommendations:**
- ✅ **HTTPS Redirect:** Ensure your hosting platform redirects HTTP to HTTPS
- ✅ **HSTS Header:** Set Strict-Transport-Security header (server-side)
- ✅ **Mixed Content:** Ensure all resources load over HTTPS

---

## Additional Security Best Practices

### 11. **Authentication Security**
- ✅ **Password Requirements:** Enforce strong password requirements (if not using Firebase Auth defaults)
- ✅ **Session Management:** Firebase handles this, but ensure proper logout
- ✅ **Email Verification:** Consider requiring email verification for new accounts

### 12. **Data Privacy**
- ✅ **GDPR Compliance:** If serving EU users, implement GDPR compliance features
- ✅ **Data Retention:** Implement data retention policies
- ✅ **User Data Export:** Allow users to export their data
- ✅ **Account Deletion:** Implement proper account deletion that removes all user data

### 13. **Dependency Security**
- ✅ **Regular Updates:** Keep all dependencies (React, Firebase, Chart.js) updated
- ✅ **Vulnerability Scanning:** Use tools like `npm audit` or Snyk
- ✅ **Subresource Integrity (SRI):** Add integrity checks for CDN resources

**Example SRI:**
```html
<script 
  src="https://unpkg.com/react@18/umd/react.production.min.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

### 14. **Monitoring and Logging**
- ✅ **Security Monitoring:** Monitor for suspicious activities
- ✅ **Audit Logs:** Log authentication events and data access
- ✅ **Anomaly Detection:** Alert on unusual patterns (e.g., rapid API calls)

---

## Implementation Priority

1. **Immediate (Critical):**
   - Implement Firestore security rules
   - Move API keys to headers or backend proxy
   - Add Content Security Policy

2. **Short-term (High):**
   - Encrypt API keys before storing
   - Add input validation
   - Implement rate limiting

3. **Medium-term (Medium):**
   - Add security headers
   - Encrypt localStorage data
   - Improve error handling

4. **Long-term (Low):**
   - Implement comprehensive monitoring
   - Add data export/deletion features
   - Regular security audits

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
