package notification

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"
)

// MockProvider implements NotificationProvider for testing
type MockProvider struct {
	providerType ProviderType
	enabled      bool
	shouldFail   bool
	configured   bool
}

func NewMockProvider(providerType ProviderType, enabled bool) *MockProvider {
	return &MockProvider{
		providerType: providerType,
		enabled:      enabled,
		configured:   true,
	}
}

func (m *MockProvider) GetType() ProviderType {
	return m.providerType
}

func (m *MockProvider) IsEnabled() bool {
	return m.enabled
}

func (m *MockProvider) Configure(config ProviderConfig) error {
	if config.Type != m.providerType {
		return errors.New("invalid provider type")
	}
	m.configured = true
	return nil
}

func (m *MockProvider) SendNotification(ctx context.Context, data NotificationData) DeliveryResult {
	if m.shouldFail {
		return DeliveryResult{
			Success:   false,
			Error:     errors.New("mock failure"),
			Timestamp: time.Now(),
			Details:   "Mock provider failure",
		}
	}

	return DeliveryResult{
		Success:   true,
		Timestamp: time.Now(),
		Details:   "Mock provider success",
	}
}

func (m *MockProvider) TestConnection(ctx context.Context) error {
	if !m.configured {
		return errors.New("provider not configured")
	}
	if m.shouldFail {
		return errors.New("mock connection failure")
	}
	return nil
}

func (m *MockProvider) SetShouldFail(shouldFail bool) {
	m.shouldFail = shouldFail
}

func TestNewService(t *testing.T) {
	logger := slog.Default()
	service := NewService(logger)

	if service == nil {
		t.Fatal("Expected service to be created")
	}

	if service.providers == nil {
		t.Fatal("Expected providers map to be initialized")
	}

	if service.logger != logger {
		t.Fatal("Expected logger to be set")
	}
}

func TestRegisterProvider(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)

	err := service.RegisterProvider(mockProvider)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	provider, exists := service.GetProvider(ProviderTypeEmail)
	if !exists {
		t.Fatal("Expected provider to be registered")
	}

	if provider.GetType() != ProviderTypeEmail {
		t.Fatalf("Expected provider type %v, got %v", ProviderTypeEmail, provider.GetType())
	}
}

func TestRegisterNilProvider(t *testing.T) {
	service := NewService(nil)

	err := service.RegisterProvider(nil)
	if err == nil {
		t.Fatal("Expected error when registering nil provider")
	}
}

func TestGetEnabledProviders(t *testing.T) {
	service := NewService(nil)

	// Register enabled and disabled providers
	enabledProvider := NewMockProvider(ProviderTypeEmail, true)
	disabledProvider := NewMockProvider(ProviderTypeSlack, false)

	service.RegisterProvider(enabledProvider)
	service.RegisterProvider(disabledProvider)

	enabled := service.GetEnabledProviders()

	if len(enabled) != 1 {
		t.Fatalf("Expected 1 enabled provider, got %d", len(enabled))
	}

	if enabled[0].GetType() != ProviderTypeEmail {
		t.Fatalf("Expected email provider, got %v", enabled[0].GetType())
	}
}

func TestSendNotification(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	data := NotificationData{
		Type:      NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "Test message",
		Timestamp: time.Now(),
	}

	result := service.SendNotification(context.Background(), ProviderTypeEmail, data)

	if !result.Success {
		t.Fatalf("Expected notification to succeed, got error: %v", result.Error)
	}
}

func TestSendNotificationToNonexistentProvider(t *testing.T) {
	service := NewService(nil)

	data := NotificationData{
		Type:      NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "Test message",
		Timestamp: time.Now(),
	}

	result := service.SendNotification(context.Background(), ProviderTypeEmail, data)

	if result.Success {
		t.Fatal("Expected notification to fail for nonexistent provider")
	}

	if result.Error == nil {
		t.Fatal("Expected error for nonexistent provider")
	}
}

func TestSendNotificationToDisabledProvider(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, false) // disabled
	service.RegisterProvider(mockProvider)

	data := NotificationData{
		Type:      NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "Test message",
		Timestamp: time.Now(),
	}

	result := service.SendNotification(context.Background(), ProviderTypeEmail, data)

	if result.Success {
		t.Fatal("Expected notification to fail for disabled provider")
	}
}

func TestSendNotificationToAll(t *testing.T) {
	service := NewService(nil)

	// Register multiple enabled providers
	emailProvider := NewMockProvider(ProviderTypeEmail, true)
	slackProvider := NewMockProvider(ProviderTypeSlack, true)
	disabledProvider := NewMockProvider(ProviderTypeDiscord, false)

	service.RegisterProvider(emailProvider)
	service.RegisterProvider(slackProvider)
	service.RegisterProvider(disabledProvider)

	data := NotificationData{
		Type:      NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "Test message",
		Timestamp: time.Now(),
	}

	results := service.SendNotificationToAll(context.Background(), data)

	if len(results) != 2 {
		t.Fatalf("Expected 2 results (only enabled providers), got %d", len(results))
	}

	emailResult, exists := results[ProviderTypeEmail]
	if !exists || !emailResult.Success {
		t.Fatal("Expected email notification to succeed")
	}

	slackResult, exists := results[ProviderTypeSlack]
	if !exists || !slackResult.Success {
		t.Fatal("Expected slack notification to succeed")
	}

	// Discord should not be in results since it's disabled
	_, exists = results[ProviderTypeDiscord]
	if exists {
		t.Fatal("Expected disabled provider to not be in results")
	}
}

func TestTestAllProviders(t *testing.T) {
	service := NewService(nil)

	goodProvider := NewMockProvider(ProviderTypeEmail, true)
	badProvider := NewMockProvider(ProviderTypeSlack, true)
	badProvider.SetShouldFail(true)
	disabledProvider := NewMockProvider(ProviderTypeDiscord, false)

	service.RegisterProvider(goodProvider)
	service.RegisterProvider(badProvider)
	service.RegisterProvider(disabledProvider)

	results := service.TestAllProviders(context.Background())

	if len(results) != 2 {
		t.Fatalf("Expected 2 test results (only enabled providers), got %d", len(results))
	}

	emailErr, exists := results[ProviderTypeEmail]
	if !exists {
		t.Fatal("Expected email provider test result")
	}
	if emailErr != nil {
		t.Fatalf("Expected email provider test to succeed, got error: %v", emailErr)
	}

	slackErr, exists := results[ProviderTypeSlack]
	if !exists {
		t.Fatal("Expected slack provider test result")
	}
	if slackErr == nil {
		t.Fatal("Expected slack provider test to fail")
	}

	// Discord should not be tested since it's disabled
	_, exists = results[ProviderTypeDiscord]
	if exists {
		t.Fatal("Expected disabled provider to not be tested")
	}
}
