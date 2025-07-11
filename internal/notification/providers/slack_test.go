package providers

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

func TestNewSlackProvider(t *testing.T) {
	provider := NewSlackProvider(nil)

	if provider == nil {
		t.Fatal("Expected provider to be created")
	}

	if provider.GetType() != notification.ProviderTypeSlack {
		t.Fatalf("Expected provider type %v, got %v", notification.ProviderTypeSlack, provider.GetType())
	}

	if provider.IsEnabled() {
		t.Fatal("Expected provider to be disabled by default")
	}
}

func TestSlackProviderConfigure(t *testing.T) {
	provider := NewSlackProvider(slog.Default())

	config := notification.ProviderConfig{
		Type:    notification.ProviderTypeSlack,
		Enabled: true,
		Settings: map[string]interface{}{
			"webhook_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
			"channel":     "#alerts",
			"username":    "Watchtower Bot",
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

func TestSlackProviderConfigureInvalidType(t *testing.T) {
	provider := NewSlackProvider(nil)

	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeEmail,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for invalid provider type")
	}
}

func TestSlackProviderConfigureMissingURL(t *testing.T) {
	provider := NewSlackProvider(nil)

	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeSlack,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for missing webhook_url")
	}
}

func TestSlackProviderSendNotificationDisabled(t *testing.T) {
	provider := NewSlackProvider(nil)
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
