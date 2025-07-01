package main

import (
	"net/http"
	"net/url"
	"strings"
)

// validateEndpointRequest validates endpoint creation/update requests
func validateEndpointRequest(req *EndpointRequest) []string {
	var errors []string

	// Validate name
	if strings.TrimSpace(req.Name) == "" {
		errors = append(errors, "Name is required and cannot be empty")
	}

	// Validate URL
	if strings.TrimSpace(req.URL) == "" {
		errors = append(errors, "URL is required and cannot be empty")
	} else {
		// Parse URL to ensure it's valid
		parsedURL, err := url.Parse(req.URL)
		if err != nil {
			errors = append(errors, "URL is not valid")
		} else if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
			errors = append(errors, "URL must use http or https scheme")
		}
	}

	// Validate HTTP method
	validMethods := map[string]bool{
		"GET":     true,
		"POST":    true,
		"PUT":     true,
		"DELETE":  true,
		"PATCH":   true,
		"HEAD":    true,
		"OPTIONS": true,
	}
	if req.Method != "" && !validMethods[strings.ToUpper(req.Method)] {
		errors = append(errors, "Invalid HTTP method")
	}

	// Validate expected status code
	if req.ExpectedStatusCode < 100 || req.ExpectedStatusCode > 599 {
		errors = append(errors, "Expected status code must be between 100 and 599")
	}

	// Validate timeout
	if req.TimeoutSeconds < 1 || req.TimeoutSeconds > 300 {
		errors = append(errors, "Timeout must be between 1 and 300 seconds")
	}

	// Validate check interval
	if req.CheckIntervalSeconds < 60 {
		errors = append(errors, "Check interval must be at least 60 seconds")
	}

	return errors
}

// validateIncidentRequest validates incident creation/update requests
func validateIncidentRequest(req *IncidentRequest) []string {
	var errors []string

	// Validate title
	if strings.TrimSpace(req.Title) == "" {
		errors = append(errors, "Title is required and cannot be empty")
	}

	// Validate severity
	validSeverities := map[string]bool{
		"low":      true,
		"medium":   true,
		"high":     true,
		"critical": true,
	}
	if req.Severity != "" && !validSeverities[req.Severity] {
		errors = append(errors, "Severity must be one of: low, medium, high, critical")
	}

	// Validate status
	validStatuses := map[string]bool{
		"open":          true,
		"investigating": true,
		"identified":    true,
		"monitoring":    true,
		"resolved":      true,
	}
	if req.Status != "" && !validStatuses[req.Status] {
		errors = append(errors, "Status must be one of: open, investigating, identified, monitoring, resolved")
	}

	return errors
}

// validationMiddleware returns a middleware that validates request bodies
func (app *Application) validationMiddleware(validatorFunc func(interface{}) []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip validation for GET and DELETE requests
			if r.Method == "GET" || r.Method == "DELETE" {
				next.ServeHTTP(w, r)
				return
			}

			// For POST and PUT requests, we'll validate in the actual handlers
			// since we need to decode the JSON first
			next.ServeHTTP(w, r)
		})
	}
}

// respondWithValidationErrors sends validation errors as JSON response
func (app *Application) respondWithValidationErrors(w http.ResponseWriter, errors []string) {
	response := map[string]interface{}{
		"error":   "Validation failed",
		"details": errors,
	}
	app.writeJSON(w, http.StatusBadRequest, response)
}
