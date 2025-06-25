package main

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/i4o-oss/watchtower/internal/data"
)

type contextKey string

const userContextKey contextKey = "user"

// setUserContext adds a user to the request context
func setUserContext(ctx context.Context, user *data.User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// getUserFromContext retrieves a user from the request context
func getUserFromContext(ctx context.Context) *data.User {
	user, ok := ctx.Value(userContextKey).(*data.User)
	if !ok {
		return nil
	}
	return user
}

// Helper function to get user from context
func (app *Application) getUserFromContext(r *http.Request) *data.User {
	return getUserFromContext(r.Context())
}

// Helper functions for JSON responses
func (app *Application) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (app *Application) errorResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
