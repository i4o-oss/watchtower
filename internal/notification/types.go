package notification

import (
	"context"
	"time"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeEndpointDown     NotificationType = "endpoint_down"
	NotificationTypeEndpointUp       NotificationType = "endpoint_up"
	NotificationTypeIncidentCreated  NotificationType = "incident_created"
	NotificationTypeIncidentUpdated  NotificationType = "incident_updated"
	NotificationTypeIncidentResolved NotificationType = "incident_resolved"
)

// NotificationData contains the data to be sent in a notification
type NotificationData struct {
	Type       NotificationType
	Title      string
	Message    string
	EndpointID *int
	IncidentID *int
	Severity   string
	URL        string
	Timestamp  time.Time
	Metadata   map[string]interface{}
}

// ProviderType represents the type of notification provider
type ProviderType string

const (
	ProviderTypeEmail   ProviderType = "email"
	ProviderTypeSlack   ProviderType = "slack"
	ProviderTypeDiscord ProviderType = "discord"
	ProviderTypeWebhook ProviderType = "webhook"
)

// ProviderConfig contains configuration for a notification provider
type ProviderConfig struct {
	Type     ProviderType
	Enabled  bool
	Settings map[string]interface{}
}

// DeliveryResult represents the result of a notification delivery attempt
type DeliveryResult struct {
	Success   bool
	Error     error
	Timestamp time.Time
	Details   string
}

// NotificationProvider defines the interface that all notification providers must implement
type NotificationProvider interface {
	// GetType returns the provider type
	GetType() ProviderType

	// IsEnabled returns whether this provider is enabled
	IsEnabled() bool

	// Configure sets up the provider with the given configuration
	Configure(config ProviderConfig) error

	// SendNotification sends a notification and returns the delivery result
	SendNotification(ctx context.Context, data NotificationData) DeliveryResult

	// TestConnection tests if the provider is properly configured and can send notifications
	TestConnection(ctx context.Context) error
}
