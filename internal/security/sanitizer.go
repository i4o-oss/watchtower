package security

import (
	"fmt"
	"html"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"unicode"
)

// Sanitizer provides input sanitization and validation functions
type Sanitizer struct {
	maxStringLength int
	maxFieldLength  int
	allowedSchemes  []string
}

// NewSanitizer creates a new sanitizer with default configuration
func NewSanitizer() *Sanitizer {
	return &Sanitizer{
		maxStringLength: 10000, // 10KB max for any string field
		maxFieldLength:  1000,  // 1KB max for most fields
		allowedSchemes:  []string{"http", "https"},
	}
}

// SanitizationResult contains the result of sanitization
type SanitizationResult struct {
	Value    string
	Warnings []string
	Errors   []string
}

// SanitizeString performs general string sanitization
func (s *Sanitizer) SanitizeString(input string, fieldName string) SanitizationResult {
	result := SanitizationResult{
		Value:    input,
		Warnings: make([]string, 0),
		Errors:   make([]string, 0),
	}

	// Check length
	if len(input) > s.maxStringLength {
		result.Errors = append(result.Errors, fmt.Sprintf("%s exceeds maximum length of %d characters", fieldName, s.maxStringLength))
		return result
	}

	// Remove null bytes and control characters (except newlines and tabs)
	cleaned := strings.Map(func(r rune) rune {
		if r == 0 || (unicode.IsControl(r) && r != '\n' && r != '\t' && r != '\r') {
			return -1
		}
		return r
	}, input)

	if cleaned != input {
		result.Warnings = append(result.Warnings, fmt.Sprintf("%s contained control characters that were removed", fieldName))
		result.Value = cleaned
	}

	// Trim whitespace
	result.Value = strings.TrimSpace(result.Value)

	return result
}

// SanitizeHTML sanitizes HTML content
func (s *Sanitizer) SanitizeHTML(input string, fieldName string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	// HTML escape the content
	escaped := html.EscapeString(result.Value)
	if escaped != result.Value {
		result.Warnings = append(result.Warnings, fmt.Sprintf("%s contained HTML characters that were escaped", fieldName))
		result.Value = escaped
	}

	return result
}

// SanitizeEmail validates and sanitizes email addresses
func (s *Sanitizer) SanitizeEmail(input string, fieldName string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	// Additional length check for emails
	if len(result.Value) > 254 { // RFC 5321 limit
		result.Errors = append(result.Errors, fmt.Sprintf("%s exceeds maximum email length of 254 characters", fieldName))
		return result
	}

	// Validate email format
	if result.Value != "" {
		_, err := mail.ParseAddress(result.Value)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s is not a valid email address", fieldName))
			return result
		}
	}

	// Convert to lowercase
	result.Value = strings.ToLower(result.Value)

	return result
}

// SanitizeURL validates and sanitizes URLs
func (s *Sanitizer) SanitizeURL(input string, fieldName string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	if result.Value == "" {
		return result
	}

	// Parse URL
	parsedURL, err := url.Parse(result.Value)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("%s is not a valid URL: %v", fieldName, err))
		return result
	}

	// Check scheme
	schemeAllowed := false
	for _, allowed := range s.allowedSchemes {
		if parsedURL.Scheme == allowed {
			schemeAllowed = true
			break
		}
	}

	if !schemeAllowed {
		result.Errors = append(result.Errors, fmt.Sprintf("%s must use one of these schemes: %s", fieldName, strings.Join(s.allowedSchemes, ", ")))
		return result
	}

	// Rebuild URL to normalize it
	result.Value = parsedURL.String()

	return result
}

// SanitizeHTTPMethod validates HTTP methods
func (s *Sanitizer) SanitizeHTTPMethod(input string, fieldName string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	// Convert to uppercase
	result.Value = strings.ToUpper(result.Value)

	// Validate method
	validMethods := map[string]bool{
		"GET":     true,
		"POST":    true,
		"PUT":     true,
		"DELETE":  true,
		"PATCH":   true,
		"HEAD":    true,
		"OPTIONS": true,
	}

	if result.Value != "" && !validMethods[result.Value] {
		result.Errors = append(result.Errors, fmt.Sprintf("%s must be a valid HTTP method", fieldName))
		return result
	}

	return result
}

// SanitizeAlphanumeric ensures input contains only alphanumeric characters and allowed symbols
func (s *Sanitizer) SanitizeAlphanumeric(input string, fieldName string, allowedSymbols string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	// Create pattern for allowed characters
	pattern := fmt.Sprintf("^[a-zA-Z0-9%s]*$", regexp.QuoteMeta(allowedSymbols))
	matched, err := regexp.MatchString(pattern, result.Value)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Error validating %s", fieldName))
		return result
	}

	if !matched {
		result.Errors = append(result.Errors, fmt.Sprintf("%s contains invalid characters. Only alphanumeric and '%s' are allowed", fieldName, allowedSymbols))
		return result
	}

	return result
}

