package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (app *Application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(app.RequestLogger)

	// mux.Handle("GET /api/v1/", app.indexHandler)
	r.Get("/health", health)

	return r
}

func health(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("OK"))
}
