package security

import (
	"fmt"
	"net/http"
	"strings"
)

// SecurityHeadersConfig holds configuration for security headers
type SecurityHeadersConfig struct {
	// Content Security Policy
	EnableCSP     bool
	CSPReportOnly bool
	CSPDirectives map[string][]string
	CSPReportURI  string

	// Frame Options
	FrameOptions string // DENY, SAMEORIGIN, or ALLOW-FROM uri

	// Content Type Options
	NoSniff bool

	// XSS Protection
	XSSProtection string // "1; mode=block" or "0"

	// HSTS
	EnableHSTS            bool
	HSTSMaxAge            int
	HSTSIncludeSubdomains bool
	HSTSPreload           bool

	// Referrer Policy
	ReferrerPolicy string

	// Permissions Policy (formerly Feature Policy)
	PermissionsPolicy map[string][]string

	// Cross-Origin Policies
	CrossOriginEmbedderPolicy string // require-corp, unsafe-none
	CrossOriginOpenerPolicy   string // same-origin, same-origin-allow-popups, unsafe-none
	CrossOriginResourcePolicy string // same-site, same-origin, cross-origin

	// Additional Security Headers
	ExpectCT      string
	CustomHeaders map[string]string
}

// SecurityHeaders provides security header functionality
type SecurityHeaders struct {
	config SecurityHeadersConfig
}

// NewSecurityHeaders creates a new security headers instance with secure defaults
func NewSecurityHeaders(config SecurityHeadersConfig) *SecurityHeaders {
	// Set secure defaults
	if config.FrameOptions == "" {
		config.FrameOptions = "DENY"
	}

	if config.XSSProtection == "" {
		config.XSSProtection = "1; mode=block"
	}

	if config.ReferrerPolicy == "" {
		config.ReferrerPolicy = "strict-origin-when-cross-origin"
	}

	if config.CrossOriginEmbedderPolicy == "" {
		config.CrossOriginEmbedderPolicy = "require-corp"
	}

	if config.CrossOriginOpenerPolicy == "" {
		config.CrossOriginOpenerPolicy = "same-origin"
	}

	if config.CrossOriginResourcePolicy == "" {
		config.CrossOriginResourcePolicy = "same-origin"
	}

	if config.HSTSMaxAge == 0 {
		config.HSTSMaxAge = 31536000 // 1 year
	}

	// Default CSP directives for a monitoring application
	if config.CSPDirectives == nil {
		config.CSPDirectives = map[string][]string{
			"default-src":     {"'self'"},
			"script-src":      {"'self'", "'unsafe-inline'"}, // Note: Remove unsafe-inline in production
			"style-src":       {"'self'", "'unsafe-inline'"},
			"img-src":         {"'self'", "data:", "https:"},
			"font-src":        {"'self'"},
			"connect-src":     {"'self'"},
			"media-src":       {"'none'"},
			"object-src":      {"'none'"},
			"child-src":       {"'none'"},
			"frame-src":       {"'none'"},
			"worker-src":      {"'self'"},
			"frame-ancestors": {"'none'"},
			"form-action":     {"'self'"},
			"base-uri":        {"'self'"},
			"manifest-src":    {"'self'"},
		}
	}

	// Default permissions policy
	if config.PermissionsPolicy == nil {
		config.PermissionsPolicy = map[string][]string{
			"camera":             {"'none'"},
			"microphone":         {"'none'"},
			"geolocation":        {"'none'"},
			"payment":            {"'none'"},
			"usb":                {"'none'"},
			"accelerometer":      {"'none'"},
			"gyroscope":          {"'none'"},
			"magnetometer":       {"'none'"},
			"fullscreen":         {"'self'"},
			"picture-in-picture": {"'none'"},
		}
	}

	return &SecurityHeaders{
		config: config,
	}
}

// buildCSP builds the Content Security Policy header value
func (s *SecurityHeaders) buildCSP() string {
	if !s.config.EnableCSP {
		return ""
	}

	var directives []string

	for directive, sources := range s.config.CSPDirectives {
		if len(sources) > 0 {
			value := fmt.Sprintf("%s %s", directive, strings.Join(sources, " "))
			directives = append(directives, value)
		}
	}

	csp := strings.Join(directives, "; ")

	// Add report-uri if configured
	if s.config.CSPReportURI != "" {
		csp += fmt.Sprintf("; report-uri %s", s.config.CSPReportURI)
	}

	return csp
}

// buildHSTS builds the HTTP Strict Transport Security header value
func (s *SecurityHeaders) buildHSTS() string {
	if !s.config.EnableHSTS {
		return ""
	}

	hsts := fmt.Sprintf("max-age=%d", s.config.HSTSMaxAge)

	if s.config.HSTSIncludeSubdomains {
		hsts += "; includeSubDomains"
	}

	if s.config.HSTSPreload {
		hsts += "; preload"
	}

	return hsts
}

// buildPermissionsPolicy builds the Permissions Policy header value
func (s *SecurityHeaders) buildPermissionsPolicy() string {
	if s.config.PermissionsPolicy == nil {
		return ""
	}

	var policies []string

	for feature, allowList := range s.config.PermissionsPolicy {
		if len(allowList) > 0 {
			policy := fmt.Sprintf("%s=(%s)", feature, strings.Join(allowList, " "))
			policies = append(policies, policy)
		}
	}

	return strings.Join(policies, ", ")
}

