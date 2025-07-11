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

// SlackProvider implements notification.NotificationProvider for Slack webhook notifications
type SlackProvider struct {
	enabled    bool
	webhookURL string
	channel    string
	username   string
	logger     *slog.Logger
	httpClient *http.Client
}

// SlackConfig contains configuration for the Slack provider
type SlackConfig struct {
	WebhookURL string `json:"webhook_url"`
	Channel    string `json:"channel"`
	Username   string `json:"username"`
}

// SlackMessage represents a Slack webhook message
type SlackMessage struct {
	Text        string            `json:"text"`
	Channel     string            `json:"channel,omitempty"`
	Username    string            `json:"username,omitempty"`
	Attachments []SlackAttachment `json:"attachments,omitempty"`
}

// SlackAttachment represents a Slack message attachment
type SlackAttachment struct {
	Color     string       `json:"color"`
	Title     string       `json:"title"`
	Text      string       `json:"text"`
	Fields    []SlackField `json:"fields,omitempty"`
	Footer    string       `json:"footer"`
	Timestamp int64        `json:"ts"`
}

// SlackField represents a field in a Slack attachment
type SlackField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

// NewSlackProvider creates a new Slack notification provider
func NewSlackProvider(logger *slog.Logger) *SlackProvider {
	if logger == nil {
		logger = slog.Default()
	}

	return &SlackProvider{
		enabled: false,
		logger:  logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetType returns the provider type
func (s *SlackProvider) GetType() notification.ProviderType {
	return notification.ProviderTypeSlack
}

// IsEnabled returns whether this provider is enabled
func (s *SlackProvider) IsEnabled() bool {
	return s.enabled
}

// Configure sets up the provider with the given configuration
func (s *SlackProvider) Configure(config notification.ProviderConfig) error {
	if config.Type != notification.ProviderTypeSlack {
		return fmt.Errorf("invalid provider type: expected %s, got %s", notification.ProviderTypeSlack, config.Type)
	}

	// Extract webhook URL
	webhookURL, ok := config.Settings["webhook_url"].(string)
	if !ok || webhookURL == "" {
		return fmt.Errorf("webhook_url is required")
	}

	// Extract optional channel
	channel, _ := config.Settings["channel"].(string)

	// Extract optional username
	username, _ := config.Settings["username"].(string)
	if username == "" {
		username = "Watchtower"
	}

	s.webhookURL = webhookURL
	s.channel = channel
	s.username = username
	s.enabled = config.Enabled

	s.logger.Info("Slack provider configured",
		"webhook_url", webhookURL,
		"channel", channel,
		"username", username,
		"enabled", s.enabled)

	return nil
}

// SendNotification sends a Slack notification
func (s *SlackProvider) SendNotification(ctx context.Context, data notification.NotificationData) notification.DeliveryResult {
	if !s.enabled {
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("slack provider is disabled"),
			Timestamp: time.Now(),
			Details:   "Provider disabled",
		}
	}

	// Build Slack message
	message := s.buildSlackMessage(data)

	// Send Slack webhook
	err := s.sendSlackWebhook(ctx, message)
	if err != nil {
		s.logger.Error("Failed to send Slack notification",
			"webhook_url", s.webhookURL,
			"error", err)
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("failed to send Slack notification: %w", err),
			Timestamp: time.Now(),
			Details:   fmt.Sprintf("Slack webhook failed: %s", err.Error()),
		}
	}

	s.logger.Info("Slack notification sent successfully",
		"webhook_url", s.webhookURL,
		"type", data.Type)

	return notification.DeliveryResult{
		Success:   true,
		Timestamp: time.Now(),
		Details:   "Slack notification sent successfully",
	}
}

// TestConnection tests if the provider is properly configured and can send messages
func (s *SlackProvider) TestConnection(ctx context.Context) error {
	if !s.enabled {
		return fmt.Errorf("slack provider is disabled")
	}

	// Create a test message
	testData := notification.NotificationData{
		Type:      notification.NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "This is a test notification from Watchtower",
		Timestamp: time.Now(),
	}

	message := s.buildSlackMessage(testData)

	// Send test message
	err := s.sendSlackWebhook(ctx, message)
	if err != nil {
		return fmt.Errorf("slack test failed: %w", err)
	}

	return nil
}

// buildSlackMessage builds a Slack message from notification data
func (s *SlackProvider) buildSlackMessage(data notification.NotificationData) SlackMessage {
	color := s.getColorForType(data.Type)
	emoji := s.getEmojiForType(data.Type)

	attachment := SlackAttachment{
		Color:     color,
		Title:     fmt.Sprintf("%s %s", emoji, data.Title),
		Text:      data.Message,
		Footer:    "Watchtower",
		Timestamp: data.Timestamp.Unix(),
	}

	// Add fields for additional information
	var fields []SlackField

	if data.URL != "" {
		fields = append(fields, SlackField{
			Title: "URL",
			Value: data.URL,
			Short: false,
		})
	}

	if data.Severity != "" {
		fields = append(fields, SlackField{
			Title: "Severity",
			Value: data.Severity,
			Short: true,
		})
	}

	if data.EndpointID != nil {
		fields = append(fields, SlackField{
			Title: "Endpoint ID",
			Value: fmt.Sprintf("%d", *data.EndpointID),
			Short: true,
		})
	}

	if data.IncidentID != nil {
		fields = append(fields, SlackField{
			Title: "Incident ID",
			Value: fmt.Sprintf("%d", *data.IncidentID),
			Short: true,
		})
	}

	attachment.Fields = fields

	message := SlackMessage{
		Text:        fmt.Sprintf("%s %s", emoji, data.Title),
		Username:    s.username,
		Attachments: []SlackAttachment{attachment},
	}

	if s.channel != "" {
		message.Channel = s.channel
	}

	return message
}

// sendSlackWebhook sends the Slack webhook request
func (s *SlackProvider) sendSlackWebhook(ctx context.Context, message SlackMessage) error {
	// Marshal message to JSON
	jsonPayload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Slack message: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", s.webhookURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Slack webhook returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// getColorForType returns the appropriate color for the notification type
func (s *SlackProvider) getColorForType(notificationType notification.NotificationType) string {
	switch notificationType {
	case notification.NotificationTypeEndpointDown:
		return "danger" // Red
	case notification.NotificationTypeEndpointUp:
		return "good" // Green
	case notification.NotificationTypeIncidentCreated:
		return "danger" // Red
	case notification.NotificationTypeIncidentUpdated:
		return "warning" // Yellow
	case notification.NotificationTypeIncidentResolved:
		return "good" // Green
	default:
		return "#36a64f" // Default blue
	}
}

// getEmojiForType returns the appropriate emoji for the notification type
func (s *SlackProvider) getEmojiForType(notificationType notification.NotificationType) string {
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
