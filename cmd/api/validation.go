package main

import (
	"net/http"
	"strings"

	"github.com/i4o-oss/watchtower/internal/security"
)

// validateEndpointRequest validates endpoint creation/update requests with enhanced security
func validateEndpointRequest(req *EndpointRequest) []string {
	var errors []string
	sanitizer := security.NewSanitizer()

	// Validate and sanitize name
	nameResult := sanitizer.SanitizeHTML(req.Name, "name")
	errors = append(errors, nameResult.Errors...)
	if nameResult.Value == "" {
		errors = append(errors, "Name is required and cannot be empty")
	}
	if len(nameResult.Value) > 100 {
		errors = append(errors, "Name must be no more than 100 characters")
	}
	req.Name = nameResult.Value

	// Validate and sanitize description
	if req.Description != "" {
		descResult := sanitizer.SanitizeHTML(req.Description, "description")
		errors = append(errors, descResult.Errors...)
		if len(descResult.Value) > 500 {
			errors = append(errors, "Description must be no more than 500 characters")
		}
		req.Description = descResult.Value
	}

	// Validate and sanitize URL
	urlResult := sanitizer.SanitizeURL(req.URL, "URL")
	errors = append(errors, urlResult.Errors...)
	if urlResult.Value == "" {
		errors = append(errors, "URL is required and cannot be empty")
	}
	req.URL = urlResult.Value

	// Validate and sanitize HTTP method
	methodResult := sanitizer.SanitizeHTTPMethod(req.Method, "method")
	errors = append(errors, methodResult.Errors...)
	req.Method = methodResult.Value

	// Validate and sanitize headers
	if req.Headers != nil {
		sanitizedHeaders, warnings, headerErrors := sanitizer.SanitizeHeaders(req.Headers, "headers")
		errors = append(errors, headerErrors...)
		_ = warnings // Log warnings if needed
		req.Headers = sanitizedHeaders
	}

	// Validate and sanitize body
	if req.Body != "" {
		bodyResult := sanitizer.SanitizeJSON(req.Body, "body")
		errors = append(errors, bodyResult.Errors...)
		if len(bodyResult.Value) > 10000 {
			errors = append(errors, "Body must be no more than 10KB")
		}
		req.Body = bodyResult.Value
	}

	// Validate expected status code range
	statusCodeErrors := sanitizer.ValidateIntRange(req.ExpectedStatusCode, "expected status code", 100, 599)
	errors = append(errors, statusCodeErrors...)

	// Validate timeout range
	timeoutErrors := sanitizer.ValidateIntRange(req.TimeoutSeconds, "timeout", 1, 300)
	errors = append(errors, timeoutErrors...)

	// Validate check interval range
	intervalErrors := sanitizer.ValidateIntRange(req.CheckIntervalSeconds, "check interval", 1, 86400)
	errors = append(errors, intervalErrors...)

	return errors
}

// validateIncidentRequest validates incident creation/update requests with enhanced security
func validateIncidentRequest(req *IncidentRequest) []string {
	var errors []string
	sanitizer := security.NewSanitizer()

	// Validate and sanitize title
	titleResult := sanitizer.SanitizeHTML(req.Title, "title")
	errors = append(errors, titleResult.Errors...)
	if titleResult.Value == "" {
		errors = append(errors, "Title is required and cannot be empty")
	}
	if len(titleResult.Value) > 200 {
		errors = append(errors, "Title must be no more than 200 characters")
	}
	req.Title = titleResult.Value

	// Validate and sanitize description
	if req.Description != "" {
		descResult := sanitizer.SanitizeHTML(req.Description, "description")
		errors = append(errors, descResult.Errors...)
		if len(descResult.Value) > 2000 {
			errors = append(errors, "Description must be no more than 2000 characters")
		}
		req.Description = descResult.Value
	}

	// Validate severity
	if req.Severity != "" {
		severityResult := sanitizer.SanitizeAlphanumeric(req.Severity, "severity", "")
		errors = append(errors, severityResult.Errors...)

		validSeverities := map[string]bool{
			"low":      true,
			"medium":   true,
			"high":     true,
			"critical": true,
		}
		if !validSeverities[strings.ToLower(severityResult.Value)] {
			errors = append(errors, "Severity must be one of: low, medium, high, critical")
		} else {
			req.Severity = strings.ToLower(severityResult.Value)
		}
	}

	// Validate status
	if req.Status != "" {
		statusResult := sanitizer.SanitizeAlphanumeric(req.Status, "status", "")
		errors = append(errors, statusResult.Errors...)

		validStatuses := map[string]bool{
			"open":          true,
			"investigating": true,
			"identified":    true,
			"monitoring":    true,
			"resolved":      true,
		}
		if !validStatuses[strings.ToLower(statusResult.Value)] {
			errors = append(errors, "Status must be one of: open, investigating, identified, monitoring, resolved")
		} else {
			req.Status = strings.ToLower(statusResult.Value)
		}
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
