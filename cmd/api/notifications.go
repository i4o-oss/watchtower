package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/i4o-oss/watchtower/internal/notification"
)

// NotificationChannelResponse represents the API response for notification channels
type NotificationChannelResponse struct {
	ID       int                    `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Enabled  bool                   `json:"enabled"`
	Settings map[string]interface{} `json:"settings"`
}

// NotificationChannelRequest represents the API request for creating/updating notification channels
type NotificationChannelRequest struct {
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Enabled  bool                   `json:"enabled"`
	Settings map[string]interface{} `json:"settings"`
}

// listNotificationChannels handles GET /api/v1/admin/notifications/channels
func (app *Application) listNotificationChannels(w http.ResponseWriter, r *http.Request) {
	// For now, return the configured providers from the notification service
	providers := app.notificationService.GetProviders()

	channels := make([]NotificationChannelResponse, 0, len(providers))
	for i, provider := range providers {
		channels = append(channels, NotificationChannelResponse{
			ID:      i + 1,
			Type:    string(provider.GetType()),
			Name:    string(provider.GetType()),
			Enabled: provider.IsEnabled(),
			Settings: map[string]interface{}{
				"configured": provider.IsEnabled(),
			},
		})
	}

	response := map[string]interface{}{
		"channels": channels,
		"total":    len(channels),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// createNotificationChannel handles POST /api/v1/admin/notifications/channels
func (app *Application) createNotificationChannel(w http.ResponseWriter, r *http.Request) {
	var req NotificationChannelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate provider type
	providerType := notification.ProviderType(req.Type)
	switch providerType {
	case notification.ProviderTypeEmail, notification.ProviderTypeSlack,
		notification.ProviderTypeDiscord, notification.ProviderTypeWebhook:
		// Valid types
	default:
		app.errorResponse(w, http.StatusBadRequest, fmt.Sprintf("invalid provider type: %s", req.Type))
		return
	}

	// Configure the provider
	config := notification.ProviderConfig{
		Type:     providerType,
		Enabled:  req.Enabled,
		Settings: req.Settings,
	}

	err := app.notificationService.ConfigureProvider(providerType, config)
	if err != nil {
		app.errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return success response
	response := NotificationChannelResponse{
		ID:       1, // Simplified for now
		Type:     req.Type,
		Name:     req.Name,
		Enabled:  req.Enabled,
		Settings: req.Settings,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// updateNotificationChannel handles PUT /api/v1/admin/notifications/channels/{id}
func (app *Application) updateNotificationChannel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "invalid channel ID")
		return
	}

	var req NotificationChannelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate provider type
	providerType := notification.ProviderType(req.Type)
	switch providerType {
	case notification.ProviderTypeEmail, notification.ProviderTypeSlack,
		notification.ProviderTypeDiscord, notification.ProviderTypeWebhook:
		// Valid types
	default:
		app.errorResponse(w, http.StatusBadRequest, fmt.Sprintf("invalid provider type: %s", req.Type))
		return
	}

	// Configure the provider
	config := notification.ProviderConfig{
		Type:     providerType,
		Enabled:  req.Enabled,
		Settings: req.Settings,
	}

	err = app.notificationService.ConfigureProvider(providerType, config)
	if err != nil {
		app.errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return success response
	response := NotificationChannelResponse{
		ID:       id,
		Type:     req.Type,
		Name:     req.Name,
		Enabled:  req.Enabled,
		Settings: req.Settings,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// deleteNotificationChannel handles DELETE /api/v1/admin/notifications/channels/{id}
func (app *Application) deleteNotificationChannel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	_, err := strconv.Atoi(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "invalid channel ID")
		return
	}

	// For now, just disable the provider
	// In a full implementation, we'd remove the configuration from storage
	w.WriteHeader(http.StatusNoContent)
}

// TestNotificationRequest represents the request for testing notification delivery
type TestNotificationRequest struct {
	ProviderType string `json:"provider_type"`
}

// testNotificationChannel handles POST /api/v1/admin/notifications/test
func (app *Application) testNotificationChannel(w http.ResponseWriter, r *http.Request) {
	var req TestNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate provider type
	providerType := notification.ProviderType(req.ProviderType)
	switch providerType {
	case notification.ProviderTypeEmail, notification.ProviderTypeSlack,
		notification.ProviderTypeDiscord, notification.ProviderTypeWebhook:
		// Valid types
	default:
		app.errorResponse(w, http.StatusBadRequest, fmt.Sprintf("invalid provider type: %s", req.ProviderType))
		return
	}

	// Create test notification data
	testData := notification.NotificationData{
		Type:      notification.NotificationTypeEndpointDown,
		Title:     "Test Notification",
		Message:   "This is a test notification from Watchtower to verify your notification channel is working correctly.",
		Timestamp: time.Now(),
	}

	// Send test notification to the specific provider
	result := app.notificationService.SendNotification(r.Context(), providerType, testData)

	if result.Success {
		// Return success response
		response := map[string]interface{}{
			"success": true,
			"message": "Test notification sent successfully",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	} else {
		// Return error response
		errorMsg := "Unknown error"
		if result.Error != nil {
			errorMsg = result.Error.Error()
		}
		app.errorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Test notification failed: %s", errorMsg))
	}
}
