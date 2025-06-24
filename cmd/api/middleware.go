package main

import (
	"fmt"
	"net/http"
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
