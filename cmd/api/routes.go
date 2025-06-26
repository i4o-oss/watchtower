package main

import (
	"net/http"
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

	return r
}

func health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok", "timestamp": "` + time.Now().Format(time.RFC3339) + `"}`))
}
