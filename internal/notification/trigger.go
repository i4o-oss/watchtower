package notification

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"
)

// NotificationTrigger handles triggering notifications based on system events
type NotificationTrigger struct {
	service *Service
	logger  *slog.Logger
}

// NewNotificationTrigger creates a new notification trigger
func NewNotificationTrigger(service *Service, logger *slog.Logger) *NotificationTrigger {
	if logger == nil {
		logger = slog.Default()
	}

	return &NotificationTrigger{
		service: service,
		logger:  logger,
	}
}

// TriggerEndpointDown sends notifications when an endpoint goes down
func (nt *NotificationTrigger) TriggerEndpointDown(ctx context.Context, endpointID int, endpointName, endpointURL, errorMessage string) error {
	data := NotificationData{
		Type:       NotificationTypeEndpointDown,
		Title:      fmt.Sprintf("%s is DOWN", endpointName),
		Message:    fmt.Sprintf("Endpoint %s (%s) is not responding: %s", endpointName, endpointURL, errorMessage),
		EndpointID: &endpointID,
		URL:        endpointURL,
		Severity:   "critical",
		Timestamp:  time.Now(),
	}

	nt.logger.Info("Triggering endpoint down notification",
		"endpoint_id", endpointID,
		"endpoint_name", endpointName,
		"url", endpointURL)

	results := nt.service.SendNotificationToAll(ctx, data)
	return nt.logResults("endpoint_down", results)
}

// TriggerEndpointUp sends notifications when an endpoint comes back up
func (nt *NotificationTrigger) TriggerEndpointUp(ctx context.Context, endpointID int, endpointName, endpointURL string, downDuration time.Duration) error {
	data := NotificationData{
		Type:       NotificationTypeEndpointUp,
		Title:      fmt.Sprintf("%s is UP", endpointName),
		Message:    fmt.Sprintf("Endpoint %s (%s) has recovered after being down for %v", endpointName, endpointURL, downDuration),
		EndpointID: &endpointID,
		URL:        endpointURL,
		Severity:   "info",
		Timestamp:  time.Now(),
	}

	nt.logger.Info("Triggering endpoint up notification",
		"endpoint_id", endpointID,
		"endpoint_name", endpointName,
		"url", endpointURL,
		"down_duration", downDuration)

	results := nt.service.SendNotificationToAll(ctx, data)
	return nt.logResults("endpoint_up", results)
}

// TriggerIncidentCreated sends notifications when a new incident is created
func (nt *NotificationTrigger) TriggerIncidentCreated(ctx context.Context, incidentID int, title, description, severity string, affectedEndpoints []int) error {
	data := NotificationData{
		Type:       NotificationTypeIncidentCreated,
		Title:      title,
		Message:    fmt.Sprintf("A new incident has been created: %s", description),
		IncidentID: &incidentID,
		Severity:   severity,
		Timestamp:  time.Now(),
		Metadata: map[string]interface{}{
			"affected_endpoints": affectedEndpoints,
		},
	}

	nt.logger.Info("Triggering incident created notification",
		"incident_id", incidentID,
		"title", title,
		"severity", severity,
		"affected_endpoints", len(affectedEndpoints))

	results := nt.service.SendNotificationToAll(ctx, data)
	return nt.logResults("incident_created", results)
}

// TriggerIncidentUpdated sends notifications when an incident is updated
func (nt *NotificationTrigger) TriggerIncidentUpdated(ctx context.Context, incidentID int, title, updateMessage, severity string) error {
	data := NotificationData{
		Type:       NotificationTypeIncidentUpdated,
		Title:      title,
		Message:    fmt.Sprintf("Incident update: %s", updateMessage),
		IncidentID: &incidentID,
		Severity:   severity,
		Timestamp:  time.Now(),
	}

	nt.logger.Info("Triggering incident updated notification",
		"incident_id", incidentID,
		"title", title,
		"severity", severity)

	results := nt.service.SendNotificationToAll(ctx, data)
	return nt.logResults("incident_updated", results)
}

