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

// WebhookProvider implements notification.NotificationProvider for generic webhook notifications
type WebhookProvider struct {
	enabled    bool
	webhookURL string
	headers    map[string]string
	logger     *slog.Logger
	httpClient *http.Client
}

// WebhookConfig contains configuration for the webhook provider
type WebhookConfig struct {
	WebhookURL string            `json:"webhook_url"`
	Headers    map[string]string `json:"headers"`
}

// NewWebhookProvider creates a new webhook notification provider
func NewWebhookProvider(logger *slog.Logger) *WebhookProvider {
	if logger == nil {
		logger = slog.Default()
	}

	return &WebhookProvider{
		enabled: false,
		headers: make(map[string]string),
		logger:  logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetType returns the provider type
func (w *WebhookProvider) GetType() notification.ProviderType {
	return notification.ProviderTypeWebhook
}

// IsEnabled returns whether this provider is enabled
func (w *WebhookProvider) IsEnabled() bool {
	return w.enabled
}

// Configure sets up the provider with the given configuration
func (w *WebhookProvider) Configure(config notification.ProviderConfig) error {
	if config.Type != notification.ProviderTypeWebhook {
		return fmt.Errorf("invalid provider type: expected %s, got %s", notification.ProviderTypeWebhook, config.Type)
	}

	// Extract webhook URL
	webhookURL, ok := config.Settings["webhook_url"].(string)
	if !ok || webhookURL == "" {
		return fmt.Errorf("webhook_url is required")
	}

	// Extract headers (optional)
	headers := make(map[string]string)
	if headersInterface, ok := config.Settings["headers"]; ok {
		switch v := headersInterface.(type) {
		case map[string]string:
			headers = v
		case map[string]interface{}:
			for key, value := range v {
				if valueStr, ok := value.(string); ok {
					headers[key] = valueStr
				}
			}
		}
	}

	// Set default Content-Type if not provided
	if _, exists := headers["Content-Type"]; !exists {
		headers["Content-Type"] = "application/json"
	}

	w.webhookURL = webhookURL
	w.headers = headers
	w.enabled = config.Enabled

	w.logger.Info("Webhook provider configured",
		"webhook_url", webhookURL,
		"headers_count", len(headers),
		"enabled", w.enabled)

	return nil
}

// SendNotification sends a webhook notification
func (w *WebhookProvider) SendNotification(ctx context.Context, data notification.NotificationData) notification.DeliveryResult {
	if !w.enabled {
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("webhook provider is disabled"),
			Timestamp: time.Now(),
			Details:   "Provider disabled",
		}
	}

	// Build webhook payload
	payload := w.buildWebhookPayload(data)

	// Send webhook request
	err := w.sendWebhookRequest(ctx, payload)
	if err != nil {
		w.logger.Error("Failed to send webhook",
			"webhook_url", w.webhookURL,
			"error", err)
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("failed to send webhook: %w", err),
			Timestamp: time.Now(),
			Details:   fmt.Sprintf("HTTP request failed: %s", err.Error()),
		}
	}

	w.logger.Info("Webhook notification sent successfully",
		"webhook_url", w.webhookURL,
		"type", data.Type)

	return notification.DeliveryResult{
		Success:   true,
		Timestamp: time.Now(),
		Details:   "Webhook sent successfully",
	}
}

// TestConnection tests if the provider is properly configured and can send webhooks
func (w *WebhookProvider) TestConnection(ctx context.Context) error {
	if !w.enabled {
		return fmt.Errorf("webhook provider is disabled")
	}

	// Create a test payload
	testData := notification.NotificationData{
		Type:      notification.NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "This is a test notification from Watchtower",
		Timestamp: time.Now(),
	}

	payload := w.buildWebhookPayload(testData)

	// Send test webhook
	err := w.sendWebhookRequest(ctx, payload)
	if err != nil {
		return fmt.Errorf("webhook test failed: %w", err)
	}

	return nil
}

// buildWebhookPayload builds the JSON payload for the webhook
func (w *WebhookProvider) buildWebhookPayload(data notification.NotificationData) map[string]interface{} {
	payload := map[string]interface{}{
		"type":      string(data.Type),
		"title":     data.Title,
		"message":   data.Message,
		"timestamp": data.Timestamp.Format(time.RFC3339),
	}

	if data.URL != "" {
		payload["url"] = data.URL
	}
	if data.Severity != "" {
		payload["severity"] = data.Severity
	}
	if data.EndpointID != nil {
		payload["endpoint_id"] = *data.EndpointID
	}
	if data.IncidentID != nil {
		payload["incident_id"] = *data.IncidentID
	}

	return payload
}

// sendWebhookRequest sends the HTTP webhook request
func (w *WebhookProvider) sendWebhookRequest(ctx context.Context, payload map[string]interface{}) error {
	// Marshal payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", w.webhookURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	for key, value := range w.headers {
		req.Header.Set(key, value)
	}

	// Send request
	resp, err := w.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
