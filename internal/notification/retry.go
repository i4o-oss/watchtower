package notification

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"
)

// RetryConfig contains configuration for retry logic
type RetryConfig struct {
	MaxAttempts   int
	InitialDelay  time.Duration
	MaxDelay      time.Duration
	BackoffFactor float64
	EnableJitter  bool
}

// DefaultRetryConfig returns a sensible default retry configuration
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:   3,
		InitialDelay:  1 * time.Second,
		MaxDelay:      30 * time.Second,
		BackoffFactor: 2.0,
		EnableJitter:  true,
	}
}

// RetryableNotificationSender wraps a NotificationProvider with retry logic
type RetryableNotificationSender struct {
	provider NotificationProvider
	config   RetryConfig
	logger   *slog.Logger
}

// NewRetryableNotificationSender creates a new retryable notification sender
func NewRetryableNotificationSender(provider NotificationProvider, config RetryConfig, logger *slog.Logger) *RetryableNotificationSender {
	if logger == nil {
		logger = slog.Default()
	}

	return &RetryableNotificationSender{
		provider: provider,
		config:   config,
		logger:   logger,
	}
}

// SendNotificationWithRetry sends a notification with retry logic
func (r *RetryableNotificationSender) SendNotificationWithRetry(ctx context.Context, data NotificationData) DeliveryResult {
	var lastResult DeliveryResult

	for attempt := 1; attempt <= r.config.MaxAttempts; attempt++ {
		// Check if context is cancelled
		select {
		case <-ctx.Done():
			return DeliveryResult{
				Success:   false,
				Error:     ctx.Err(),
				Timestamp: time.Now(),
				Details:   "Context cancelled during retry",
			}
		default:
		}

		r.logger.Debug("Attempting notification",
			"provider", r.provider.GetType(),
			"attempt", attempt,
			"max_attempts", r.config.MaxAttempts)

		result := r.provider.SendNotification(ctx, data)
		lastResult = result

		if result.Success {
			if attempt > 1 {
				r.logger.Info("Notification succeeded after retry",
					"provider", r.provider.GetType(),
					"attempt", attempt)
			}
			return result
		}

		// Don't retry on the last attempt
		if attempt == r.config.MaxAttempts {
			r.logger.Error("Notification failed after all retries",
				"provider", r.provider.GetType(),
				"attempts", attempt,
				"error", result.Error)
			break
		}

		// Calculate delay for next attempt
		delay := r.calculateDelay(attempt)

		r.logger.Warn("Notification failed, retrying",
			"provider", r.provider.GetType(),
			"attempt", attempt,
			"error", result.Error,
			"retry_delay", delay)

		// Wait before retrying
		select {
		case <-ctx.Done():
			return DeliveryResult{
				Success:   false,
				Error:     ctx.Err(),
				Timestamp: time.Now(),
				Details:   "Context cancelled during retry delay",
			}
		case <-time.After(delay):
			// Continue to next attempt
		}
	}

	// All attempts failed
	return DeliveryResult{
		Success:   false,
		Error:     fmt.Errorf("notification failed after %d attempts: %w", r.config.MaxAttempts, lastResult.Error),
		Timestamp: time.Now(),
		Details:   fmt.Sprintf("Final attempt error: %s", lastResult.Details),
	}
}

// calculateDelay calculates the delay for the next retry attempt
func (r *RetryableNotificationSender) calculateDelay(attempt int) time.Duration {
	// Calculate exponential backoff
	delay := float64(r.config.InitialDelay) * math.Pow(r.config.BackoffFactor, float64(attempt-1))

	// Apply maximum delay cap
	if delay > float64(r.config.MaxDelay) {
		delay = float64(r.config.MaxDelay)
	}

	duration := time.Duration(delay)

	// Add jitter if enabled
	if r.config.EnableJitter {
		// Add up to 25% jitter
		jitterRange := float64(duration) * 0.25
		jitter := time.Duration(float64(time.Now().UnixNano() % int64(jitterRange)))
		duration += jitter
	}

	return duration
}

// isRetryableError determines if an error is retryable
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Add specific error type checking here
	// For now, we retry all errors
	return true
}
