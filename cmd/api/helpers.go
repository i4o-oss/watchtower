package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/constants"
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

// PaginationParams holds pagination parameters
type PaginationParams struct {
	Page  int
	Limit int
}

// parsePaginationParams extracts and validates pagination parameters from request
func parsePaginationParams(r *http.Request) PaginationParams {
	page := constants.DefaultPage
	limit := constants.DefaultLimit

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= constants.MaxLimit {
			limit = l
		}
	}

	return PaginationParams{
		Page:  page,
		Limit: limit,
	}
}

// parseUUIDParam extracts and validates a UUID parameter from the URL path
func parseUUIDParam(r *http.Request, paramName string) (uuid.UUID, error) {
	idStr := chi.URLParam(r, paramName)
	return uuid.Parse(idStr)
}

// logErrorAndRespond logs an error and sends an HTTP error response
func (app *Application) logErrorAndRespond(w http.ResponseWriter, statusCode int, message string, logMsg string, err error) {
	app.logger.Error(logMsg, "err", err.Error())
	app.errorResponse(w, statusCode, message)
}

// parseTimeHoursParam extracts and validates hours parameter for time filtering
func parseTimeHoursParam(r *http.Request) int {
	hours := constants.DefaultTimeHours
	if hoursStr := r.URL.Query().Get("hours"); hoursStr != "" {
		if h, err := strconv.Atoi(hoursStr); err == nil && h > 0 && h <= constants.MaxTimeHours {
			hours = h
		}
	}
	return hours
}

// parsePageParam extracts and validates page parameter
func parsePageParam(r *http.Request) int {
	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	return page
}

// parseLimitParam extracts and validates limit parameter with custom max
func parseLimitParam(r *http.Request, defaultLimit, maxLimit int) int {
	limit := defaultLimit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= maxLimit {
			limit = l
		}
	}
	return limit
}
