package providers

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

func TestNewWebhookProvider(t *testing.T) {
	provider := NewWebhookProvider(nil)

	if provider == nil {
		t.Fatal("Expected provider to be created")
	}

	if provider.GetType() != notification.ProviderTypeWebhook {
		t.Fatalf("Expected provider type %v, got %v", notification.ProviderTypeWebhook, provider.GetType())
	}

	if provider.IsEnabled() {
		t.Fatal("Expected provider to be disabled by default")
	}
}

func TestWebhookProviderConfigure(t *testing.T) {
	provider := NewWebhookProvider(slog.Default())

	config := notification.ProviderConfig{
		Type:    notification.ProviderTypeWebhook,
		Enabled: true,
		Settings: map[string]interface{}{
			"webhook_url": "https://webhook.example.com/notify",
			"headers": map[string]string{
				"Authorization": "Bearer token123",
				"X-Custom":      "value",
			},
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

func TestWebhookProviderConfigureInvalidType(t *testing.T) {
	provider := NewWebhookProvider(nil)

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

func TestWebhookProviderConfigureMissingURL(t *testing.T) {
	provider := NewWebhookProvider(nil)

	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeWebhook,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for missing webhook_url")
	}
}

func TestWebhookProviderSendNotificationDisabled(t *testing.T) {
	provider := NewWebhookProvider(nil)
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
