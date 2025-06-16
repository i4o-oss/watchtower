package main

import (
	"fmt"
	"net/http"
	"time"
)

func (app *Application) RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var (
			method = r.Method
			uri    = r.URL.RequestURI()
		)

		t := time.Now()

		defer func() {
			app.logger.Info(fmt.Sprintf("%s %s %s", method, uri, time.Since(t).String()))
		}()

		next.ServeHTTP(w, r)
	})
}
