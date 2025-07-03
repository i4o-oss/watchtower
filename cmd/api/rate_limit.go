package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/i4o-oss/watchtower/internal/cache"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstLimit        int
}

// Default rate limits for different endpoint types
var (
	DefaultRateLimit = RateLimitConfig{
		RequestsPerMinute: 60,
		BurstLimit:        10,
	}

	AuthRateLimit = RateLimitConfig{
		RequestsPerMinute: 10, // Stricter for auth endpoints
		BurstLimit:        3,
	}

	PublicAPIRateLimit = RateLimitConfig{
		RequestsPerMinute: 120, // More generous for public API
		BurstLimit:        20,
	}
)

// rateLimitMiddleware provides rate limiting functionality
func (app *Application) rateLimitMiddleware(config RateLimitConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get client IP
			clientIP := getClientIP(r)

			// Create rate limit key
			endpoint := getEndpointKey(r)
			rateLimitKey := fmt.Sprintf(cache.CacheKeyRateLimit, clientIP, endpoint)

			// Check current request count
			count, err := app.cache.IncrementWithExpiry(rateLimitKey, cache.RateLimitExpire)
			if err != nil {
				app.logger.Error("Rate limit cache error", "err", err.Error())
				// On cache error, allow request to proceed
				next.ServeHTTP(w, r)
				return
			}

			// Check if rate limit exceeded
			if count > int64(config.RequestsPerMinute) {
				// Rate limit exceeded
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.RequestsPerMinute))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(cache.RateLimitExpire).Unix(), 10))

				app.errorResponse(w, http.StatusTooManyRequests, "Rate limit exceeded")
				return
			}

			// Set rate limit headers
			remaining := config.RequestsPerMinute - int(count)
			if remaining < 0 {
				remaining = 0
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.RequestsPerMinute))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(cache.RateLimitExpire).Unix(), 10))

			next.ServeHTTP(w, r)
		})
	}
}

// getClientIP extracts the client IP from request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	xrip := r.Header.Get("X-Real-IP")
	if xrip != "" {
		return xrip
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}

	return ip
}

// getEndpointKey creates a normalized endpoint key for rate limiting
func getEndpointKey(r *http.Request) string {
	// Normalize path to group similar endpoints
	path := r.URL.Path
	method := r.Method

	// Group dynamic endpoints
	// /api/v1/admin/endpoints/{id} -> /api/v1/admin/endpoints/{}
	path = normalizePath(path)

	return fmt.Sprintf("%s:%s", method, path)
}

// normalizePath normalizes dynamic paths for rate limiting
func normalizePath(path string) string {
	// Replace UUIDs and IDs with placeholders
	parts := strings.Split(path, "/")
	for i, part := range parts {
		// Check if part looks like a UUID or numeric ID
		if isUUID(part) || isNumericID(part) {
			parts[i] = "{id}"
		}
	}

	return strings.Join(parts, "/")
}

// isUUID checks if a string looks like a UUID
func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}

	// Simple UUID pattern check
	parts := strings.Split(s, "-")
	if len(parts) != 5 {
		return false
	}

	// Check lengths: 8-4-4-4-12
	expectedLengths := []int{8, 4, 4, 4, 12}
	for i, part := range parts {
		if len(part) != expectedLengths[i] {
			return false
		}
	}

	return true
}

// isNumericID checks if a string is a numeric ID
func isNumericID(s string) bool {
	if len(s) == 0 || len(s) > 10 { // Reasonable limits
		return false
	}

	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}

	return true
}

// Rate limit bypass for internal/health checks
func (app *Application) bypassRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip rate limiting for health checks and internal requests
		if strings.HasPrefix(r.URL.Path, "/health") ||
			strings.HasPrefix(r.URL.Path, "/metrics") ||
			r.Header.Get("X-Internal-Request") != "" {
			next.ServeHTTP(w, r)
			return
		}

		// Apply default rate limiting
		app.rateLimitMiddleware(DefaultRateLimit)(next).ServeHTTP(w, r)
	})
}
