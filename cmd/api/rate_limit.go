package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/i4o-oss/watchtower/internal/cache"
	"github.com/i4o-oss/watchtower/internal/data"
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

	// User-based rate limits
	AuthenticatedUserRateLimit = RateLimitConfig{
		RequestsPerMinute: 300, // More generous for authenticated users
		BurstLimit:        50,
	}

	AnonymousUserRateLimit = RateLimitConfig{
		RequestsPerMinute: 60, // Standard for anonymous users
		BurstLimit:        10,
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

				// Track rate limit violation for monitoring
				app.rateLimitMonitor(clientIP, nil, true)

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

			// Track successful request for monitoring
			app.rateLimitMonitor(clientIP, nil, false)

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

// userAwareRateLimitMiddleware applies different rate limits based on user authentication status
func (app *Application) userAwareRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip rate limiting for health checks and internal requests
		if strings.HasPrefix(r.URL.Path, "/health") ||
			strings.HasPrefix(r.URL.Path, "/metrics") ||
			r.Header.Get("X-Internal-Request") != "" {
			next.ServeHTTP(w, r)
			return
		}

		// Get client IP
		clientIP := getClientIP(r)

		// Check if user is authenticated
		user := app.getUserFromContext(r)
		var rateLimitKey string
		var config RateLimitConfig

		if user != nil {
			// Authenticated user - use user ID in rate limit key for per-user limits
			endpoint := getEndpointKey(r)
			rateLimitKey = fmt.Sprintf("rate_limit:user:%s:%s", user.ID.String(), endpoint)
			config = AuthenticatedUserRateLimit
		} else {
			// Anonymous user - use IP-based rate limiting
			endpoint := getEndpointKey(r)
			rateLimitKey = fmt.Sprintf(cache.CacheKeyRateLimit, clientIP, endpoint)
			config = AnonymousUserRateLimit
		}

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
			w.Header().Set("X-RateLimit-Type", getRateLimitType(user))

			// Track rate limit violation for monitoring
			app.rateLimitMonitor(clientIP, user, true)

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
		w.Header().Set("X-RateLimit-Type", getRateLimitType(user))

		// Track successful request for monitoring
		app.rateLimitMonitor(clientIP, user, false)

		next.ServeHTTP(w, r)
	})
}

// getRateLimitType returns the type of rate limiting applied
func getRateLimitType(user interface{}) string {
	if user != nil {
		return "authenticated"
	}
	return "anonymous"
}

// RateLimitStats holds rate limiting statistics
type RateLimitStats struct {
	TotalRequests   int64      `json:"total_requests"`
	BlockedRequests int64      `json:"blocked_requests"`
	ActiveLimiters  int64      `json:"active_limiters"`
	LastBlockedAt   *time.Time `json:"last_blocked_at,omitempty"`
	TopBlockedIPs   []string   `json:"top_blocked_ips"`
	TopBlockedUsers []string   `json:"top_blocked_users"`
}

// rateLimitMonitor tracks rate limiting statistics and alerts
func (app *Application) rateLimitMonitor(clientIP string, user interface{}, blocked bool) {
	// Create monitoring key
	monitoringKey := "rate_limit_stats"

	// Increment total requests
	app.cache.Increment(fmt.Sprintf("%s:total_requests", monitoringKey))

	if blocked {
		// Increment blocked requests
		app.cache.Increment(fmt.Sprintf("%s:blocked_requests", monitoringKey))

		// Track last blocked time
		now := time.Now()
		app.cache.Set(fmt.Sprintf("%s:last_blocked_at", monitoringKey), now.Unix(), cache.CacheExpireVeryLong)

		// Track blocked IPs (for anonymous users)
		if user == nil {
			blockedIPKey := fmt.Sprintf("%s:blocked_ips:%s", monitoringKey, clientIP)
			count, _ := app.cache.IncrementWithExpiry(blockedIPKey, cache.CacheExpireVeryLong)

			// Log excessive blocking from same IP
			if count > 10 {
				app.logger.Warn("Excessive rate limiting from IP",
					"ip", clientIP,
					"blocked_count", count,
					"timeframe", "24h")
			}
		} else {
			// Track blocked users (for authenticated users)
			if userData, ok := user.(*data.User); ok {
				blockedUserKey := fmt.Sprintf("%s:blocked_users:%s", monitoringKey, userData.ID.String())
				count, _ := app.cache.IncrementWithExpiry(blockedUserKey, cache.CacheExpireVeryLong)

				// Log excessive blocking from same user
				if count > 20 {
					app.logger.Warn("Excessive rate limiting from user",
						"user_id", userData.ID.String(),
						"user_email", userData.Email,
						"blocked_count", count,
						"timeframe", "24h")
				}
			}
		}

		// Alert on high rate limit violations
		app.checkRateLimitThresholds()
	}
}

// checkRateLimitThresholds checks if rate limiting thresholds are exceeded and sends alerts
func (app *Application) checkRateLimitThresholds() {
	monitoringKey := "rate_limit_stats"

	// Get current stats
	var totalRequests, blockedRequests int64
	app.cache.Get(fmt.Sprintf("%s:total_requests", monitoringKey), &totalRequests)
	app.cache.Get(fmt.Sprintf("%s:blocked_requests", monitoringKey), &blockedRequests)

	// Calculate block rate (simplified - would need proper time windowing in production)
	if totalRequests > 0 {
		// This is a simplified check - in production, you'd want to track this over time windows
		// For now, we just log high blocking activity
		app.logger.Info("Rate limit statistics",
			"total_requests", totalRequests,
			"blocked_requests", blockedRequests)
	}
}

// getRateLimitStats returns current rate limiting statistics
func (app *Application) getRateLimitStats() (*RateLimitStats, error) {
	monitoringKey := "rate_limit_stats"
	stats := &RateLimitStats{}

	// Get total requests
	app.cache.Get(fmt.Sprintf("%s:total_requests", monitoringKey), &stats.TotalRequests)

	// Get blocked requests
	app.cache.Get(fmt.Sprintf("%s:blocked_requests", monitoringKey), &stats.BlockedRequests)

	// Get last blocked time
	var timestamp int64
	if err := app.cache.Get(fmt.Sprintf("%s:last_blocked_at", monitoringKey), &timestamp); err == nil && timestamp > 0 {
		t := time.Unix(timestamp, 0)
		stats.LastBlockedAt = &t
	}

	return stats, nil
}

// getRateLimitStatsHandler provides an HTTP endpoint for rate limit statistics
func (app *Application) getRateLimitStatsHandler(w http.ResponseWriter, r *http.Request) {
	stats, err := app.getRateLimitStats()
	if err != nil {
		app.logger.Error("Failed to get rate limit stats", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Failed to retrieve rate limit statistics")
		return
	}

	app.writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   stats,
	})
}
