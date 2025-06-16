package main

import (
	"net/http"
)

func (app *Application) routes() http.Handler {
	mux := http.NewServeMux()

	// mux.Handle("GET /api/v1/", app.indexHandler)
	mux.HandleFunc("GET /health", health)

	return mux
}

func health(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("OK"))
}
