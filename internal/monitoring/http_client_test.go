package monitoring

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/data"
)

// Test helpers
func assertEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected != actual {
		t.Errorf("Expected %v, got %v", expected, actual)
	}
}

func assertTrue(t *testing.T, condition bool) {
	t.Helper()
	if !condition {
		t.Error("Expected condition to be true")
	}
}

func assertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func assertError(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Error("Expected error, got nil")
	}
}

func TestNewHTTPClient(t *testing.T) {
	// Test with default config
	config := HTTPClientConfig{}
	client := NewHTTPClient(config)
	
	assertTrue(t, client != nil)
	assertEqual(t, 30*time.Second, client.config.Timeout)
	assertEqual(t, 10*time.Second, client.config.ConnectTimeout)
	assertEqual(t, 30*time.Second, client.config.ResponseTimeout)
	assertEqual(t, 3, client.config.MaxRetries)
	assertEqual(t, 1*time.Second, client.config.RetryDelay)
	assertEqual(t, 10*time.Second, client.config.MaxRetryDelay)
	assertEqual(t, 64, client.config.MaxResponseBodyKB)
	assertEqual(t, 10, client.config.MaxRedirects)
	
	// Test with custom config
	customConfig := HTTPClientConfig{
		Timeout:            5 * time.Second,
		MaxRetries:         5,
		RetryDelay:         500 * time.Millisecond,
		MaxRetryDelay:      30 * time.Second,
		ConnectTimeout:     5 * time.Second,
		ResponseTimeout:    10 * time.Second,
		MaxResponseBodyKB:  128,
		InsecureSkipVerify: true,
		FollowRedirects:    false,
		MaxRedirects:       5,
	}
	
	customClient := NewHTTPClient(customConfig)
	assertEqual(t, customConfig.Timeout, customClient.config.Timeout)
	assertEqual(t, customConfig.MaxRetries, customClient.config.MaxRetries)
	assertEqual(t, customConfig.InsecureSkipVerify, customClient.config.InsecureSkipVerify)
	assertEqual(t, customConfig.FollowRedirects, customClient.config.FollowRedirects)
}

func TestHTTPClient_ExecuteRequest_Success(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request headers
		assertEqual(t, "Watchtower-Monitor/1.0", r.Header.Get("User-Agent"))
		assertEqual(t, "GET", r.Method)
		assertEqual(t, "/test", r.URL.Path)
		
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}))
	defer server.Close()
	
	config := HTTPClientConfig{
		Timeout:    5 * time.Second,
		MaxRetries: 1,
	}
	client := NewHTTPClient(config)
	
	endpoint := &data.Endpoint{
		URL:            server.URL + "/test",
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertTrue(t, response != nil)
	assertEqual(t, http.StatusOK, response.StatusCode)
	assertTrue(t, response.BodySample != nil)
	assertTrue(t, strings.Contains(*response.BodySample, "ok"))
	assertEqual(t, "application/json", response.Headers["Content-Type"])
}

func TestHTTPClient_ExecuteRequest_WithCustomHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify custom headers
		assertEqual(t, "Bearer token123", r.Header.Get("Authorization"))
		assertEqual(t, "application/json", r.Header.Get("Content-Type"))
		assertEqual(t, "Custom-Agent/1.0", r.Header.Get("User-Agent"))
		
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{})
	
	headers := make(data.HTTPHeaders)
	headers["Authorization"] = "Bearer token123"
	headers["Content-Type"] = "application/json"
	headers["User-Agent"] = "Custom-Agent/1.0"
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        headers,
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusOK, response.StatusCode)
}

