package main

import (
	"net/http"

	"github.com/justinas/alice"
)

func (app *Application) routes() http.Handler {
	mux := http.NewServeMux()

	// mux.Handle("GET /api/v1/", app.indexHandler)
	mux.HandleFunc("GET /health", health)

	standard := alice.New(app.RequestLogger)

	return standard.Then(mux)
}

func health(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("OK"))
}