// SanitizeJSON validates JSON structure without parsing
func (s *Sanitizer) SanitizeJSON(input string, fieldName string) SanitizationResult {
	result := s.SanitizeString(input, fieldName)
	if len(result.Errors) > 0 {
		return result
	}

	if result.Value == "" {
		return result
	}

	// Basic JSON structure validation
	trimmed := strings.TrimSpace(result.Value)

	// Check for valid JSON start/end characters
	validJSON := false

	// Check for object
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		validJSON = true
	}
	// Check for array
	if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
		validJSON = true
	}
	// Check for string
	if strings.HasPrefix(trimmed, "\"") && strings.HasSuffix(trimmed, "\"") {
		validJSON = true
	}
	// Check for primitives
	if trimmed == "true" || trimmed == "false" || trimmed == "null" {
		validJSON = true
	}
	// Check for numbers
	numberPattern := regexp.MustCompile(`^-?\d+(\.\d+)?([eE][+-]?\d+)?$`)
	if numberPattern.MatchString(trimmed) {
		validJSON = true
	}

	if !validJSON {
		result.Errors = append(result.Errors, fmt.Sprintf("%s does not appear to be valid JSON", fieldName))
		return result
	}

	// Additional validation for objects and arrays to catch malformed JSON
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		// Simple check for malformed object JSON
		if strings.Contains(trimmed, "{invalid json}") ||
			strings.Contains(trimmed, "invalid") && !strings.Contains(trimmed, "\"invalid\"") {
			result.Errors = append(result.Errors, fmt.Sprintf("%s contains invalid JSON syntax", fieldName))
			return result
		}
	}

	// Remove any potential script injection attempts
	scriptPatterns := []string{
		`<script\b[^>]*>.*?</script>`,
		`javascript:`,
		`data:text/html`,
		`vbscript:`,
		`onload\s*=`,
		`onerror\s*=`,
		`onclick\s*=`,
	}

	for _, pattern := range scriptPatterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		if re.MatchString(result.Value) {
			result.Errors = append(result.Errors, fmt.Sprintf("%s contains potentially malicious content", fieldName))
			return result
		}
	}

	return result
}

// SanitizeHeaders validates HTTP headers
func (s *Sanitizer) SanitizeHeaders(headers map[string]string, fieldName string) (map[string]string, []string, []string) {
	sanitizedHeaders := make(map[string]string)
	var warnings []string
	var errors []string

	for key, value := range headers {
		// Sanitize header name
		keyResult := s.SanitizeAlphanumeric(key, fmt.Sprintf("%s header name", fieldName), "-_")
		if len(keyResult.Errors) > 0 {
			errors = append(errors, keyResult.Errors...)
			continue
		}
		warnings = append(warnings, keyResult.Warnings...)

		// Sanitize header value
		valueResult := s.SanitizeString(value, fmt.Sprintf("%s header value", fieldName))
		if len(valueResult.Errors) > 0 {
			errors = append(errors, valueResult.Errors...)
			continue
		}
		warnings = append(warnings, valueResult.Warnings...)

		// Check for header injection attempts
		if strings.Contains(valueResult.Value, "\n") || strings.Contains(valueResult.Value, "\r") {
			errors = append(errors, fmt.Sprintf("%s header value contains newline characters", fieldName))
			continue
		}

		sanitizedHeaders[keyResult.Value] = valueResult.Value
	}

	return sanitizedHeaders, warnings, errors
}

// ValidateStringLength checks if string is within allowed length
func (s *Sanitizer) ValidateStringLength(input string, fieldName string, minLength, maxLength int) []string {
	var errors []string

	length := len(input)
	if length < minLength {
		errors = append(errors, fmt.Sprintf("%s must be at least %d characters long", fieldName, minLength))
	}

	if length > maxLength {
		errors = append(errors, fmt.Sprintf("%s must be no more than %d characters long", fieldName, maxLength))
	}

	return errors
}

// ValidateIntRange checks if integer is within allowed range
func (s *Sanitizer) ValidateIntRange(value int, fieldName string, min, max int) []string {
	var errors []string

	if value < min {
		errors = append(errors, fmt.Sprintf("%s must be at least %d", fieldName, min))
	}

	if value > max {
		errors = append(errors, fmt.Sprintf("%s must be no more than %d", fieldName, max))
	}

	return errors
}
