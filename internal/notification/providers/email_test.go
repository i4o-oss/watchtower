package providers

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

func TestNewEmailProvider(t *testing.T) {
	provider := NewEmailProvider(nil)

	if provider == nil {
		t.Fatal("Expected provider to be created")
	}

	if provider.GetType() != notification.ProviderTypeEmail {
		t.Fatalf("Expected provider type %v, got %v", notification.ProviderTypeEmail, provider.GetType())
	}

	if provider.IsEnabled() {
		t.Fatal("Expected provider to be disabled by default")
	}
}

func TestEmailProviderConfigure(t *testing.T) {
	provider := NewEmailProvider(slog.Default())

	config := notification.ProviderConfig{
		Type:    notification.ProviderTypeEmail,
		Enabled: true,
		Settings: map[string]interface{}{
			"smtp_host":  "smtp.example.com",
			"smtp_port":  "587",
			"username":   "test@example.com",
			"password":   "password123",
			"from_email": "alerts@example.com",
			"from_name":  "Test Alerts",
			"to_emails":  []string{"admin@example.com", "ops@example.com"},
		},
	}

	err := provider.Configure(config)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if !provider.IsEnabled() {
		t.Fatal("Expected provider to be enabled after configuration")
	}
}

func TestEmailProviderConfigureInvalidType(t *testing.T) {
	provider := NewEmailProvider(nil)

	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeSlack,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for invalid provider type")
	}
}

func TestEmailProviderConfigureMissingRequiredFields(t *testing.T) {
	provider := NewEmailProvider(nil)

	// Test one critical missing field case
	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeEmail,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for missing required fields")
	}
}

func TestEmailProviderSendNotificationDisabled(t *testing.T) {
	provider := NewEmailProvider(nil)
	// Don't configure the provider, so it remains disabled

	data := notification.NotificationData{
		Type:      notification.NotificationTypeEndpointDown,
		Title:     "Test",
		Message:   "Test message",
		Timestamp: time.Now(),
	}

	result := provider.SendNotification(context.Background(), data)

	if result.Success {
		t.Fatal("Expected notification to fail for disabled provider")
	}

	if result.Error == nil {
		t.Fatal("Expected error for disabled provider")
	}
}
