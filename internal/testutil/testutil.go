package testutil

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/cache"
	"github.com/i4o-oss/watchtower/internal/data"
	"gorm.io/gorm"
)

// MockCache implements the cache.Cache interface for testing
type MockCache struct {
	data map[string]interface{}
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string]interface{}),
	}
}

func (m *MockCache) Get(key string, dest interface{}) error {
	if val, exists := m.data[key]; exists {
		switch d := dest.(type) {
		case *bool:
			*d = val.(bool)
		case *string:
			*d = val.(string)
		case *int64:
			*d = val.(int64)
		}
		return nil
	}
	return cache.ErrCacheMiss
}

func (m *MockCache) Set(key string, value interface{}, ttl time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *MockCache) Delete(key string) error {
	delete(m.data, key)
	return nil
}

func (m *MockCache) Clear() error {
	m.data = make(map[string]interface{})
	return nil
}

func (m *MockCache) DeletePattern(pattern string) error {
	m.data = make(map[string]interface{})
	return nil
}

func (m *MockCache) Exists(key string) (bool, error) {
	_, exists := m.data[key]
	return exists, nil
}

func (m *MockCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	if _, exists := m.data[key]; exists {
		return false, nil
	}
	m.data[key] = value
	return true, nil
}

func (m *MockCache) Increment(key string) (int64, error) {
	if val, exists := m.data[key]; exists {
		if i, ok := val.(int64); ok {
			m.data[key] = i + 1
			return i + 1, nil
		}
	}
	m.data[key] = int64(1)
	return 1, nil
}

func (m *MockCache) IncrementWithExpiry(key string, expiration time.Duration) (int64, error) {
	return m.Increment(key)
}

func (m *MockCache) Close() error {
	return nil
}

// MockHTTPClient implements http.Client behavior for testing
type MockHTTPClient struct {
	responses map[string]*http.Response
	errors    map[string]error
}

func NewMockHTTPClient() *MockHTTPClient {
	return &MockHTTPClient{
		responses: make(map[string]*http.Response),
		errors:    make(map[string]error),
	}
}

func (m *MockHTTPClient) SetResponse(url string, statusCode int, body string) {
	m.responses[url] = &http.Response{
		StatusCode: statusCode,
		Body:       io.NopCloser(bytes.NewBufferString(body)),
		Header:     make(http.Header),
	}
}

func (m *MockHTTPClient) SetError(url string, err error) {
	m.errors[url] = err
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	url := req.URL.String()

	if err, exists := m.errors[url]; exists {
		return nil, err
	}

	if resp, exists := m.responses[url]; exists {
		return resp, nil
	}

	// Default response
	return &http.Response{
		StatusCode: 200,
		Body:       io.NopCloser(bytes.NewBufferString("OK")),
		Header:     make(http.Header),
	}, nil
}

// MockDB implements basic database operations for testing
type MockDB struct {
	users         []data.User
	endpoints     []data.Endpoint
	logs          []data.MonitoringLog
	incidents     []data.Incident
	userIDSeq     uint
	endpointIDSeq uint
	logIDSeq      uint
	incidentIDSeq uint
}

func NewMockDB() *MockDB {
	return &MockDB{
		users:         make([]data.User, 0),
		endpoints:     make([]data.Endpoint, 0),
		logs:          make([]data.MonitoringLog, 0),
		incidents:     make([]data.Incident, 0),
		userIDSeq:     1,
		endpointIDSeq: 1,
		logIDSeq:      1,
		incidentIDSeq: 1,
	}
}

func (m *MockDB) CreateUser(user *data.User) error {
	user.ID = m.userIDSeq
	m.userIDSeq++
	m.users = append(m.users, *user)
	return nil
}

func (m *MockDB) FindUserByEmail(email string) (*data.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return &user, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *MockDB) CreateEndpoint(endpoint *data.Endpoint) error {
	endpoint.ID = m.endpointIDSeq
	m.endpointIDSeq++
	m.endpoints = append(m.endpoints, *endpoint)
	return nil
}

func (m *MockDB) FindEndpointByID(id uint) (*data.Endpoint, error) {
	for _, endpoint := range m.endpoints {
		if endpoint.ID == id {
			return &endpoint, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

// Test helpers
func AssertEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected != actual {
		t.Errorf("Expected %v, got %v", expected, actual)
	}
}

func AssertNotEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected == actual {
		t.Errorf("Expected %v not to equal %v", expected, actual)
	}
}

func AssertTrue(t *testing.T, condition bool) {
	t.Helper()
	if !condition {
		t.Error("Expected condition to be true")
	}
}

func AssertFalse(t *testing.T, condition bool) {
	t.Helper()
	if condition {
		t.Error("Expected condition to be false")
	}
}

func AssertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func AssertError(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Error("Expected error, got nil")
	}
}

func AssertContains(t *testing.T, str, substr string) {
	t.Helper()
	if !bytes.Contains([]byte(str), []byte(substr)) {
		t.Errorf("Expected '%s' to contain '%s'", str, substr)
	}
}

// Mock data generators
func CreateTestUser() *data.User {
	return &data.User{
		Email:    "test@example.com",
		Password: "hashedpassword",
		Role:     "user",
	}
}

func CreateTestEndpoint() *data.Endpoint {
	return &data.Endpoint{
		URL:      "https://example.com",
		Name:     "Test Endpoint",
		Method:   "GET",
		Interval: 300,
		Timeout:  30,
		UserID:   1,
	}
}

func CreateTestLog() *data.MonitoringLog {
	return &data.MonitoringLog{
		EndpointID:   1,
		Status:       "up",
		ResponseTime: 150,
		StatusCode:   200,
		Timestamp:    time.Now(),
	}
}

func CreateTestIncident() *data.Incident {
	return &data.Incident{
		EndpointID:  1,
		Status:      "open",
		Description: "Test incident",
		StartTime:   time.Now(),
	}
}

// HTTP test helpers
func CreateTestRequest(method, url string, body io.Reader) *http.Request {
	req := httptest.NewRequest(method, url, body)
	req = req.WithContext(context.Background())
	return req
}

func CreateTestRecorder() *httptest.ResponseRecorder {
	return httptest.NewRecorder()
}
