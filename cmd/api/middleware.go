package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
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