// TriggerIncidentResolved sends notifications when an incident is resolved
func (nt *NotificationTrigger) TriggerIncidentResolved(ctx context.Context, incidentID int, title, resolutionMessage string, incidentDuration time.Duration) error {
	data := NotificationData{
		Type:       NotificationTypeIncidentResolved,
		Title:      title,
		Message:    fmt.Sprintf("Incident resolved: %s (Duration: %v)", resolutionMessage, incidentDuration),
		IncidentID: &incidentID,
		Severity:   "info",
		Timestamp:  time.Now(),
		Metadata: map[string]interface{}{
			"incident_duration": incidentDuration.String(),
		},
	}

	nt.logger.Info("Triggering incident resolved notification",
		"incident_id", incidentID,
		"title", title,
		"duration", incidentDuration)

	results := nt.service.SendNotificationToAll(ctx, data)
	return nt.logResults("incident_resolved", results)
}

// TriggerTestNotification sends a test notification to verify configuration
func (nt *NotificationTrigger) TriggerTestNotification(ctx context.Context, providerType *ProviderType) error {
	data := NotificationData{
		Type:      NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "This is a test notification from Watchtower to verify your notification settings are working correctly.",
		Severity:  "info",
		Timestamp: time.Now(),
	}

	nt.logger.Info("Triggering test notification", "provider_type", providerType)

	var results map[ProviderType]DeliveryResult
	if providerType != nil {
		// Send to specific provider
		result := nt.service.SendNotification(ctx, *providerType, data)
		results = map[ProviderType]DeliveryResult{
			*providerType: result,
		}
	} else {
		// Send to all providers
		results = nt.service.SendNotificationToAll(ctx, data)
	}

	return nt.logResults("test_notification", results)
}

// logResults logs the results of notification attempts and returns an error if any failed
func (nt *NotificationTrigger) logResults(triggerType string, results map[ProviderType]DeliveryResult) error {
	var failures []string
	successCount := 0

	for providerType, result := range results {
		if result.Success {
			successCount++
			nt.logger.Info("Notification sent successfully",
				"trigger_type", triggerType,
				"provider", providerType,
				"details", result.Details)
		} else {
			failures = append(failures, fmt.Sprintf("%s: %v", providerType, result.Error))
			nt.logger.Error("Notification failed",
				"trigger_type", triggerType,
				"provider", providerType,
				"error", result.Error,
				"details", result.Details)
		}
	}

	nt.logger.Info("Notification trigger completed",
		"trigger_type", triggerType,
		"total_providers", len(results),
		"successful", successCount,
		"failed", len(failures))

	if len(failures) > 0 {
		return fmt.Errorf("notification failures: %v", failures)
	}

	return nil
}

// RetryableNotificationTrigger wraps NotificationTrigger with retry functionality
type RetryableNotificationTrigger struct {
	trigger     *NotificationTrigger
	retryConfig RetryConfig
	logger      *slog.Logger
}

// NewRetryableNotificationTrigger creates a new retryable notification trigger
func NewRetryableNotificationTrigger(trigger *NotificationTrigger, retryConfig RetryConfig, logger *slog.Logger) *RetryableNotificationTrigger {
	if logger == nil {
		logger = slog.Default()
	}

	return &RetryableNotificationTrigger{
		trigger:     trigger,
		retryConfig: retryConfig,
		logger:      logger,
	}
}

// TriggerEndpointDownWithRetry triggers endpoint down notification with retry logic
func (rnt *RetryableNotificationTrigger) TriggerEndpointDownWithRetry(ctx context.Context, endpointID int, endpointName, endpointURL, errorMessage string) error {
	return rnt.executeWithRetry(ctx, "endpoint_down", func() error {
		return rnt.trigger.TriggerEndpointDown(ctx, endpointID, endpointName, endpointURL, errorMessage)
	})
}