func TestHTTPClient_ExecuteRequest_WithBody(t *testing.T) {
	expectedBody := `{"test": "data"}`
	
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assertEqual(t, "POST", r.Method)
		assertEqual(t, "application/json", r.Header.Get("Content-Type"))
		
		body, err := io.ReadAll(r.Body)
		assertNoError(t, err)
		assertEqual(t, expectedBody, string(body))
		
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"created": true}`))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "POST",
		Body:           expectedBody,
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusCreated, response.StatusCode)
}

func TestHTTPClient_ExecuteRequest_Timeout(t *testing.T) {
	// Server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 0, // No retries for faster test
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 1, // 1 second timeout
		Headers:        make(data.HTTPHeaders),
	}
	
	_, err := client.ExecuteRequest(endpoint)
	assertError(t, err)
	assertTrue(t, strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "context deadline exceeded"))
}

func TestHTTPClient_ExecuteRequest_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal Server Error"))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 0, // No retries
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	// Server errors (5xx) are treated as errors and retried
	_, err := client.ExecuteRequest(endpoint)
	assertError(t, err) // Server errors are returned as Go errors
	assertTrue(t, strings.Contains(err.Error(), "server error: status 500"))
}

func TestHTTPClient_ExecuteRequest_NetworkError(t *testing.T) {
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 1,
	})
	
	endpoint := &data.Endpoint{
		URL:            "http://localhost:99999", // Invalid port
		Method:         "GET",
		TimeoutSeconds: 1,
		Headers:        make(data.HTTPHeaders),
	}
	
	_, err := client.ExecuteRequest(endpoint)
	assertError(t, err)
	assertTrue(t, strings.Contains(err.Error(), "connection refused") || 
		strings.Contains(err.Error(), "request failed"))
}

func TestHTTPClient_ExecuteRequest_Retry(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			// Fail first 2 attempts
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		// Succeed on 3rd attempt
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 3,
		RetryDelay: 10 * time.Millisecond, // Fast retry for testing
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusOK, response.StatusCode)
	assertEqual(t, 3, attempts) // Should have retried twice
}

func TestHTTPClient_ExecuteRequest_MaxRetryDelay(t *testing.T) {
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries:    2,
		RetryDelay:    100 * time.Millisecond,
		MaxRetryDelay: 150 * time.Millisecond,
	})
	
	endpoint := &data.Endpoint{
		URL:            "http://localhost:99999", // Will always fail
		Method:         "GET",
		TimeoutSeconds: 1,
		Headers:        make(data.HTTPHeaders),
	}
	
	start := time.Now()
	_, err := client.ExecuteRequest(endpoint)
	elapsed := time.Since(start)
	
	assertError(t, err)
	// Should have tried 3 times (initial + 2 retries) with delays
	// But delays should be capped at MaxRetryDelay
	assertTrue(t, elapsed < 1*time.Second) // Much less than unbounded exponential backoff
}

func TestHTTPClient_ExecuteRequest_NoRetryOn4xx(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusNotFound) // 404 should not be retried
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 3,
		RetryDelay: 10 * time.Millisecond,
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err) // 404 is a successful HTTP response
	assertEqual(t, http.StatusNotFound, response.StatusCode)
	assertEqual(t, 1, attempts) // Should not have retried
}

func TestHTTPClient_ExecuteRequest_LargeResponse(t *testing.T) {
	// Create a large response (> 64KB default limit)
	largeResponse := strings.Repeat("a", 100*1024) // 100KB
	
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(largeResponse))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{
		MaxResponseBodyKB: 64, // 64KB limit
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusOK, response.StatusCode)
	
	// Response should be truncated to 64KB
	assertTrue(t, len(*response.BodySample) <= 64*1024)
}

func TestHTTPClient_ExecuteRequest_Redirects(t *testing.T) {
	redirectCount := 0
	
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if redirectCount < 2 {
			redirectCount++
			w.Header().Set("Location", r.URL.String()+"?redirect="+fmt.Sprintf("%d", redirectCount))
			w.WriteHeader(http.StatusFound)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("final destination"))
	}))
	defer server.Close()
	
	// Test with redirects enabled
	client := NewHTTPClient(HTTPClientConfig{
		FollowRedirects: true,
		MaxRedirects:    5,
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusOK, response.StatusCode)
	assertTrue(t, strings.Contains(*response.BodySample, "final destination"))
}

func TestHTTPClient_ExecuteRequest_RedirectsDisabled(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "http://example.com")
		w.WriteHeader(http.StatusFound)
	}))
	defer server.Close()
	
	// Test with redirects disabled
	client := NewHTTPClient(HTTPClientConfig{
		FollowRedirects: false,
	})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	response, err := client.ExecuteRequest(endpoint)
	assertNoError(t, err)
	assertEqual(t, http.StatusFound, response.StatusCode)
	assertEqual(t, "http://example.com", response.Headers["Location"])
}

func TestHTTPClient_ExecuteRequest_InvalidURL(t *testing.T) {
	client := NewHTTPClient(HTTPClientConfig{})
	
	endpoint := &data.Endpoint{
		URL:            "://invalid-url",
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	_, err := client.ExecuteRequest(endpoint)
	assertError(t, err)
	assertTrue(t, strings.Contains(err.Error(), "failed to create request") ||
		strings.Contains(err.Error(), "invalid"))
}

func TestHTTPClient_ShouldRetry(t *testing.T) {
	client := NewHTTPClient(HTTPClientConfig{
		MaxRetries: 2,
		RetryDelay: 10 * time.Millisecond, // Fast retry for testing
	})
	
	// Test cases where shouldRetry logic would be applied
	// Note: This tests the general retry behavior through ExecuteRequest
	
	// Network errors should be retried
	endpoint := &data.Endpoint{
		URL:            "http://localhost:99999",
		Method:         "GET",
		TimeoutSeconds: 1,
		Headers:        make(data.HTTPHeaders),
	}
	
	start := time.Now()
	_, err := client.ExecuteRequest(endpoint)
	elapsed := time.Since(start)
	
	assertError(t, err)
	// Should have attempted retries (takes longer than single attempt)
	assertTrue(t, elapsed > 20*time.Millisecond) // At least 2 retries with 10ms delay each
}

func TestHTTPClient_ConcurrentRequests(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		time.Sleep(10 * time.Millisecond) // Small delay
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("response-%d", requestCount)))
	}))
	defer server.Close()
	
	client := NewHTTPClient(HTTPClientConfig{})
	
	endpoint := &data.Endpoint{
		URL:            server.URL,
		Method:         "GET",
		TimeoutSeconds: 5,
		Headers:        make(data.HTTPHeaders),
	}
	
	// Run concurrent requests
	const numRequests = 5
	results := make(chan error, numRequests)
	
	for i := 0; i < numRequests; i++ {
		go func() {
			_, err := client.ExecuteRequest(endpoint)
			results <- err
		}()
	}
	
	// Wait for all requests to complete
	for i := 0; i < numRequests; i++ {
		err := <-results
		assertNoError(t, err)
	}
	
	assertEqual(t, numRequests, requestCount)
}