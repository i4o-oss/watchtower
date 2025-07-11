package notification

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Service manages notification providers and handles notification sending
type Service struct {
	providers map[ProviderType]NotificationProvider
	mu        sync.RWMutex
	logger    *slog.Logger
}

// NewService creates a new notification service
func NewService(logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}

	return &Service{
		providers: make(map[ProviderType]NotificationProvider),
		logger:    logger,
	}
}

// RegisterProvider registers a notification provider
func (s *Service) RegisterProvider(provider NotificationProvider) error {
	if provider == nil {
		return fmt.Errorf("provider cannot be nil")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	providerType := provider.GetType()
	s.providers[providerType] = provider

	s.logger.Info("Registered notification provider",
		"type", providerType,
		"enabled", provider.IsEnabled())

	return nil
}

// GetProvider returns a provider by type
func (s *Service) GetProvider(providerType ProviderType) (NotificationProvider, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	provider, exists := s.providers[providerType]
	return provider, exists
}

// GetEnabledProviders returns all enabled providers
func (s *Service) GetEnabledProviders() []NotificationProvider {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var enabled []NotificationProvider
	for _, provider := range s.providers {
		if provider.IsEnabled() {
			enabled = append(enabled, provider)
		}
	}

	return enabled
}

// SendNotification sends a notification using the specified provider
func (s *Service) SendNotification(ctx context.Context, providerType ProviderType, data NotificationData) DeliveryResult {
	provider, exists := s.GetProvider(providerType)
	if !exists {
		return DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("provider %s not found", providerType),
			Timestamp: time.Now(),
			Details:   "Provider not registered",
		}
	}

	if !provider.IsEnabled() {
		return DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("provider %s is disabled", providerType),
			Timestamp: time.Now(),
			Details:   "Provider disabled",
		}
	}

	s.logger.Info("Sending notification",
		"provider", providerType,
		"type", data.Type,
		"title", data.Title)

	result := provider.SendNotification(ctx, data)

	if result.Success {
		s.logger.Info("Notification sent successfully",
			"provider", providerType,
			"type", data.Type)
	} else {
		s.logger.Error("Failed to send notification",
			"provider", providerType,
			"type", data.Type,
			"error", result.Error)
	}

	return result
}

// SendNotificationToAll sends a notification to all enabled providers
func (s *Service) SendNotificationToAll(ctx context.Context, data NotificationData) map[ProviderType]DeliveryResult {
	results := make(map[ProviderType]DeliveryResult)
	providers := s.GetEnabledProviders()

	if len(providers) == 0 {
		s.logger.Warn("No enabled providers found for notification", "type", data.Type)
		return results
	}

	// Send to all providers concurrently
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, provider := range providers {
		wg.Add(1)
		go func(p NotificationProvider) {
			defer wg.Done()

			result := p.SendNotification(ctx, data)

			mu.Lock()
			results[p.GetType()] = result
			mu.Unlock()
		}(provider)
	}

	wg.Wait()
	return results
}

// TestAllProviders tests all registered providers
func (s *Service) TestAllProviders(ctx context.Context) map[ProviderType]error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make(map[ProviderType]error)

	for providerType, provider := range s.providers {
		if provider.IsEnabled() {
			err := provider.TestConnection(ctx)
			results[providerType] = err
		}
	}

	return results
}

// GetProviderTypes returns all registered provider types
func (s *Service) GetProviderTypes() []ProviderType {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var types []ProviderType
	for providerType := range s.providers {
		types = append(types, providerType)
	}

	return types
}

// GetProviders returns all registered providers
func (s *Service) GetProviders() []NotificationProvider {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var providers []NotificationProvider
	for _, provider := range s.providers {
		providers = append(providers, provider)
	}

	return providers
}

// ConfigureProvider configures a provider with the given configuration
func (s *Service) ConfigureProvider(providerType ProviderType, config ProviderConfig) error {
	provider, exists := s.GetProvider(providerType)
	if !exists {
		return fmt.Errorf("provider %s not found", providerType)
	}

	return provider.Configure(config)
}

// SendNotificationToAllEnabled sends a notification to all enabled providers
func (s *Service) SendNotificationToAllEnabled(ctx context.Context, data NotificationData) map[ProviderType]DeliveryResult {
	return s.SendNotificationToAll(ctx, data)
}
