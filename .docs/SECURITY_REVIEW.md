# Security Review Report - Watchtower

**Review Date:** September 20, 2025

## Executive Summary

This comprehensive security review identified 21 security findings across authentication, input validation, CSRF protection, and other security domains. While the application demonstrates good security practices with GORM parameterized queries and input sanitization, several critical issues require immediate attention, particularly around admin authorization and session management.

## Critical Findings (Fix Immediately)

### F-01: Admin Routes Lack Role/Claims Checks
- **File:** `cmd/api/routes.go` lines 65-119
- **Issue:** Admin routes only check for authentication, not authorization. Any authenticated user can access admin endpoints.
- **Impact:** Privilege escalation vulnerability
- **Fix:** Add admin role checks to user model and middleware

### F-02: Session Fixation Risk on Login
- **File:** `cmd/api/auth.go` lines 208-213  
- **Issue:** Session ID not regenerated after successful login
- **Impact:** Session fixation attacks possible
- **Fix:** Regenerate session ID after authentication

### F-03: Weak Default Session Secret
- **File:** `cmd/api/auth.go` lines 32-36
- **Issue:** Hard-coded default secret "your-secret-key-change-this-in-production"
- **Impact:** Predictable session tokens in production
- **Fix:** Require 32-byte random SESSION_SECRET, fail startup if default used

## High Priority Findings

### F-07: CSRF Token Not Bound to Session
- **File:** `internal/security/csrf.go`
- **Issue:** Tokens replayable across different user sessions
- **Impact:** Cross-site request forgery possible
- **Fix:** Bind CSRF tokens to session IDs

### F-14: CORS Wildcard in SSE Handler
- **File:** `cmd/api/sse.go` line 218
- **Issue:** `Access-Control-Allow-Origin: *` with sensitive data in event streams
- **Impact:** Data exposure to unauthorized origins
- **Fix:** Restrict allowed origins for SSE endpoints

### F-05: SSE Payloads Bypass Sanitization
- **File:** `cmd/api/sse.go` lines 116-128, 178-186
- **Issue:** Endpoint names and incident titles not escaped in SSE responses
- **Impact:** Stored XSS if frontend renders raw event data
- **Fix:** Sanitize all SSE payload strings

## Medium Priority Findings

### F-04: Fragile Production Detection
- **File:** `cmd/api/auth.go` line 44
- **Issue:** Uses ENV variable while .env uses GO_ENV, causing insecure cookies
- **Fix:** Standardize environment detection

### F-08: Missing CSRF Header in CORS
- **File:** `cmd/api/middleware.go` lines 136-138
- **Issue:** X-CSRF-Token not in allowed headers list
- **Fix:** Add X-CSRF-Token to CORS allowed headers

### F-10: Excessive Token Generation
- **File:** `internal/security/csrf.go` lines 177-185
- **Issue:** New CSRF token generated on every GET request
- **Impact:** Redis flooding and performance degradation
- **Fix:** Cache one token per session

### F-16: Session Configuration Issues
- **Issue:** No inactivity timeout, fixed 7-day MaxAge
- **Fix:** Implement sliding expiration or shorter TTL

### F-19: Rate Limiting IP Spoofing
- **Issue:** No X-Forwarded-For validation for rate limiting
- **Fix:** Add trusted proxy list and proper IP extraction

## Low Priority Findings

### F-06: Input Validation Gaps
- **Issue:** Some notification and settings fields may bypass sanitization
- **Fix:** Ensure all input paths use validation helpers

### F-09: Referer Check Configuration
- **Issue:** Different behavior in dev vs production for CSRF referer checks
- **Fix:** Document and test proxy scenarios thoroughly

### F-11-F13: Secret Management
- **Issues:** 
  - Short, readable secrets in .env.example
  - Unused JWT_SECRET variable
  - No cross-environment secret validation
- **Fix:** Generate strong defaults, remove dead secrets, add validation

### F-15: Error Information Leakage
- **Issue:** Internal stack traces in logs could expose sensitive info
- **Fix:** Use structured logging with redaction

### F-18: Database Error Exposure
- **File:** `cmd/api/auth.go` line 118
- **Issue:** Full DB errors logged, could leak DSNs
- **Fix:** Implement log sanitization

### F-20-F21: CORS Configuration
- **Issues:**
  - Exact string matching for origins (no regex/wildcards)
  - Missing Access-Control-Expose-Headers
- **Fix:** Improve origin matching, expose rate limit headers

## Dependency Security

### F-22: Outdated Dependencies
- **Go:** Run `govulncheck ./...` regularly
- **Node:** Run `npm audit` for frontend dependencies  
- **Issue:** gorilla/sessions is archived, needs replacement
- **Fix:** Migrate to github.com/alexedwards/scs or similar

## Content Security Policy

### F-23: Unsafe CSP Directives
- **Issue:** Default CSP includes `'unsafe-inline'` and `'unsafe-eval'`
- **Fix:** Remove unsafe-eval, gate unsafe-inline behind dev flag only

## Quick-Fix Checklist

1. ✅ **Enforce admin role checks** on `/admin` routes
2. ✅ **Regenerate session ID** on login; require strong SESSION_SECRET
3. ✅ **Bind CSRF tokens** to sessions & add to CORS headers  
4. ✅ **Restrict SSE CORS** origins and sanitize outbound strings
5. ✅ **Remove unsafe CSP** directives from production
6. ✅ **Harden secrets** management and validation
7. ✅ **Add CORS expose headers** for rate limiting
8. ✅ **Implement proxy-aware** IP extraction
9. ✅ **Upgrade session library** from archived gorilla/sessions
10. ✅ **Add automated dependency scanning** to CI pipeline

## Recommendations

1. **Implement security testing** in CI/CD pipeline
2. **Add security headers** testing and validation
3. **Consider implementing** Content Security Policy reporting
4. **Regular security audits** and dependency updates
5. **Add logging and monitoring** for security events
6. **Implement security** incident response procedures

## Testing Recommendations

- Add security-focused unit tests for auth middleware
- Implement integration tests for CSRF protection
- Test session management edge cases
- Validate CORS configuration with different origins
- Test rate limiting with various IP scenarios

---

*This review covers the current state of the codebase as of September 20, 2025. Regular security reviews should be conducted as the application evolves.*
