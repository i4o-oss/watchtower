package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

func (app *Application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(app.RequestLogger)
	r.Use(app.SecurityHeaders)
	r.Use(app.CORS)

	// Health check routes (no rate limiting, no CSRF)
	r.Get("/health", app.healthCheck)
	r.Get("/ready", app.readinessCheck)
	r.Get("/live", app.livenessCheck)

	// API routes with /api/v1 prefix
	r.Route("/api/v1", func(r chi.Router) {
		// Note: Rate limiting is applied selectively per route group below

		// CSRF token endpoint
		r.Get("/csrf-token", app.csrfProtection.GetTokenHandler())

		// Public status API endpoints with more generous rate limits (no CSRF for GET requests)
		r.Group(func(r chi.Router) {
			r.Use(app.rateLimitMiddleware(PublicAPIRateLimit))
			r.Get("/status", app.getPublicStatus)
			r.Get("/uptime/{endpoint_id}", app.getUptimeData)
			r.Get("/incidents", app.getPublicIncidents)
			r.Get("/auth/registration-status", app.registrationStatus)
		})

		// Real-time updates via Server-Sent Events (no additional rate limiting - handled by SSE)
		r.Get("/events", app.handleSSE)

		// Authentication routes with strict rate limiting (no CSRF)
		r.Group(func(r chi.Router) {
			r.Use(app.rateLimitMiddleware(AuthRateLimit))
			r.Post("/auth/register", app.register)
			r.Post("/auth/login", app.login)
		})

		// Logout route (with CSRF protection, no rate limiting for authenticated users)
		r.Group(func(r chi.Router) {
			r.Use(app.csrfProtection.Middleware())
			r.Post("/auth/logout", app.logout)
		})

		// Protected routes (with CSRF protection, no rate limiting for authenticated users)
		r.Group(func(r chi.Router) {
			r.Use(app.csrfProtection.Middleware())
			r.Use(app.requireAuth)
			r.Get("/auth/me", app.me)
		})

		// Admin routes (with CSRF protection, no rate limiting for authenticated users)
		r.Route("/admin", func(r chi.Router) {
			r.Use(app.csrfProtection.Middleware())
			r.Use(app.requireAuth)

			// Endpoint management
			r.Route("/endpoints", func(r chi.Router) {
				r.Get("/", app.listEndpoints)
				r.Post("/", app.createEndpoint)
				r.Get("/{id}", app.getEndpoint)
				r.Put("/{id}", app.updateEndpoint)
				r.Delete("/{id}", app.deleteEndpoint)
				r.Get("/{id}/logs", app.getEndpointLogs)
				r.Get("/{id}/incidents", app.getEndpointIncidents)
			})

			// Monitoring logs
			r.Get("/monitoring-logs", app.listMonitoringLogs)

			// Rate limit statistics
			r.Get("/rate-limit-stats", app.getRateLimitStatsHandler)

			// Incident management
			r.Route("/incidents", func(r chi.Router) {
				r.Get("/", app.listIncidents)
				r.Post("/", app.createIncident)
				r.Get("/{id}", app.getIncident)
				r.Put("/{id}", app.updateIncident)
				r.Delete("/{id}", app.deleteIncident)

				// Incident-endpoint associations
				r.Get("/{id}/endpoints", app.getIncidentEndpoints)
				r.Post("/{id}/endpoints", app.associateEndpointsWithIncident)
				r.Delete("/{id}/endpoints/{endpoint_id}", app.removeEndpointFromIncident)

				// Incident timeline and comments
				r.Get("/{id}/timeline", app.getIncidentTimeline)
				r.Post("/{id}/comments", app.addIncidentComment)
			})

			// Notification management
			r.Route("/notifications", func(r chi.Router) {
				r.Get("/channels", app.listNotificationChannels)
				r.Post("/channels", app.createNotificationChannel)
				r.Put("/channels/{id}", app.updateNotificationChannel)
				r.Delete("/channels/{id}", app.deleteNotificationChannel)
				r.Post("/test", app.testNotificationChannel)
			})
		})
	})

	// Serve static files from the React build
	workDir, _ := os.Getwd()
	staticDir := filepath.Join(workDir, "frontend", "build", "client")

	// Static files route - serve assets from the build directory
	assetsDir := filepath.Join(staticDir, "assets")
	r.Get("/assets/*", func(w http.ResponseWriter, r *http.Request) {
		fs := http.StripPrefix("/assets/", http.FileServer(http.Dir(assetsDir)))
		fs.ServeHTTP(w, r)
	})

	// Serve other static files (favicon, etc.)
	r.Get("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(staticDir, "favicon.ico"))
	})

	// SPA catch-all route - serves index.html for all non-API routes
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		// Don't serve SPA for API routes
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		indexPath := filepath.Join(workDir, "frontend", "build", "client", "index.html")
		http.ServeFile(w, r, indexPath)
	})

	return r
}
