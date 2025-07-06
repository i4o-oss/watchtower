package security

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/cache"
)

// mockCache implements the cache.Cache interface for testing
type mockCache struct {
	data map[string]interface{}
}

func newMockCache() *mockCache {
	return &mockCache{
		data: make(map[string]interface{}),
	}
}

func (m *mockCache) Get(key string, dest interface{}) error {
	if val, exists := m.data[key]; exists {
		switch d := dest.(type) {
		case *bool:
			*d = val.(bool)
		case *string:
			*d = val.(string)
		}
		return nil
	}
	return cache.ErrCacheMiss
}

func (m *mockCache) Set(key string, value interface{}, ttl time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *mockCache) Delete(key string) error {
	delete(m.data, key)
	return nil
}

func (m *mockCache) Clear() error {
	m.data = make(map[string]interface{})
	return nil
}

func (m *mockCache) DeletePattern(pattern string) error {
	// Simple implementation for testing - delete all keys
	m.data = make(map[string]interface{})
	return nil
}

func (m *mockCache) Exists(key string) (bool, error) {
	_, exists := m.data[key]
	return exists, nil
}

func (m *mockCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	if _, exists := m.data[key]; exists {
		return false, nil
	}
	m.data[key] = value
	return true, nil
}

func (m *mockCache) Increment(key string) (int64, error) {
	if val, exists := m.data[key]; exists {
		if i, ok := val.(int64); ok {
			m.data[key] = i + 1
			return i + 1, nil
		}
	}
	m.data[key] = int64(1)
	return 1, nil
}

func (m *mockCache) IncrementWithExpiry(key string, expiration time.Duration) (int64, error) {
	return m.Increment(key)
}

func (m *mockCache) Close() error {
	return nil
}

func TestCSRFMiddleware(t *testing.T) {
	cache := newMockCache()
	config := CSRFConfig{
		TokenLength:    32,
		CookieName:     "csrf_token",
		HeaderName:     "X-CSRF-Token",
		FieldName:      "csrf_token",
		TokenTTL:       24 * time.Hour,
		SecureCookie:   false,
		SameSite:       http.SameSiteStrictMode,
		SkipReferer:    true,
		TrustedOrigins: []string{"http://localhost:3000"},
	}

	csrf := NewCSRFProtection(cache, config)

	// Test handler that just returns OK
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	t.Run("GET request should pass and set token", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		middleware := csrf.Middleware()
		handler := middleware(testHandler)
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		// Check if CSRF token was set in header
		if token := rr.Header().Get("X-CSRF-Token"); token == "" {
			t.Error("Expected CSRF token in header")
		}

		// Check if cookie was set
		cookies := rr.Result().Cookies()
		found := false
		for _, cookie := range cookies {
			if cookie.Name == "csrf_token" {
				found = true
				break
			}
		}
		if !found {
			t.Error("Expected CSRF token cookie to be set")
		}
	})

	t.Run("POST request without token should fail", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", strings.NewReader("test=data"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		rr := httptest.NewRecorder()

		middleware := csrf.Middleware()
		handler := middleware(testHandler)
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("Expected status 403, got %d", rr.Code)
		}
	})

	t.Run("POST request with valid token should pass", func(t *testing.T) {
		// First generate a token
		token, err := csrf.GenerateToken()
		if err != nil {
			t.Fatalf("Failed to generate token: %v", err)
		}

		req := httptest.NewRequest("POST", "/test", strings.NewReader("test=data"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("X-CSRF-Token", token)
		rr := httptest.NewRecorder()

		middleware := csrf.Middleware()
		handler := middleware(testHandler)
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("POST request with skip middleware should pass without token", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", strings.NewReader("test=data"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		rr := httptest.NewRecorder()

		// Apply both middlewares - CSRF protection and skip
		csrfMiddleware := csrf.Middleware()
		skipMiddleware := csrf.SkipCSRFMiddleware()

		// Create a handler chain: skip -> csrf -> test handler
		handler := skipMiddleware(csrfMiddleware(testHandler))
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200 with skip middleware, got %d", rr.Code)
		}

		if rr.Body.String() != "OK" {
			t.Errorf("Expected response 'OK', got '%s'", rr.Body.String())
		}
	})

	t.Run("SkipCSRFMiddleware sets context flag", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", nil)
		rr := httptest.NewRecorder()

		// Handler that checks if skip flag is set
		checkHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if skip, ok := r.Context().Value(skipCSRFKey).(bool); ok && skip {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("SKIP_SET"))
			} else {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("SKIP_NOT_SET"))
			}
		})

		skipMiddleware := csrf.SkipCSRFMiddleware()
		handler := skipMiddleware(checkHandler)
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}

		if rr.Body.String() != "SKIP_SET" {
			t.Errorf("Expected 'SKIP_SET', got '%s'", rr.Body.String())
		}
	})
}

