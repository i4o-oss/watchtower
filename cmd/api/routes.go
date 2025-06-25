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

	// Serve static files from React build
	workDir, _ := os.Getwd()
	filesDir := http.Dir(filepath.Join(workDir, "frontend", "build", "client"))
	FileServer(r, "/", filesDir)

	return r
}

// FileServer conveniently sets up a http.FileServer handler to serve
// static files from a http.FileSystem with SPA fallback support.
func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))

		// Try to serve the requested file
		requestedPath := r.URL.Path
		if requestedPath == "/" {
			requestedPath = "/index.html"
		}

		// Check if file exists
		if f, err := root.Open(strings.TrimPrefix(requestedPath, pathPrefix)); err == nil {
			f.Close()
			fs.ServeHTTP(w, r)
		} else {
			// File doesn't exist, serve index.html for SPA routing
			indexPath := strings.TrimSuffix(pathPrefix, "/") + "/index.html"
			if indexFile, err := root.Open("/index.html"); err == nil {
				indexFile.Close()
				r.URL.Path = indexPath
				fs.ServeHTTP(w, r)
			} else {
				http.NotFound(w, r)
			}
		}
	})
}

func health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok", "timestamp": "` + time.Now().Format(time.RFC3339) + `"}`))
}
