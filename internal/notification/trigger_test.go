package notification

import (
	"context"
	"log/slog"
	"testing"
	"time"
)

func TestNewNotificationTrigger(t *testing.T) {
	service := NewService(nil)
	trigger := NewNotificationTrigger(service, nil)

	if trigger == nil {
		t.Fatal("Expected trigger to be created")
	}

	if trigger.service != service {
		t.Fatal("Expected service to be set")
	}
}

func TestTriggerEndpointDown(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	err := trigger.TriggerEndpointDown(context.Background(), 123, "API Server", "https://api.example.com", "Connection timeout")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestTriggerEndpointUp(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	downDuration := 5 * time.Minute
	err := trigger.TriggerEndpointUp(context.Background(), 123, "API Server", "https://api.example.com", downDuration)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestTriggerIncidentCreated(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	affectedEndpoints := []int{123, 456}
	err := trigger.TriggerIncidentCreated(context.Background(), 789, "Database Issue", "Database is experiencing high latency", "critical", affectedEndpoints)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestTriggerIncidentUpdated(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	err := trigger.TriggerIncidentUpdated(context.Background(), 789, "Database Issue", "Issue has been identified and fix is in progress", "high")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestTriggerIncidentResolved(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	incidentDuration := 2 * time.Hour
	err := trigger.TriggerIncidentResolved(context.Background(), 789, "Database Issue", "Database latency has returned to normal", incidentDuration)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestTriggerTestNotification(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	// Test with specific provider
	providerType := ProviderTypeEmail
	err := trigger.TriggerTestNotification(context.Background(), &providerType)
	if err != nil {
		t.Fatalf("Expected no error for specific provider, got %v", err)
	}

	// Test with all providers
	err = trigger.TriggerTestNotification(context.Background(), nil)
	if err != nil {
		t.Fatalf("Expected no error for all providers, got %v", err)
	}
}

func TestTriggerWithFailedProvider(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	mockProvider.SetShouldFail(true) // Make it fail
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, slog.Default())

	err := trigger.TriggerEndpointDown(context.Background(), 123, "API Server", "https://api.example.com", "Connection timeout")
	if err == nil {
		t.Fatal("Expected error when provider fails")
	}
}

func TestNewRetryableNotificationTrigger(t *testing.T) {
	service := NewService(nil)
	trigger := NewNotificationTrigger(service, nil)
	retryConfig := DefaultRetryConfig()

	retryableTrigger := NewRetryableNotificationTrigger(trigger, retryConfig, nil)

	if retryableTrigger == nil {
		t.Fatal("Expected retryable trigger to be created")
	}

	if retryableTrigger.trigger != trigger {
		t.Fatal("Expected trigger to be set")
	}
}

func TestRetryableNotificationTriggerSuccess(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, nil)
	retryConfig := RetryConfig{
		MaxAttempts:   3,
		InitialDelay:  10 * time.Millisecond,
		MaxDelay:      100 * time.Millisecond,
		BackoffFactor: 2.0,
		EnableJitter:  false,
	}

	retryableTrigger := NewRetryableNotificationTrigger(trigger, retryConfig, slog.Default())

	err := retryableTrigger.TriggerEndpointDownWithRetry(context.Background(), 123, "API Server", "https://api.example.com", "Connection timeout")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestRetryableNotificationTriggerMaxAttemptsReached(t *testing.T) {
	service := NewService(nil)
	mockProvider := NewMockProvider(ProviderTypeEmail, true)
	mockProvider.SetShouldFail(true) // Always fail
	service.RegisterProvider(mockProvider)

	trigger := NewNotificationTrigger(service, nil)
	retryConfig := RetryConfig{
		MaxAttempts:   2,
		InitialDelay:  10 * time.Millisecond,
		MaxDelay:      100 * time.Millisecond,
		BackoffFactor: 2.0,
		EnableJitter:  false,
	}

	retryableTrigger := NewRetryableNotificationTrigger(trigger, retryConfig, slog.Default())

	err := retryableTrigger.TriggerEndpointDownWithRetry(context.Background(), 123, "API Server", "https://api.example.com", "Connection timeout")
	if err == nil {
		t.Fatal("Expected error when max attempts reached")
	}
}
