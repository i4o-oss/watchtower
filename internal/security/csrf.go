package security

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"time"

	"github.com/i4o-oss/watchtower/internal/cache"
)

// CSRFConfig holds CSRF protection configuration
type CSRFConfig struct {
	TokenLength    int
	CookieName     string
	HeaderName     string
	FieldName      string
	TokenTTL       time.Duration
	SecureCookie   bool
	SameSite       http.SameSite
	SkipReferer    bool
	TrustedOrigins []string
}

// CSRFProtection provides CSRF protection functionality
type CSRFProtection struct {
	config CSRFConfig
	cache  cache.Cache
}

// Context key for CSRF skip flag
type csrfSkipKey struct{}

// skipCSRFKey is the key used to store the skip flag in context
var skipCSRFKey = csrfSkipKey{}

// NewCSRFProtection creates a new CSRF protection instance
func NewCSRFProtection(cache cache.Cache, config CSRFConfig) *CSRFProtection {
	// Set defaults
	if config.TokenLength == 0 {
		config.TokenLength = 32
	}
	if config.CookieName == "" {
		config.CookieName = "csrf_token"
	}
	if config.HeaderName == "" {
		config.HeaderName = "X-CSRF-Token"
	}
	if config.FieldName == "" {
		config.FieldName = "csrf_token"
	}
	if config.TokenTTL == 0 {
		config.TokenTTL = 24 * time.Hour
	}
	if config.SameSite == 0 {
		config.SameSite = http.SameSiteStrictMode
	}

	return &CSRFProtection{
		config: config,
		cache:  cache,
	}
}

// GenerateToken generates a new CSRF token
func (c *CSRFProtection) GenerateToken() (string, error) {
	bytes := make([]byte, c.config.TokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}

	token := base64.URLEncoding.EncodeToString(bytes)

	// Store token in cache
	key := fmt.Sprintf("csrf:token:%s", token)
	if err := c.cache.Set(key, true, c.config.TokenTTL); err != nil {
		return "", fmt.Errorf("failed to store CSRF token: %w", err)
	}

	return token, nil
}

// ValidateToken validates a CSRF token
func (c *CSRFProtection) ValidateToken(token string) bool {
	if token == "" {
		return false
	}

	key := fmt.Sprintf("csrf:token:%s", token)
	var exists bool
	if err := c.cache.Get(key, &exists); err != nil {
		return false
	}

	return exists
}

// InvalidateToken removes a token from the cache
func (c *CSRFProtection) InvalidateToken(token string) {
	key := fmt.Sprintf("csrf:token:%s", token)
	c.cache.Delete(key)
}

// SetTokenCookie sets the CSRF token as an HTTP cookie
func (c *CSRFProtection) SetTokenCookie(w http.ResponseWriter, token string) {
	cookie := &http.Cookie{
		Name:     c.config.CookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(c.config.TokenTTL.Seconds()),
		HttpOnly: false, // JavaScript needs to read this for AJAX requests
		Secure:   c.config.SecureCookie,
		SameSite: c.config.SameSite,
	}

	http.SetCookie(w, cookie)
}

// GetTokenFromRequest extracts CSRF token from request
func (c *CSRFProtection) GetTokenFromRequest(r *http.Request) string {
	// Try header first
	if token := r.Header.Get(c.config.HeaderName); token != "" {
		return token
	}

	// Try form field
	if token := r.FormValue(c.config.FieldName); token != "" {
		return token
	}

	// Try cookie as fallback
	if cookie, err := r.Cookie(c.config.CookieName); err == nil {
		return cookie.Value
	}

	return ""
}

// ValidateReferer validates the request referer against trusted origins
func (c *CSRFProtection) ValidateReferer(r *http.Request) bool {
	if c.config.SkipReferer {
		return true
	}

	referer := r.Header.Get("Referer")
	if referer == "" {
		// No referer header is considered valid for some use cases
		// but we'll be strict and require it
		return false
	}

	// Check against trusted origins
	for _, origin := range c.config.TrustedOrigins {
		if referer == origin || (len(referer) > len(origin) &&
			referer[:len(origin)] == origin && referer[len(origin)] == '/') {
			return true
		}
	}

	return false
}

// Middleware returns a middleware function for CSRF protection
func (c *CSRFProtection) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if CSRF should be skipped for this request
			if skip, ok := r.Context().Value(skipCSRFKey).(bool); ok && skip {
				next.ServeHTTP(w, r)
				return
			}

			// Skip CSRF for safe methods
			if r.Method == "GET" || r.Method == "HEAD" || r.Method == "OPTIONS" {
				// Generate and set token for safe methods
				token, err := c.GenerateToken()
				if err == nil {
					c.SetTokenCookie(w, token)
					// Also set as header for SPA use
					w.Header().Set(c.config.HeaderName, token)
				}
				next.ServeHTTP(w, r)
				return
			}

			// For unsafe methods, validate CSRF token
			token := c.GetTokenFromRequest(r)
			if !c.ValidateToken(token) {
				http.Error(w, "CSRF token validation failed", http.StatusForbidden)
				return
			}

			// Validate referer if configured
			if !c.ValidateReferer(r) {
				http.Error(w, "Invalid referer", http.StatusForbidden)
				return
			}

			// Token is valid, proceed with request
			next.ServeHTTP(w, r)
		})
	}
}

// SkipCSRFMiddleware returns a middleware that skips CSRF protection
// Use this for specific endpoints that need to bypass CSRF (like webhooks)
func (c *CSRFProtection) SkipCSRFMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Add skip flag to context
			ctx := context.WithValue(r.Context(), skipCSRFKey, true)
			r = r.WithContext(ctx)
			next.ServeHTTP(w, r)
		})
	}
}

// TokenResponse represents a CSRF token response
type TokenResponse struct {
	Token string `json:"csrf_token"`
}

// GetTokenHandler returns a handler that provides CSRF tokens
func (c *CSRFProtection) GetTokenHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, err := c.GenerateToken()
		if err != nil {
			http.Error(w, "Failed to generate CSRF token", http.StatusInternalServerError)
			return
		}

		c.SetTokenCookie(w, token)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		// Use a simple JSON encoding to avoid circular dependencies
		jsonResponse := fmt.Sprintf(`{"csrf_token":"%s"}`, token)
		w.Write([]byte(jsonResponse))
	}
}

// SecureCompare performs a constant-time comparison of two strings
func SecureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
