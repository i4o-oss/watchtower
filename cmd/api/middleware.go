package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (app *Application) RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var (
			method = r.Method
			uri    = r.URL.RequestURI()
		)

		t := time.Now()

		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default to 200 if WriteHeader is not called
		}

		defer func() {
			message := fmt.Sprintf("%s %s %d %s", method, uri, wrapped.statusCode, time.Since(t).String())

			switch {
			case wrapped.statusCode >= 500:
				app.logger.Error(message)
			case wrapped.statusCode >= 400:
				app.logger.Warn(message)
			case wrapped.statusCode >= 300:
				app.logger.Info(message)
			default:
				app.logger.Info(message)
			}
		}()

		next.ServeHTTP(wrapped, r)
	})
}

// Rate limiter store
var (
	rateLimiters  = make(map[string]*rate.Limiter)
	rateLimiterMu sync.RWMutex
)

// getRateLimiter returns a rate limiter for the given IP address
func getRateLimiter(ip string) *rate.Limiter {
	rateLimiterMu.RLock()
	limiter, exists := rateLimiters[ip]
	rateLimiterMu.RUnlock()

	if !exists {
		rateLimiterMu.Lock()
		// Check again after acquiring write lock
		if limiter, exists = rateLimiters[ip]; !exists {
			// Allow 5 requests per minute for login attempts
			limiter = rate.NewLimiter(rate.Every(time.Minute), 5)
			rateLimiters[ip] = limiter
		}
		rateLimiterMu.Unlock()
	}

	return limiter
}

// RateLimitAuth middleware for rate limiting authentication endpoints
func (app *Application) RateLimitAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get client IP (handle X-Forwarded-For header for proxies)
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.Header.Get("X-Real-IP")
		}
		if ip == "" {
			ip = r.RemoteAddr
		}

		// Get rate limiter for this IP
		limiter := getRateLimiter(ip)

		if !limiter.Allow() {
			app.errorResponse(w, http.StatusTooManyRequests, "Too many requests. Please try again later.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders middleware adds security headers
func (app *Application) SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Enable XSS protection
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS in production
		env := os.Getenv("ENV")
		if env == "production" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// Content Security Policy
		csp := "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
		w.Header().Set("Content-Security-Policy", csp)

		// Referrer Policy
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		next.ServeHTTP(w, r)
	})
}

// CORS middleware to handle cross-origin requests with credentials
func (app *Application) CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origins from environment or use default
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			// Default to common development URLs
			allowedOrigins = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
		}

		origin := r.Header.Get("Origin")
		origins := strings.Split(allowedOrigins, ",")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range origins {
			if strings.TrimSpace(allowedOrigin) == origin {
				allowed = true
				break
			}
		}

		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// Required headers for HTTP-only cookies
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
