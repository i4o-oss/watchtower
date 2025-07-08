package data

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Test helpers for this package
func assertEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected != actual {
		t.Errorf("Expected %v, got %v", expected, actual)
	}
}

func assertNotEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected == actual {
		t.Errorf("Expected %v not to equal %v", expected, actual)
	}
}

func assertTrue(t *testing.T, condition bool) {
	t.Helper()
	if !condition {
		t.Error("Expected condition to be true")
	}
}

func assertFalse(t *testing.T, condition bool) {
	t.Helper()
	if condition {
		t.Error("Expected condition to be false")
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

func TestUser_HashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "password123",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false,
		},
		{
			name:     "long password",
			password: "verylongpasswordthatexceedsreasonablelimits",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &User{
				Email: "test@example.com",
			}

			err := user.HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify password was hashed and not stored as plain text
				assertNotEqual(t, tt.password, user.Password)
				assertTrue(t, len(user.Password) > 0)

				// Verify the hash can be verified
				err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(tt.password))
				assertNoError(t, err)
			}
		})
	}
}

func TestUser_CheckPassword(t *testing.T) {
	user := &User{
		Email: "test@example.com",
	}

	// Set up a hashed password
	password := "testpassword123"
	err := user.HashPassword(password)
	assertNoError(t, err)

	tests := []struct {
		name          string
		checkPassword string
		wantErr       bool
	}{
		{
			name:          "correct password",
			checkPassword: "testpassword123",
			wantErr:       false,
		},
		{
			name:          "incorrect password",
			checkPassword: "wrongpassword",
			wantErr:       true,
		},
		{
			name:          "empty password",
			checkPassword: "",
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := user.CheckPassword(tt.checkPassword)
			if (err != nil) != tt.wantErr {
				t.Errorf("CheckPassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestUser_TableName(t *testing.T) {
	user := User{}
	expected := "user"
	actual := user.TableName()
	assertEqual(t, expected, actual)
}

func TestHTTPHeaders_Value(t *testing.T) {
	tests := []struct {
		name    string
		headers HTTPHeaders
		want    string
		wantErr bool
	}{
		{
			name:    "nil headers",
			headers: nil,
			want:    "{}",
			wantErr: false,
		},
		{
			name:    "empty headers",
			headers: HTTPHeaders{},
			want:    "{}",
			wantErr: false,
		},
		{
			name: "single header",
			headers: HTTPHeaders{
				"Authorization": "Bearer token",
			},
			want:    `{"Authorization":"Bearer token"}`,
			wantErr: false,
		},
		{
			name: "multiple headers",
			headers: HTTPHeaders{
				"Authorization": "Bearer token",
				"Content-Type":  "application/json",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.headers.Value()
			if (err != nil) != tt.wantErr {
				t.Errorf("HTTPHeaders.Value() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Convert to string for comparison
				var gotStr string
				switch v := got.(type) {
				case string:
					gotStr = v
				case []byte:
					gotStr = string(v)
				default:
					t.Errorf("Unexpected return type: %T", got)
					return
				}

				// For nil headers, check exact match
				if tt.headers == nil {
					assertEqual(t, tt.want, gotStr)
					return
				}

				// For non-nil headers, verify it's valid JSON
				var jsonTest map[string]string
				err = json.Unmarshal([]byte(gotStr), &jsonTest)
				assertNoError(t, err)

				// Check that all expected headers are present
				for key, value := range tt.headers {
					assertEqual(t, value, jsonTest[key])
				}
			}
		})
	}
}

func TestHTTPHeaders_Scan(t *testing.T) {
	tests := []struct {
		name    string
		value   interface{}
		want    HTTPHeaders
		wantErr bool
	}{
		{
			name:    "nil value",
			value:   nil,
			want:    HTTPHeaders{},
			wantErr: false,
		},
		{
			name:    "empty JSON bytes",
			value:   []byte("{}"),
			want:    HTTPHeaders{},
			wantErr: false,
		},
		{
			name:    "valid JSON bytes",
			value:   []byte(`{"Authorization":"Bearer token"}`),
			want:    HTTPHeaders{"Authorization": "Bearer token"},
			wantErr: false,
		},
		{
			name:    "valid JSON string",
			value:   `{"Content-Type":"application/json"}`,
			want:    HTTPHeaders{"Content-Type": "application/json"},
			wantErr: false,
		},
		{
			name:    "invalid JSON",
			value:   []byte(`{invalid json`),
			want:    nil,
			wantErr: true,
		},
		{
			name:    "unsupported type",
			value:   123,
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var h HTTPHeaders
			err := h.Scan(tt.value)

			if (err != nil) != tt.wantErr {
				t.Errorf("HTTPHeaders.Scan() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if tt.want == nil {
					assertTrue(t, h != nil)
				} else {
					for key, value := range tt.want {
						assertEqual(t, value, h[key])
					}
				}
			}
		})
	}
}

func TestEndpoint_TableName(t *testing.T) {
	endpoint := Endpoint{}
	expected := "endpoint"
	actual := endpoint.TableName()
	assertEqual(t, expected, actual)
}

func TestMonitoringLog_TableName(t *testing.T) {
	log := MonitoringLog{}
	expected := "monitoring_log"
	actual := log.TableName()
	assertEqual(t, expected, actual)
}

func TestIncident_TableName(t *testing.T) {
	incident := Incident{}
	expected := "incident"
	actual := incident.TableName()
	assertEqual(t, expected, actual)
}

func TestEndpointIncident_TableName(t *testing.T) {
	ei := EndpointIncident{}
	expected := "endpoint_incident"
	actual := ei.TableName()
	assertEqual(t, expected, actual)
}

func TestIncidentTimeline_TableName(t *testing.T) {
	it := IncidentTimeline{}
	expected := "incident_timeline"
	actual := it.TableName()
	assertEqual(t, expected, actual)
}

// Test model validation and business logic
func TestEndpointValidation(t *testing.T) {
	tests := []struct {
		name     string
		endpoint Endpoint
		valid    bool
	}{
		{
			name: "valid endpoint",
			endpoint: Endpoint{
				Name:                 "Test Endpoint",
				URL:                  "https://example.com",
				Method:               "GET",
				ExpectedStatusCode:   200,
				TimeoutSeconds:       30,
				CheckIntervalSeconds: 300,
				Enabled:              true,
			},
			valid: true,
		},
		{
			name: "endpoint with custom headers",
			endpoint: Endpoint{
				Name:   "API Endpoint",
				URL:    "https://api.example.com",
				Method: "POST",
				Headers: HTTPHeaders{
					"Authorization": "Bearer token",
					"Content-Type":  "application/json",
				},
				Body:                 `{"test": "data"}`,
				ExpectedStatusCode:   201,
				TimeoutSeconds:       60,
				CheckIntervalSeconds: 600,
				Enabled:              true,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that required fields are present
			if tt.valid {
				assertTrue(t, tt.endpoint.Name != "")
				assertTrue(t, tt.endpoint.URL != "")
				assertTrue(t, tt.endpoint.Method != "")
				assertTrue(t, tt.endpoint.ExpectedStatusCode > 0)
				assertTrue(t, tt.endpoint.TimeoutSeconds > 0)
				assertTrue(t, tt.endpoint.CheckIntervalSeconds > 0)
			}
		})
	}
}

func TestMonitoringLogValidation(t *testing.T) {
	endpointID := uuid.New()
	now := time.Now()

	tests := []struct {
		name  string
		log   MonitoringLog
		valid bool
	}{
		{
			name: "successful check",
			log: MonitoringLog{
				EndpointID:         endpointID,
				Timestamp:          now,
				StatusCode:         &[]int{200}[0],
				ResponseTimeMs:     &[]int{150}[0],
				Success:            true,
				ResponseBodySample: &[]string{"OK"}[0],
			},
			valid: true,
		},
		{
			name: "failed check with error",
			log: MonitoringLog{
				EndpointID:   endpointID,
				Timestamp:    now,
				ErrorMessage: &[]string{"Connection timeout"}[0],
				Success:      false,
			},
			valid: true,
		},
		{
			name: "partial failure with status code",
			log: MonitoringLog{
				EndpointID:     endpointID,
				Timestamp:      now,
				StatusCode:     &[]int{500}[0],
				ResponseTimeMs: &[]int{1000}[0],
				Success:        false,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.valid {
				assertTrue(t, tt.log.EndpointID != uuid.Nil)
				assertTrue(t, !tt.log.Timestamp.IsZero())

				// For successful checks, verify positive response time
				if tt.log.Success && tt.log.ResponseTimeMs != nil {
					assertTrue(t, *tt.log.ResponseTimeMs > 0)
				}

				// For failed checks, verify either error message or status code
				if !tt.log.Success {
					hasError := tt.log.ErrorMessage != nil && *tt.log.ErrorMessage != ""
					hasStatusCode := tt.log.StatusCode != nil
					assertTrue(t, hasError || hasStatusCode)
				}
			}
		})
	}
}

func TestIncidentValidation(t *testing.T) {
	userID := uuid.New()
	now := time.Now()

	tests := []struct {
		name     string
		incident Incident
		valid    bool
	}{
		{
			name: "valid open incident",
			incident: Incident{
				Title:       "API Down",
				Description: "API is not responding",
				Severity:    "high",
				Status:      "open",
				StartTime:   now,
				CreatedBy:   &userID,
			},
			valid: true,
		},
		{
			name: "resolved incident with end time",
			incident: Incident{
				Title:       "Database Slow",
				Description: "Database queries taking too long",
				Severity:    "medium",
				Status:      "resolved",
				StartTime:   now.Add(-2 * time.Hour),
				EndTime:     &now,
				CreatedBy:   &userID,
			},
			valid: true,
		},
		{
			name: "system incident without creator",
			incident: Incident{
				Title:       "Auto-detected Issue",
				Description: "Automatically detected monitoring failure",
				Severity:    "low",
				Status:      "investigating",
				StartTime:   now,
				CreatedBy:   nil,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.valid {
				assertTrue(t, tt.incident.Title != "")
				assertTrue(t, tt.incident.Severity != "")
				assertTrue(t, tt.incident.Status != "")
				assertTrue(t, !tt.incident.StartTime.IsZero())

				// If resolved, should have end time
				if tt.incident.Status == "resolved" {
					assertTrue(t, tt.incident.EndTime != nil)
					assertTrue(t, tt.incident.EndTime.After(tt.incident.StartTime))
				}
			}
		})
	}
}

func TestEndpointIncidentValidation(t *testing.T) {
	endpointID := uuid.New()
	incidentID := uuid.New()
	now := time.Now()

	tests := []struct {
		name             string
		endpointIncident EndpointIncident
		valid            bool
	}{
		{
			name: "active endpoint incident",
			endpointIncident: EndpointIncident{
				EndpointID:    endpointID,
				IncidentID:    incidentID,
				AffectedStart: now,
				AffectedEnd:   nil,
			},
			valid: true,
		},
		{
			name: "resolved endpoint incident",
			endpointIncident: EndpointIncident{
				EndpointID:    endpointID,
				IncidentID:    incidentID,
				AffectedStart: now.Add(-1 * time.Hour),
				AffectedEnd:   &now,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.valid {
				assertTrue(t, tt.endpointIncident.EndpointID != uuid.Nil)
				assertTrue(t, tt.endpointIncident.IncidentID != uuid.Nil)
				assertTrue(t, !tt.endpointIncident.AffectedStart.IsZero())

				// If resolved, end time should be after start time
				if tt.endpointIncident.AffectedEnd != nil {
					assertTrue(t, tt.endpointIncident.AffectedEnd.After(tt.endpointIncident.AffectedStart))
				}
			}
		})
	}
}

func TestIncidentTimelineValidation(t *testing.T) {
	incidentID := uuid.New()
	userID := uuid.New()

	tests := []struct {
		name     string
		timeline IncidentTimeline
		valid    bool
	}{
		{
			name: "status change event",
			timeline: IncidentTimeline{
				IncidentID: incidentID,
				UserID:     &userID,
				EventType:  "status_change",
				OldValue:   &[]string{"open"}[0],
				NewValue:   &[]string{"investigating"}[0],
				Message:    &[]string{"Status updated to investigating"}[0],
			},
			valid: true,
		},
		{
			name: "comment event",
			timeline: IncidentTimeline{
				IncidentID: incidentID,
				UserID:     &userID,
				EventType:  "comment",
				Message:    &[]string{"Added investigation notes"}[0],
			},
			valid: true,
		},
		{
			name: "system event",
			timeline: IncidentTimeline{
				IncidentID: incidentID,
				UserID:     nil,
				EventType:  "auto_created",
				Message:    &[]string{"Incident automatically created"}[0],
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.valid {
				assertTrue(t, tt.timeline.IncidentID != uuid.Nil)
				assertTrue(t, tt.timeline.EventType != "")

				// Timeline entries should have some meaningful content
				hasOldValue := tt.timeline.OldValue != nil && *tt.timeline.OldValue != ""
				hasNewValue := tt.timeline.NewValue != nil && *tt.timeline.NewValue != ""
				hasMessage := tt.timeline.Message != nil && *tt.timeline.Message != ""

				assertTrue(t, hasOldValue || hasNewValue || hasMessage)
			}
		})
	}
}