func TestCSRFTokenGeneration(t *testing.T) {
	cache := newMockCache()
	config := CSRFConfig{
		TokenLength: 32,
		TokenTTL:    24 * time.Hour,
	}

	csrf := NewCSRFProtection(cache, config)

	t.Run("GenerateToken creates valid token", func(t *testing.T) {
		token, err := csrf.GenerateToken()
		if err != nil {
			t.Fatalf("Failed to generate token: %v", err)
		}

		if len(token) == 0 {
			t.Error("Token should not be empty")
		}

		// Token should be valid
		if !csrf.ValidateToken(token) {
			t.Error("Generated token should be valid")
		}
	})

	t.Run("ValidateToken returns false for empty token", func(t *testing.T) {
		if csrf.ValidateToken("") {
			t.Error("Empty token should not be valid")
		}
	})

	t.Run("ValidateToken returns false for invalid token", func(t *testing.T) {
		if csrf.ValidateToken("invalid-token") {
			t.Error("Invalid token should not be valid")
		}
	})

	t.Run("InvalidateToken removes token", func(t *testing.T) {
		token, err := csrf.GenerateToken()
		if err != nil {
			t.Fatalf("Failed to generate token: %v", err)
		}

		// Token should be valid initially
		if !csrf.ValidateToken(token) {
			t.Error("Generated token should be valid")
		}

		// Invalidate the token
		csrf.InvalidateToken(token)

		// Token should no longer be valid
		if csrf.ValidateToken(token) {
			t.Error("Invalidated token should not be valid")
		}
	})
}

func TestGetTokenFromRequest(t *testing.T) {
	cache := newMockCache()
	config := CSRFConfig{
		HeaderName: "X-CSRF-Token",
		FieldName:  "csrf_token",
		CookieName: "csrf_token",
	}

	csrf := NewCSRFProtection(cache, config)

	t.Run("GetTokenFromRequest extracts from header", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", nil)
		req.Header.Set("X-CSRF-Token", "header-token")

		token := csrf.GetTokenFromRequest(req)
		if token != "header-token" {
			t.Errorf("Expected 'header-token', got '%s'", token)
		}
	})

	t.Run("GetTokenFromRequest extracts from form", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", strings.NewReader("csrf_token=form-token"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		token := csrf.GetTokenFromRequest(req)
		if token != "form-token" {
			t.Errorf("Expected 'form-token', got '%s'", token)
		}
	})

	t.Run("GetTokenFromRequest extracts from cookie", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  "csrf_token",
			Value: "cookie-token",
		})

		token := csrf.GetTokenFromRequest(req)
		if token != "cookie-token" {
			t.Errorf("Expected 'cookie-token', got '%s'", token)
		}
	})

	t.Run("GetTokenFromRequest prioritizes header over form", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", strings.NewReader("csrf_token=form-token"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("X-CSRF-Token", "header-token")

		token := csrf.GetTokenFromRequest(req)
		if token != "header-token" {
			t.Errorf("Expected 'header-token', got '%s'", token)
		}
	})
}