// ApplyHeaders applies security headers to the HTTP response
func (s *SecurityHeaders) ApplyHeaders(w http.ResponseWriter, r *http.Request) {
	// X-Frame-Options
	if s.config.FrameOptions != "" {
		w.Header().Set("X-Frame-Options", s.config.FrameOptions)
	}

	// X-Content-Type-Options
	if s.config.NoSniff {
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}

	// X-XSS-Protection
	if s.config.XSSProtection != "" {
		w.Header().Set("X-XSS-Protection", s.config.XSSProtection)
	}

	// Content Security Policy
	if csp := s.buildCSP(); csp != "" {
		headerName := "Content-Security-Policy"
		if s.config.CSPReportOnly {
			headerName = "Content-Security-Policy-Report-Only"
		}
		w.Header().Set(headerName, csp)
	}

	// HTTP Strict Transport Security (only for HTTPS)
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		if hsts := s.buildHSTS(); hsts != "" {
			w.Header().Set("Strict-Transport-Security", hsts)
		}
	}

	// Referrer Policy
	if s.config.ReferrerPolicy != "" {
		w.Header().Set("Referrer-Policy", s.config.ReferrerPolicy)
	}

	// Permissions Policy
	if permPolicy := s.buildPermissionsPolicy(); permPolicy != "" {
		w.Header().Set("Permissions-Policy", permPolicy)
	}

	// Cross-Origin Embedder Policy
	if s.config.CrossOriginEmbedderPolicy != "" {
		w.Header().Set("Cross-Origin-Embedder-Policy", s.config.CrossOriginEmbedderPolicy)
	}

	// Cross-Origin Opener Policy
	if s.config.CrossOriginOpenerPolicy != "" {
		w.Header().Set("Cross-Origin-Opener-Policy", s.config.CrossOriginOpenerPolicy)
	}

	// Cross-Origin Resource Policy
	if s.config.CrossOriginResourcePolicy != "" {
		w.Header().Set("Cross-Origin-Resource-Policy", s.config.CrossOriginResourcePolicy)
	}

	// Expect-CT
	if s.config.ExpectCT != "" {
		w.Header().Set("Expect-CT", s.config.ExpectCT)
	}

	// Custom headers
	for name, value := range s.config.CustomHeaders {
		w.Header().Set(name, value)
	}
}

// Middleware returns a middleware function for applying security headers
func (s *SecurityHeaders) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			s.ApplyHeaders(w, r)
			next.ServeHTTP(w, r)
		})
	}
}

// GetDevelopmentConfig returns a security headers configuration suitable for development
func GetDevelopmentConfig() SecurityHeadersConfig {
	return SecurityHeadersConfig{
		EnableCSP:     true,
		CSPReportOnly: true, // Use report-only mode in development
		CSPDirectives: map[string][]string{
			"default-src": {"'self'"},
			"script-src":  {"'self'", "'unsafe-inline'", "'unsafe-eval'"}, // More permissive for dev
			"style-src":   {"'self'", "'unsafe-inline'"},
			"img-src":     {"'self'", "data:", "https:", "http:"}, // Allow HTTP for dev
			"font-src":    {"'self'", "data:"},
			"connect-src": {"'self'", "ws:", "wss:"}, // Allow WebSocket for dev tools
		},
		FrameOptions:              "SAMEORIGIN", // Less restrictive for dev tools
		NoSniff:                   true,
		XSSProtection:             "1; mode=block",
		EnableHSTS:                false, // Disable HSTS in development
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "unsafe-none", // Less restrictive for dev
		CrossOriginOpenerPolicy:   "unsafe-none",
		CrossOriginResourcePolicy: "cross-origin", // Less restrictive for dev
	}
}

// GetProductionConfig returns a security headers configuration suitable for production
func GetProductionConfig() SecurityHeadersConfig {
	return SecurityHeadersConfig{
		EnableCSP:     true,
		CSPReportOnly: false, // Enforce CSP in production
		CSPDirectives: map[string][]string{
			"default-src":     {"'self'"},
			"script-src":      {"'self'"}, // Remove unsafe-inline in production
			"style-src":       {"'self'"},
			"img-src":         {"'self'", "data:", "https:"},
			"font-src":        {"'self'"},
			"connect-src":     {"'self'"},
			"media-src":       {"'none'"},
			"object-src":      {"'none'"},
			"child-src":       {"'none'"},
			"frame-src":       {"'none'"},
			"worker-src":      {"'self'"},
			"frame-ancestors": {"'none'"},
			"form-action":     {"'self'"},
			"base-uri":        {"'self'"},
			"manifest-src":    {"'self'"},
		},
		FrameOptions:              "DENY",
		NoSniff:                   true,
		XSSProtection:             "1; mode=block",
		EnableHSTS:                true,
		HSTSMaxAge:                31536000, // 1 year
		HSTSIncludeSubdomains:     true,
		HSTSPreload:               true,
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
	}
}
