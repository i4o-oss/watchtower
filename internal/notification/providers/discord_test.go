package providers

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

func TestNewDiscordProvider(t *testing.T) {
	provider := NewDiscordProvider(nil)

	if provider == nil {
		t.Fatal("Expected provider to be created")
	}

	if provider.GetType() != notification.ProviderTypeDiscord {
		t.Fatalf("Expected provider type %v, got %v", notification.ProviderTypeDiscord, provider.GetType())
	}

	if provider.IsEnabled() {
		t.Fatal("Expected provider to be disabled by default")
	}
}

func TestDiscordProviderConfigure(t *testing.T) {
	provider := NewDiscordProvider(slog.Default())

	config := notification.ProviderConfig{
		Type:    notification.ProviderTypeDiscord,
		Enabled: true,
		Settings: map[string]interface{}{
			"webhook_url": "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
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

func TestDiscordProviderConfigureInvalidType(t *testing.T) {
	provider := NewDiscordProvider(nil)

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

func TestDiscordProviderConfigureMissingURL(t *testing.T) {
	provider := NewDiscordProvider(nil)

	config := notification.ProviderConfig{
		Type:     notification.ProviderTypeDiscord,
		Enabled:  true,
		Settings: map[string]interface{}{},
	}

	err := provider.Configure(config)
	if err == nil {
		t.Fatal("Expected error for missing webhook_url")
	}
}

func TestDiscordProviderSendNotificationDisabled(t *testing.T) {
	provider := NewDiscordProvider(nil)
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