// TriggerEndpointUpWithRetry triggers endpoint up notification with retry logic
func (rnt *RetryableNotificationTrigger) TriggerEndpointUpWithRetry(ctx context.Context, endpointID int, endpointName, endpointURL string, downDuration time.Duration) error {
	return rnt.executeWithRetry(ctx, "endpoint_up", func() error {
		return rnt.trigger.TriggerEndpointUp(ctx, endpointID, endpointName, endpointURL, downDuration)
	})
}

// TriggerIncidentCreatedWithRetry triggers incident created notification with retry logic
func (rnt *RetryableNotificationTrigger) TriggerIncidentCreatedWithRetry(ctx context.Context, incidentID int, title, description, severity string, affectedEndpoints []int) error {
	return rnt.executeWithRetry(ctx, "incident_created", func() error {
		return rnt.trigger.TriggerIncidentCreated(ctx, incidentID, title, description, severity, affectedEndpoints)
	})
}

// TriggerIncidentUpdatedWithRetry triggers incident updated notification with retry logic
func (rnt *RetryableNotificationTrigger) TriggerIncidentUpdatedWithRetry(ctx context.Context, incidentID int, title, updateMessage, severity string) error {
	return rnt.executeWithRetry(ctx, "incident_updated", func() error {
		return rnt.trigger.TriggerIncidentUpdated(ctx, incidentID, title, updateMessage, severity)
	})
}

// TriggerIncidentResolvedWithRetry triggers incident resolved notification with retry logic
func (rnt *RetryableNotificationTrigger) TriggerIncidentResolvedWithRetry(ctx context.Context, incidentID int, title, resolutionMessage string, incidentDuration time.Duration) error {
	return rnt.executeWithRetry(ctx, "incident_resolved", func() error {
		return rnt.trigger.TriggerIncidentResolved(ctx, incidentID, title, resolutionMessage, incidentDuration)
	})
}

// executeWithRetry executes a function with retry logic
func (rnt *RetryableNotificationTrigger) executeWithRetry(ctx context.Context, triggerType string, fn func() error) error {
	var lastError error

	for attempt := 1; attempt <= rnt.retryConfig.MaxAttempts; attempt++ {
		// Check if context is cancelled
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		rnt.logger.Debug("Attempting notification trigger",
			"trigger_type", triggerType,
			"attempt", attempt,
			"max_attempts", rnt.retryConfig.MaxAttempts)

		err := fn()
		if err == nil {
			if attempt > 1 {
				rnt.logger.Info("Notification trigger succeeded after retry",
					"trigger_type", triggerType,
					"attempt", attempt)
			}
			return nil
		}

		lastError = err

		// Don't retry on the last attempt
		if attempt == rnt.retryConfig.MaxAttempts {
			rnt.logger.Error("Notification trigger failed after all retries",
				"trigger_type", triggerType,
				"attempts", attempt,
				"error", err)
			break
		}

		// Calculate delay for next attempt
		delay := rnt.calculateDelay(attempt)

		rnt.logger.Warn("Notification trigger failed, retrying",
			"trigger_type", triggerType,
			"attempt", attempt,
			"error", err,
			"retry_delay", delay)

		// Wait before retrying
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			// Continue to next attempt
		}
	}

	return fmt.Errorf("notification trigger failed after %d attempts: %w", rnt.retryConfig.MaxAttempts, lastError)
}

// calculateDelay calculates the delay for the next retry attempt (same logic as retry.go)
func (rnt *RetryableNotificationTrigger) calculateDelay(attempt int) time.Duration {
	// Calculate exponential backoff
	delay := float64(rnt.retryConfig.InitialDelay) * math.Pow(rnt.retryConfig.BackoffFactor, float64(attempt-1))

	// Apply maximum delay cap
	if delay > float64(rnt.retryConfig.MaxDelay) {
		delay = float64(rnt.retryConfig.MaxDelay)
	}

	duration := time.Duration(delay)

	// Add jitter if enabled
	if rnt.retryConfig.EnableJitter {
		// Add up to 25% jitter
		jitterRange := float64(duration) * 0.25
		jitter := time.Duration(float64(time.Now().UnixNano() % int64(jitterRange)))
		duration += jitter
	}

	return duration
}
