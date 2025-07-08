package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
	"github.com/i4o-oss/watchtower/internal/data"
	"gorm.io/gorm"
)

// Helper function
func containsString(s, substr string) bool {
	if s == "" || substr == "" {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Simple mock application for middleware testing
type testApp struct {
	users      map[uuid.UUID]*data.User
	shouldFail bool
}

func newTestApp() *testApp {
	return &testApp{
		users:      make(map[uuid.UUID]*data.User),
		shouldFail: false,
	}
}

func (app *testApp) getUserFromContext(r *http.Request) *data.User {
	return getUserFromContext(r.Context())
}

func (app *testApp) errorResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error":"` + message + `"}`))
}

func (app *testApp) getUserByID(id uuid.UUID) (*data.User, error) {
	if app.shouldFail {
		return nil, gorm.ErrInvalidTransaction
	}
	if user, exists := app.users[id]; exists {
		return user, nil
	}
	return nil, gorm.ErrRecordNotFound
}

// Simplified auth middleware for testing
func (app *testApp) testRequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := store.Get(r, sessionName)

		authenticated, ok := session.Values["authenticated"].(bool)
		if !ok || !authenticated {
			app.errorResponse(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		userIDStr, ok := session.Values["user_id"].(string)
		if !ok {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		// Get user from mock database
		user, err := app.getUserByID(userID)
		if err != nil {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		// Add user to request context
		ctx := r.Context()
		ctx = setUserContext(ctx, user)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

// Setup test environment
func setupTestEnv() {
	os.Setenv("SESSION_SECRET", "test-secret-key")
	os.Setenv("SESSION_NAME", "test-session")
	os.Setenv("ENV", "test")
	initSessionStore()
}

func teardownTestEnv() {
	os.Unsetenv("SESSION_SECRET")
	os.Unsetenv("SESSION_NAME")
	os.Unsetenv("ENV")
}

func TestMiddleware_RequireAuth_ValidSession(t *testing.T) {
	setupTestEnv()
	defer teardownTestEnv()

	app := newTestApp()

	// Create a test user
	user := &data.User{
		ID:    uuid.New(),
		Email: "test@example.com",
		Name:  "Test User",
	}
	app.users[user.ID] = user

	// Create test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contextUser := app.getUserFromContext(r)
		if contextUser == nil {
			t.Error("Expected user in context")
			return
		}
		if user.Email != contextUser.Email {
			t.Errorf("Expected %v, got %v", user.Email, contextUser.Email)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Create request with valid session
	req := httptest.NewRequest("GET", "/protected", nil)
	rr := httptest.NewRecorder()

	// Create session cookie
	session := sessions.NewSession(store, sessionName)
	session.Values["authenticated"] = true
	session.Values["user_id"] = user.ID.String()
	session.Save(req, rr)

	// Copy the session cookie to the request
	for _, cookie := range rr.Result().Cookies() {
		req.AddCookie(cookie)
	}

	// Reset recorder for actual test
	rr = httptest.NewRecorder()

	// Test middleware
	middleware := app.testRequireAuth(testHandler)
	middleware.ServeHTTP(rr, req)

	if http.StatusOK != rr.Code {
		t.Errorf("Expected %v, got %v", http.StatusOK, rr.Code)
	}
	if "success" != rr.Body.String() {
		t.Errorf("Expected %v, got %v", "success", rr.Body.String())
	}
}

func TestMiddleware_RequireAuth_NoAuthentication(t *testing.T) {
	setupTestEnv()
	defer teardownTestEnv()

	app := newTestApp()

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called")
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	rr := httptest.NewRecorder()

	middleware := app.testRequireAuth(testHandler)
	middleware.ServeHTTP(rr, req)

	if http.StatusUnauthorized != rr.Code {
		t.Errorf("Expected %v, got %v", http.StatusUnauthorized, rr.Code)
	}
	if !containsString(rr.Body.String(), "Authentication required") {
		t.Errorf("Expected '%s' to contain '%s'", rr.Body.String(), "Authentication required")
	}
}

func TestMiddleware_RequireAuth_InvalidSession(t *testing.T) {
	setupTestEnv()
	defer teardownTestEnv()

	app := newTestApp()

	tests := []struct {
		name           string
		sessionValues  map[interface{}]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "not authenticated",
			sessionValues: map[interface{}]interface{}{
				"authenticated": false,
				"user_id":       uuid.New().String(),
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "Authentication required",
		},
		{
			name: "missing user_id",
			sessionValues: map[interface{}]interface{}{
				"authenticated": true,
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "Invalid session",
		},
		{
			name: "invalid user_id format",
			sessionValues: map[interface{}]interface{}{
				"authenticated": true,
				"user_id":       "not-a-uuid",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "Invalid session",
		},
		{
			name: "user not found",
			sessionValues: map[interface{}]interface{}{
				"authenticated": true,
				"user_id":       uuid.New().String(),
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "Invalid session",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				t.Error("Handler should not be called")
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			rr := httptest.NewRecorder()

			// Create session with test values
			session := sessions.NewSession(store, sessionName)
			for key, value := range tt.sessionValues {
				session.Values[key] = value
			}
			session.Save(req, rr)

			// Copy session cookie to request
			for _, cookie := range rr.Result().Cookies() {
				req.AddCookie(cookie)
			}

			rr = httptest.NewRecorder()

			middleware := app.testRequireAuth(testHandler)
			middleware.ServeHTTP(rr, req)

			if tt.expectedStatus != rr.Code {
				t.Errorf("Expected %v, got %v", tt.expectedStatus, rr.Code)
			}
			if !containsString(rr.Body.String(), tt.expectedError) {
				t.Errorf("Expected '%s' to contain '%s'", rr.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestMiddleware_RequireAuth_DatabaseError(t *testing.T) {
	setupTestEnv()
	defer teardownTestEnv()

	app := newTestApp()
	app.shouldFail = true

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called")
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	rr := httptest.NewRecorder()

	// Create session with valid values
	session := sessions.NewSession(store, sessionName)
	session.Values["authenticated"] = true
	session.Values["user_id"] = uuid.New().String()
	session.Save(req, rr)

	for _, cookie := range rr.Result().Cookies() {
		req.AddCookie(cookie)
	}

	rr = httptest.NewRecorder()

	middleware := app.testRequireAuth(testHandler)
	middleware.ServeHTTP(rr, req)

	if http.StatusUnauthorized != rr.Code {
		t.Errorf("Expected %v, got %v", http.StatusUnauthorized, rr.Code)
	}
	if !containsString(rr.Body.String(), "Invalid session") {
		t.Errorf("Expected '%s' to contain '%s'", rr.Body.String(), "Invalid session")
	}
}

func TestMiddleware_ConcurrentAccess(t *testing.T) {
	setupTestEnv()
	defer teardownTestEnv()

	app := newTestApp()

	// Create multiple test users
	users := make([]*data.User, 3)
	for i := 0; i < 3; i++ {
		user := &data.User{
			ID:    uuid.New(),
			Email: "test" + string(rune(i+'0')) + "@example.com",
			Name:  "Test User " + string(rune(i+'0')),
		}
		users[i] = user
		app.users[user.ID] = user
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := app.getUserFromContext(r)
		if user == nil {
			t.Error("Expected user not to be nil")
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(user.Email))
	})

	middleware := app.testRequireAuth(testHandler)

	// Test concurrent requests with different users
	done := make(chan bool, 3)

	for i, user := range users {
		go func(index int, u *data.User) {
			defer func() { done <- true }()

			req := httptest.NewRequest("GET", "/protected", nil)
			rr := httptest.NewRecorder()

			// Create session for this user
			session := sessions.NewSession(store, sessionName)
			session.Values["authenticated"] = true
			session.Values["user_id"] = u.ID.String()
			session.Save(req, rr)

			for _, cookie := range rr.Result().Cookies() {
				req.AddCookie(cookie)
			}

			rr = httptest.NewRecorder()
			middleware.ServeHTTP(rr, req)

			if http.StatusOK != rr.Code {
				t.Errorf("Expected %v, got %v", http.StatusOK, rr.Code)
			}
			if u.Email != rr.Body.String() {
				t.Errorf("Expected %v, got %v", u.Email, rr.Body.String())
			}
		}(i, user)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 3; i++ {
		<-done
	}
}

func TestCORSMiddleware(t *testing.T) {
	app := &Application{
		logger: log.New(os.Stderr),
	}

	// Test allowed origin
	os.Setenv("ALLOWED_ORIGINS", "http://localhost:3000,https://example.com")

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	tests := []struct {
		name           string
		origin         string
		method         string
		expectedStatus int
		expectCORS     bool
	}{
		{
			name:           "allowed origin",
			origin:         "http://localhost:3000",
			method:         "GET",
			expectedStatus: http.StatusOK,
			expectCORS:     true,
		},
		{
			name:           "disallowed origin",
			origin:         "http://evil.com",
			method:         "GET",
			expectedStatus: http.StatusOK,
			expectCORS:     false,
		},
		{
			name:           "preflight request",
			origin:         "http://localhost:3000",
			method:         "OPTIONS",
			expectedStatus: http.StatusOK,
			expectCORS:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/test", nil)
			req.Header.Set("Origin", tt.origin)
			rr := httptest.NewRecorder()

			middleware := app.CORS(testHandler)
			middleware.ServeHTTP(rr, req)

			if tt.expectedStatus != rr.Code {
				t.Errorf("Expected %v, got %v", tt.expectedStatus, rr.Code)
			}

			if tt.expectCORS {
				if tt.origin != rr.Header().Get("Access-Control-Allow-Origin") {
					t.Errorf("Expected %v, got %v", tt.origin, rr.Header().Get("Access-Control-Allow-Origin"))
				}
			} else {
				if "" != rr.Header().Get("Access-Control-Allow-Origin") {
					t.Errorf("Expected %v, got %v", "", rr.Header().Get("Access-Control-Allow-Origin"))
				}
			}

			if "true" != rr.Header().Get("Access-Control-Allow-Credentials") {
				t.Errorf("Expected %v, got %v", "true", rr.Header().Get("Access-Control-Allow-Credentials"))
			}
		})
	}

	os.Unsetenv("ALLOWED_ORIGINS")
}
