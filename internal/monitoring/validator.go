package monitoring

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/i4o-oss/watchtower/internal/data"
)

// ValidationResult represents the result of response validation
type ValidationResult struct {
	Success      bool              `json:"success"`
	StatusValid  bool              `json:"status_valid"`
	ContentValid bool              `json:"content_valid"`
	ResponseTime time.Duration     `json:"response_time"`
	Errors       []ValidationError `json:"errors,omitempty"`
	Metrics      ValidationMetrics `json:"metrics"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Type        string `json:"type"`
	Field       string `json:"field"`
	Expected    string `json:"expected"`
	Actual      string `json:"actual"`
	Description string `json:"description"`
}

// ValidationMetrics contains metrics collected during validation
type ValidationMetrics struct {
	ResponseTimeMs    int     `json:"response_time_ms"`
	ResponseSizeBytes int     `json:"response_size_bytes"`
	StatusCode        int     `json:"status_code"`
	ContentMatchScore float64 `json:"content_match_score,omitempty"`
	ValidationLatency int64   `json:"validation_latency_ns"`
}

// ResponseValidator handles validation of HTTP responses
type ResponseValidator struct {
	config ValidatorConfig
}

// ValidatorConfig holds configuration for response validation
type ValidatorConfig struct {
	MaxResponseTimeMs        int  `json:"max_response_time_ms"`
	ContentValidationEnabled bool `json:"content_validation_enabled"`
	StrictStatusCodeCheck    bool `json:"strict_status_code_check"`
	MaxValidationTimeMs      int  `json:"max_validation_time_ms"`
}

// NewResponseValidator creates a new response validator
func NewResponseValidator(config ValidatorConfig) *ResponseValidator {
	// Set defaults
	if config.MaxResponseTimeMs <= 0 {
		config.MaxResponseTimeMs = 30000 // 30 seconds
	}
	if config.MaxValidationTimeMs <= 0 {
		config.MaxValidationTimeMs = 1000 // 1 second
	}

	return &ResponseValidator{
		config: config,
	}
}

// ValidateResponse validates an HTTP response against endpoint expectations
func (v *ResponseValidator) ValidateResponse(endpoint *data.Endpoint, response *HTTPResponse, responseTime time.Duration) ValidationResult {
	startTime := time.Now()

	result := ValidationResult{
		Metrics: ValidationMetrics{
			ResponseTimeMs: int(responseTime.Milliseconds()),
			StatusCode:     response.StatusCode,
		},
		Errors: make([]ValidationError, 0),
	}

	// Calculate response size
	if response.BodySample != nil {
		result.Metrics.ResponseSizeBytes = len(*response.BodySample)
	}

	// Validate status code
	result.StatusValid = v.validateStatusCode(endpoint, response, &result)

	// Validate response time
	responseTimeValid := v.validateResponseTime(endpoint, responseTime, &result)

	// Validate content if enabled and body is available
	if v.config.ContentValidationEnabled && response.BodySample != nil {
		result.ContentValid = v.validateContent(endpoint, response, &result)
	} else {
		result.ContentValid = true // No content validation configured
	}

	// Overall success is determined by all validation checks
	result.Success = result.StatusValid && responseTimeValid && result.ContentValid

	// Record validation latency
	result.Metrics.ValidationLatency = time.Since(startTime).Nanoseconds()

	return result
}

// validateStatusCode checks if the response status code matches expectations
func (v *ResponseValidator) validateStatusCode(endpoint *data.Endpoint, response *HTTPResponse, result *ValidationResult) bool {
	expected := endpoint.ExpectedStatusCode
	actual := response.StatusCode

	if v.config.StrictStatusCodeCheck {
		// Exact match required
		if actual != expected {
			result.Errors = append(result.Errors, ValidationError{
				Type:        "status_code_mismatch",
				Field:       "status_code",
				Expected:    strconv.Itoa(expected),
				Actual:      strconv.Itoa(actual),
				Description: fmt.Sprintf("Expected exact status code %d, got %d", expected, actual),
			})
			return false
		}
	} else {
		// Allow success range (2xx) if expecting 200
		if expected >= 200 && expected < 300 {
			if actual < 200 || actual >= 300 {
				result.Errors = append(result.Errors, ValidationError{
					Type:        "status_code_range_mismatch",
					Field:       "status_code",
					Expected:    "2xx",
					Actual:      strconv.Itoa(actual),
					Description: fmt.Sprintf("Expected 2xx status code, got %d", actual),
				})
				return false
			}
		} else {
			// For non-2xx expected codes, require exact match
			if actual != expected {
				result.Errors = append(result.Errors, ValidationError{
					Type:        "status_code_mismatch",
					Field:       "status_code",
					Expected:    strconv.Itoa(expected),
					Actual:      strconv.Itoa(actual),
					Description: fmt.Sprintf("Expected status code %d, got %d", expected, actual),
				})
				return false
			}
		}
	}

	return true
}

// validateResponseTime checks if the response time is within acceptable limits
func (v *ResponseValidator) validateResponseTime(endpoint *data.Endpoint, responseTime time.Duration, result *ValidationResult) bool {
	maxAllowed := time.Duration(endpoint.TimeoutSeconds) * time.Second
	globalMax := time.Duration(v.config.MaxResponseTimeMs) * time.Millisecond

	// Use the more restrictive limit
	limit := maxAllowed
	if globalMax < maxAllowed {
		limit = globalMax
	}

	if responseTime > limit {
		result.Errors = append(result.Errors, ValidationError{
			Type:        "response_time_exceeded",
			Field:       "response_time",
			Expected:    limit.String(),
			Actual:      responseTime.String(),
			Description: fmt.Sprintf("Response time %v exceeded limit %v", responseTime, limit),
		})
		return false
	}

	return true
}

// validateContent performs content validation on the response body
func (v *ResponseValidator) validateContent(endpoint *data.Endpoint, response *HTTPResponse, result *ValidationResult) bool {
	if response.BodySample == nil || *response.BodySample == "" {
		// Empty body - check if that's expected
		if endpoint.Body != "" {
			result.Errors = append(result.Errors, ValidationError{
				Type:        "empty_response_body",
				Field:       "response_body",
				Expected:    "non-empty",
				Actual:      "empty",
				Description: "Expected response body but got empty response",
			})
			return false
		}
		return true
	}

	// Basic content validations
	body := *response.BodySample

	// Check for common error indicators in response
	errorIndicators := []string{
		"error", "Error", "ERROR",
		"exception", "Exception", "EXCEPTION",
		"failed", "Failed", "FAILED",
		"internal server error",
		"service unavailable",
		"bad gateway",
	}

	for _, indicator := range errorIndicators {
		if strings.Contains(body, indicator) {
			result.Errors = append(result.Errors, ValidationError{
				Type:        "error_content_detected",
				Field:       "response_body",
				Expected:    "no error indicators",
				Actual:      "contains: " + indicator,
				Description: fmt.Sprintf("Response body contains error indicator: %s", indicator),
			})
			// Note: This doesn't necessarily mean failure, just a warning
		}
	}

	// Check content type validation
	if response.Headers != nil {
		contentType := response.Headers["Content-Type"]
		if contentType == "" {
			contentType = response.Headers["content-type"] // Case-insensitive check
		}

		// Basic content type validation
		if strings.Contains(contentType, "application/json") {
			if !v.isValidJSON(body) {
				result.Errors = append(result.Errors, ValidationError{
					Type:        "invalid_json_content",
					Field:       "response_body",
					Expected:    "valid JSON",
					Actual:      "invalid JSON",
					Description: "Response claims to be JSON but content is not valid JSON",
				})
				return false
			}
		}
	}

	return true
}

// isValidJSON performs basic JSON validation
func (v *ResponseValidator) isValidJSON(body string) bool {
	// Simple JSON validation - check for basic structure
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return false
	}

	// For objects, check that braces are balanced and there are quotes around keys and values
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		// Check if we have unquoted keys (invalid JSON)
		// Look for pattern like {key: or ,key: or { key: which indicates unquoted key
		unquotedKeyPattern := regexp.MustCompile(`[{,\s]\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:`)
		if unquotedKeyPattern.MatchString(trimmed) {
			return false
		}

		// Check if we have unquoted string values (invalid JSON)
		// Look for pattern like : value} or : value, which indicates unquoted string value
		unquotedValuePattern := regexp.MustCompile(`:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[},]`)
		if unquotedValuePattern.MatchString(trimmed) {
			return false
		}

		return true
	}

	// For arrays
	if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
		return true
	}

	// For strings
	if strings.HasPrefix(trimmed, "\"") && strings.HasSuffix(trimmed, "\"") {
		return true
	}

	// For primitives
	if trimmed == "true" || trimmed == "false" || trimmed == "null" {
		return true
	}

	// For numbers
	return regexp.MustCompile(`^-?\d+(\.\d+)?([eE][+-]?\d+)?$`).MatchString(trimmed)
}

// ValidateEndpointConfig validates endpoint configuration for monitoring
func (v *ResponseValidator) ValidateEndpointConfig(endpoint *data.Endpoint) []ValidationError {
	var errors []ValidationError

	// Validate URL
	if endpoint.URL == "" {
		errors = append(errors, ValidationError{
			Type:        "missing_url",
			Field:       "url",
			Expected:    "non-empty URL",
			Actual:      "empty",
			Description: "Endpoint URL is required",
		})
	} else if !strings.HasPrefix(endpoint.URL, "http://") && !strings.HasPrefix(endpoint.URL, "https://") {
		errors = append(errors, ValidationError{
			Type:        "invalid_url_scheme",
			Field:       "url",
			Expected:    "http:// or https://",
			Actual:      endpoint.URL,
			Description: "URL must start with http:// or https://",
		})
	}

	// Validate HTTP method
	validMethods := []string{"GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"}
	methodValid := false
	for _, method := range validMethods {
		if endpoint.Method == method {
			methodValid = true
			break
		}
	}
	if !methodValid {
		errors = append(errors, ValidationError{
			Type:        "invalid_http_method",
			Field:       "method",
			Expected:    "valid HTTP method",
			Actual:      endpoint.Method,
			Description: fmt.Sprintf("HTTP method must be one of: %s", strings.Join(validMethods, ", ")),
		})
	}

	// Validate timeout
	if endpoint.TimeoutSeconds <= 0 || endpoint.TimeoutSeconds > 300 {
		errors = append(errors, ValidationError{
			Type:        "invalid_timeout",
			Field:       "timeout_seconds",
			Expected:    "1-300 seconds",
			Actual:      strconv.Itoa(endpoint.TimeoutSeconds),
			Description: "Timeout must be between 1 and 300 seconds",
		})
	}

	// Validate check interval
	if endpoint.CheckIntervalSeconds <= 0 || endpoint.CheckIntervalSeconds > 86400 {
		errors = append(errors, ValidationError{
			Type:        "invalid_check_interval",
			Field:       "check_interval_seconds",
			Expected:    "60-86400 seconds",
			Actual:      strconv.Itoa(endpoint.CheckIntervalSeconds),
			Description: "Check interval must be between 1 second and 24 hours",
		})
	}

	// Validate expected status code
	if endpoint.ExpectedStatusCode < 100 || endpoint.ExpectedStatusCode > 599 {
		errors = append(errors, ValidationError{
			Type:        "invalid_status_code",
			Field:       "expected_status_code",
			Expected:    "100-599",
			Actual:      strconv.Itoa(endpoint.ExpectedStatusCode),
			Description: "Expected status code must be a valid HTTP status code (100-599)",
		})
	}

	return errors
}

// GetValidationSummary returns a summary of validation results
func (v *ResponseValidator) GetValidationSummary(results []ValidationResult) ValidationSummary {
	summary := ValidationSummary{
		TotalValidations: len(results),
	}

	var totalResponseTime time.Duration
	var totalValidationTime time.Duration

	for _, result := range results {
		if result.Success {
			summary.SuccessCount++
		} else {
			summary.FailureCount++
		}

		totalResponseTime += time.Duration(result.Metrics.ResponseTimeMs) * time.Millisecond
		totalValidationTime += time.Duration(result.Metrics.ValidationLatency)

		// Track error types
		for _, err := range result.Errors {
			if summary.ErrorTypes == nil {
				summary.ErrorTypes = make(map[string]int)
			}
			summary.ErrorTypes[err.Type]++
		}
	}

	if len(results) > 0 {
		summary.AverageResponseTimeMs = int(totalResponseTime.Milliseconds()) / len(results)
		summary.AverageValidationTimeNs = totalValidationTime.Nanoseconds() / int64(len(results))
	}

	summary.SuccessRate = float64(summary.SuccessCount) / float64(summary.TotalValidations) * 100

	return summary
}

// ValidationSummary provides a summary of validation results
type ValidationSummary struct {
	TotalValidations        int            `json:"total_validations"`
	SuccessCount            int            `json:"success_count"`
	FailureCount            int            `json:"failure_count"`
	SuccessRate             float64        `json:"success_rate"`
	AverageResponseTimeMs   int            `json:"average_response_time_ms"`
	AverageValidationTimeNs int64          `json:"average_validation_time_ns"`
	ErrorTypes              map[string]int `json:"error_types,omitempty"`
}
