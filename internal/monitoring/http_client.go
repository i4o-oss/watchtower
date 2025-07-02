package monitoring

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/i4o-oss/watchtower/internal/data"
)

// HTTPResponse represents the response from an HTTP request
type HTTPResponse struct {
	StatusCode int
	BodySample *string
	Headers    map[string]string
}

// HTTPClient handles HTTP requests for monitoring
type HTTPClient struct {
	client *http.Client
	config HTTPClientConfig
}

// HTTPClientConfig holds configuration for the HTTP client
type HTTPClientConfig struct {
	Timeout            time.Duration
	MaxRetries         int
	RetryDelay         time.Duration
	MaxRetryDelay      time.Duration
	ConnectTimeout     time.Duration
	ResponseTimeout    time.Duration
	MaxResponseBodyKB  int
	InsecureSkipVerify bool
	FollowRedirects    bool
	MaxRedirects       int
}

// NewHTTPClient creates a new HTTP client with the specified configuration
func NewHTTPClient(config HTTPClientConfig) *HTTPClient {
	// Set defaults if not specified
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.ConnectTimeout == 0 {
		config.ConnectTimeout = 10 * time.Second
	}
	if config.ResponseTimeout == 0 {
		config.ResponseTimeout = 30 * time.Second
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = 1 * time.Second
	}
	if config.MaxRetryDelay == 0 {
		config.MaxRetryDelay = 10 * time.Second
	}
	if config.MaxResponseBodyKB == 0 {
		config.MaxResponseBodyKB = 64 // 64KB default
	}
	if config.MaxRedirects == 0 {
		config.MaxRedirects = 10
	}

	// Create custom transport with timeouts and TLS settings
	transport := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   config.ConnectTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ResponseHeaderTimeout: config.ResponseTimeout,
		TLSHandshakeTimeout:   10 * time.Second,
		IdleConnTimeout:       90 * time.Second,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
		DisableKeepAlives:     false,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: config.InsecureSkipVerify,
		},
	}

	// Configure redirect policy
	checkRedirect := func(req *http.Request, via []*http.Request) error {
		if !config.FollowRedirects {
			return http.ErrUseLastResponse
		}
		if len(via) >= config.MaxRedirects {
			return fmt.Errorf("stopped after %d redirects", config.MaxRedirects)
		}
		return nil
	}

	client := &http.Client{
		Transport:     transport,
		Timeout:       config.Timeout,
		CheckRedirect: checkRedirect,
	}

	return &HTTPClient{
		client: client,
		config: config,
	}
}

// ExecuteRequest executes an HTTP request for the given endpoint with retry logic
func (c *HTTPClient) ExecuteRequest(endpoint *data.Endpoint) (*HTTPResponse, error) {
	var lastErr error

	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Calculate backoff delay with exponential backoff
			delay := c.config.RetryDelay * time.Duration(1<<uint(attempt-1))
			if delay > c.config.MaxRetryDelay {
				delay = c.config.MaxRetryDelay
			}
			time.Sleep(delay)
		}

		response, err := c.executeRequestOnce(endpoint)
		if err == nil {
			return response, nil
		}

		lastErr = err

		// Don't retry for certain types of errors (4xx client errors)
		if !c.shouldRetry(err) {
			break
		}
	}

	return nil, fmt.Errorf("request failed after %d attempts: %w", c.config.MaxRetries+1, lastErr)
}

// executeRequestOnce performs a single HTTP request attempt
func (c *HTTPClient) executeRequestOnce(endpoint *data.Endpoint) (*HTTPResponse, error) {
	// Create request context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(endpoint.TimeoutSeconds)*time.Second)
	defer cancel()

	// Prepare request body
	var body io.Reader
	if endpoint.Body != "" {
		body = strings.NewReader(endpoint.Body)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, endpoint.Method, endpoint.URL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set custom headers
	for key, value := range endpoint.Headers {
		req.Header.Set(key, value)
	}

	// Set default headers if not provided
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", "Watchtower-Monitor/1.0")
	}

	// Set Content-Type for requests with body
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	// Execute request
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Extract response headers first
	headers := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values[0] // Take first value
		}
	}

	// Read response body with size limit
	maxBytes := int64(c.config.MaxResponseBodyKB * 1024)
	limitedReader := &io.LimitedReader{R: resp.Body, N: maxBytes}
	bodyBytes, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Prepare response body sample (truncate if too long)
	var bodySample *string
	if len(bodyBytes) > 0 {
		sampleSize := 500 // Store first 500 characters as sample
		if len(bodyBytes) > sampleSize {
			sample := string(bodyBytes[:sampleSize]) + "..."
			bodySample = &sample
		} else {
			sample := string(bodyBytes)
			bodySample = &sample
		}
	}

	// Check for HTTP error status codes and return as error for retry logic
	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("server error: status %d", resp.StatusCode)
	}

	return &HTTPResponse{
		StatusCode: resp.StatusCode,
		BodySample: bodySample,
		Headers:    headers,
	}, nil
}

// shouldRetry determines if a request should be retried based on the error
func (c *HTTPClient) shouldRetry(err error) bool {
	// Don't retry context cancellation or timeout
	if err == context.Canceled || err == context.DeadlineExceeded {
		return false
	}

	// Check if it's a network error (should retry)
	if netErr, ok := err.(net.Error); ok {
		return netErr.Temporary() || netErr.Timeout()
	}

	// Check if it's a server error (5xx) - should retry
	if strings.Contains(err.Error(), "server error: status 5") {
		return true
	}

	// For other errors, assume they're temporary and retry
	return true
}

// UpdateConfig updates the HTTP client configuration
func (c *HTTPClient) UpdateConfig(config HTTPClientConfig) {
	c.config = config
	// Note: This doesn't recreate the underlying http.Client
	// For production use, you might want to recreate the client
	// or make specific fields updatable
}

// GetConfig returns the current HTTP client configuration
func (c *HTTPClient) GetConfig() HTTPClientConfig {
	return c.config
}
