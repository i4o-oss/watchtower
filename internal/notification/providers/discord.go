package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

// DiscordProvider implements notification.NotificationProvider for Discord webhook notifications
type DiscordProvider struct {
	enabled    bool
	webhookURL string
	username   string
	logger     *slog.Logger
	httpClient *http.Client
}

// DiscordConfig contains configuration for the Discord provider
type DiscordConfig struct {
	WebhookURL string `json:"webhook_url"`
	Username   string `json:"username"`
}

// DiscordMessage represents a Discord webhook message
type DiscordMessage struct {
	Content  string         `json:"content"`
	Username string         `json:"username,omitempty"`
	Embeds   []DiscordEmbed `json:"embeds,omitempty"`
}

// DiscordEmbed represents a Discord message embed
type DiscordEmbed struct {
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Color       int                 `json:"color"`
	Fields      []DiscordEmbedField `json:"fields,omitempty"`
	Footer      DiscordEmbedFooter  `json:"footer"`
	Timestamp   string              `json:"timestamp"`
}

// DiscordEmbedField represents a field in a Discord embed
type DiscordEmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

// DiscordEmbedFooter represents the footer of a Discord embed
type DiscordEmbedFooter struct {
	Text string `json:"text"`
}

// NewDiscordProvider creates a new Discord notification provider
func NewDiscordProvider(logger *slog.Logger) *DiscordProvider {
	if logger == nil {
		logger = slog.Default()
	}

	return &DiscordProvider{
		enabled: false,
		logger:  logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetType returns the provider type
func (d *DiscordProvider) GetType() notification.ProviderType {
	return notification.ProviderTypeDiscord
}

// IsEnabled returns whether this provider is enabled
func (d *DiscordProvider) IsEnabled() bool {
	return d.enabled
}

// Configure sets up the provider with the given configuration
func (d *DiscordProvider) Configure(config notification.ProviderConfig) error {
	if config.Type != notification.ProviderTypeDiscord {
		return fmt.Errorf("invalid provider type: expected %s, got %s", notification.ProviderTypeDiscord, config.Type)
	}

	// Extract webhook URL
	webhookURL, ok := config.Settings["webhook_url"].(string)
	if !ok || webhookURL == "" {
		return fmt.Errorf("webhook_url is required")
	}

	// Extract optional username
	username, _ := config.Settings["username"].(string)
	if username == "" {
		username = "Watchtower"
	}

	d.webhookURL = webhookURL
	d.username = username
	d.enabled = config.Enabled

	d.logger.Info("Discord provider configured",
		"webhook_url", webhookURL,
		"username", username,
		"enabled", d.enabled)

	return nil
}

// SendNotification sends a Discord notification
func (d *DiscordProvider) SendNotification(ctx context.Context, data notification.NotificationData) notification.DeliveryResult {
	if !d.enabled {
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("discord provider is disabled"),
			Timestamp: time.Now(),
			Details:   "Provider disabled",
		}
	}

	// Build Discord message
	message := d.buildDiscordMessage(data)

	// Send Discord webhook
	err := d.sendDiscordWebhook(ctx, message)
	if err != nil {
		d.logger.Error("Failed to send Discord notification",
			"webhook_url", d.webhookURL,
			"error", err)
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("failed to send Discord notification: %w", err),
			Timestamp: time.Now(),
			Details:   fmt.Sprintf("Discord webhook failed: %s", err.Error()),
		}
	}

	d.logger.Info("Discord notification sent successfully",
		"webhook_url", d.webhookURL,
		"type", data.Type)

	return notification.DeliveryResult{
		Success:   true,
		Timestamp: time.Now(),
		Details:   "Discord notification sent successfully",
	}
}

// TestConnection tests if the provider is properly configured and can send messages
func (d *DiscordProvider) TestConnection(ctx context.Context) error {
	if !d.enabled {
		return fmt.Errorf("discord provider is disabled")
	}

	// Create a test message
	testData := notification.NotificationData{
		Type:      notification.NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "This is a test notification from Watchtower",
		Timestamp: time.Now(),
	}

	message := d.buildDiscordMessage(testData)

	// Send test message
	err := d.sendDiscordWebhook(ctx, message)
	if err != nil {
		return fmt.Errorf("discord test failed: %w", err)
	}

	return nil
}

// buildDiscordMessage builds a Discord message from notification data
func (d *DiscordProvider) buildDiscordMessage(data notification.NotificationData) DiscordMessage {
	color := d.getColorForType(data.Type)
	emoji := d.getEmojiForType(data.Type)

	embed := DiscordEmbed{
		Title:       fmt.Sprintf("%s %s", emoji, data.Title),
		Description: data.Message,
		Color:       color,
		Footer: DiscordEmbedFooter{
			Text: "Watchtower",
		},
		Timestamp: data.Timestamp.Format(time.RFC3339),
	}

	// Add fields for additional information
	var fields []DiscordEmbedField

	if data.URL != "" {
		fields = append(fields, DiscordEmbedField{
			Name:   "URL",
			Value:  data.URL,
			Inline: false,
		})
	}

	if data.Severity != "" {
		fields = append(fields, DiscordEmbedField{
			Name:   "Severity",
			Value:  data.Severity,
			Inline: true,
		})
	}

	if data.EndpointID != nil {
		fields = append(fields, DiscordEmbedField{
			Name:   "Endpoint ID",
			Value:  fmt.Sprintf("%d", *data.EndpointID),
			Inline: true,
		})
	}

	if data.IncidentID != nil {
		fields = append(fields, DiscordEmbedField{
			Name:   "Incident ID",
			Value:  fmt.Sprintf("%d", *data.IncidentID),
			Inline: true,
		})
	}

	embed.Fields = fields

	message := DiscordMessage{
		Content:  fmt.Sprintf("%s %s", emoji, data.Title),
		Username: d.username,
		Embeds:   []DiscordEmbed{embed},
	}

	return message
}

// sendDiscordWebhook sends the Discord webhook request
func (d *DiscordProvider) sendDiscordWebhook(ctx context.Context, message DiscordMessage) error {
	// Marshal message to JSON
	jsonPayload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Discord message: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", d.webhookURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := d.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Discord webhook returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// getColorForType returns the appropriate color for the notification type (as decimal)
func (d *DiscordProvider) getColorForType(notificationType notification.NotificationType) int {
	switch notificationType {
	case notification.NotificationTypeEndpointDown:
		return 15158332 // Red (#E74C3C)
	case notification.NotificationTypeEndpointUp:
		return 3066993 // Green (#2ECC71)
	case notification.NotificationTypeIncidentCreated:
		return 15158332 // Red (#E74C3C)
	case notification.NotificationTypeIncidentUpdated:
		return 15105570 // Orange (#E67E22)
	case notification.NotificationTypeIncidentResolved:
		return 3066993 // Green (#2ECC71)
	default:
		return 3447003 // Blue (#3498DB)
	}
}

// getEmojiForType returns the appropriate emoji for the notification type
func (d *DiscordProvider) getEmojiForType(notificationType notification.NotificationType) string {
	switch notificationType {
	case notification.NotificationTypeEndpointDown:
		return "🔴"
	case notification.NotificationTypeEndpointUp:
		return "🟢"
	case notification.NotificationTypeIncidentCreated:
		return "🚨"
	case notification.NotificationTypeIncidentUpdated:
		return "📋"
	case notification.NotificationTypeIncidentResolved:
		return "✅"
	default:
		return "📢"
	}
}
