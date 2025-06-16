package main

import (
	"fmt"
	"net/http"
)

func (app *Application) NewServer() *http.Server {
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", app.config.Port),
		Handler: app.routes(),
	}

	return server
}
