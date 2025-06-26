package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func (app *Application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(app.RequestLogger)
	r.Use(app.CORS)

	// API routes with /api/v1 prefix
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Get("/health", health)
		r.Post("/auth/register", app.register)
		r.Post("/auth/login", app.login)
		r.Post("/auth/logout", app.logout)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(app.requireAuth)
			r.Get("/auth/me", app.me)
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

func health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok", "timestamp": "` + time.Now().Format(time.RFC3339) + `"}`))
}
