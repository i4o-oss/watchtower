package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/constants"
	"github.com/i4o-oss/watchtower/internal/data"
)

// EndpointRequest represents the request body for endpoint operations
type EndpointRequest struct {
	Name                 string            `json:"name"`
	Description          string            `json:"description"`
	URL                  string            `json:"url"`
	Method               string            `json:"method"`
	Headers              map[string]string `json:"headers"`
	Body                 string            `json:"body"`
	ExpectedStatusCode   int               `json:"expected_status_code"`
	TimeoutSeconds       int               `json:"timeout_seconds"`
	CheckIntervalSeconds int               `json:"check_interval_seconds"`
	Enabled              bool              `json:"enabled"`
}

// EndpointResponse represents the response for endpoint operations
type EndpointResponse struct {
	*data.Endpoint
}

// ListEndpointsResponse represents the response for listing endpoints
type ListEndpointsResponse struct {
	Endpoints []data.Endpoint `json:"endpoints"`
	Total     int             `json:"total"`
	Page      int             `json:"page"`
	Limit     int             `json:"limit"`
}

// CRUD Operations for Endpoints

// listEndpoints handles GET /api/v1/admin/endpoints
func (app *Application) listEndpoints(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	pagination := parsePaginationParams(r)

	// Parse enabled filter
	var enabled *bool
	if enabledStr := r.URL.Query().Get("enabled"); enabledStr != "" {
		if e, err := strconv.ParseBool(enabledStr); err == nil {
			enabled = &e
		}
	}

	// Use database-level pagination
	endpoints, total, err := app.db.GetEndpointsWithPagination(pagination.Page, pagination.Limit, enabled)
	if err != nil {
		app.logErrorAndRespond(w, http.StatusInternalServerError, constants.ErrInternalServer, "Error getting endpoints", err)
		return
	}

	response := ListEndpointsResponse{
		Endpoints: endpoints,
		Total:     int(total),
		Page:      pagination.Page,
		Limit:     pagination.Limit,
	}

	app.writeJSON(w, http.StatusOK, response)
}

// createEndpoint handles POST /api/v1/admin/endpoints
func (app *Application) createEndpoint(w http.ResponseWriter, r *http.Request) {
	var req EndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Validate request
	if errors := validateEndpointRequest(&req); len(errors) > 0 {
		app.respondWithValidationErrors(w, errors)
		return
	}

	if req.Method == "" {
		req.Method = "GET"
	}

	if req.ExpectedStatusCode == 0 {
		req.ExpectedStatusCode = 200
	}

	if req.TimeoutSeconds == 0 {
		req.TimeoutSeconds = 30
	}

	if req.CheckIntervalSeconds == 0 {
		req.CheckIntervalSeconds = 300
	}

	// Create endpoint
	endpoint := &data.Endpoint{
		Name:                 req.Name,
		Description:          req.Description,
		URL:                  req.URL,
		Method:               req.Method,
		Headers:              data.HTTPHeaders(req.Headers),
		Body:                 req.Body,
		ExpectedStatusCode:   req.ExpectedStatusCode,
		TimeoutSeconds:       req.TimeoutSeconds,
		CheckIntervalSeconds: req.CheckIntervalSeconds,
		Enabled:              req.Enabled,
	}

	if err := app.db.CreateEndpoint(endpoint); err != nil {
		app.logger.Error("Error creating endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Broadcast endpoint creation event via SSE
	app.sseHub.BroadcastEndpointUpdate("endpoint_created", endpoint)

	// Add endpoint to monitoring engine
	if app.monitoringEngine != nil && app.monitoringEngine.IsRunning() {
		if err := app.monitoringEngine.AddEndpoint(endpoint); err != nil {
			app.logger.Error("Error adding endpoint to monitoring engine", "err", err.Error())
			// Don't fail the request, just log the error
		} else {
			app.logger.Info("Added endpoint to monitoring engine", "endpoint_id", endpoint.ID.String(), "name", endpoint.Name)
		}
	}

	app.writeJSON(w, http.StatusCreated, EndpointResponse{Endpoint: endpoint})
}

// getEndpoint handles GET /api/v1/admin/endpoints/{id}
func (app *Application) getEndpoint(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDParam(r, "id")
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	endpoint, err := app.db.GetEndpoint(id)
	if err != nil {
		app.logger.Error("Error getting endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Endpoint not found")
		return
	}

	app.writeJSON(w, http.StatusOK, EndpointResponse{Endpoint: endpoint})
}

// updateEndpoint handles PUT /api/v1/admin/endpoints/{id}
func (app *Application) updateEndpoint(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDParam(r, "id")
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	// Get existing endpoint
	endpoint, err := app.db.GetEndpoint(id)
	if err != nil {
		app.logger.Error("Error getting endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Endpoint not found")
		return
	}

	var req EndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Update fields
	if req.Name != "" {
		endpoint.Name = req.Name
	}
	endpoint.Description = req.Description
	if req.URL != "" {
		endpoint.URL = req.URL
	}
	if req.Method != "" {
		endpoint.Method = req.Method
	}
	if req.Headers != nil {
		endpoint.Headers = data.HTTPHeaders(req.Headers)
	}
	endpoint.Body = req.Body
	if req.ExpectedStatusCode > 0 {
		endpoint.ExpectedStatusCode = req.ExpectedStatusCode
	}
	if req.TimeoutSeconds > 0 {
		endpoint.TimeoutSeconds = req.TimeoutSeconds
	}
	if req.CheckIntervalSeconds > 0 {
		endpoint.CheckIntervalSeconds = req.CheckIntervalSeconds
	}
	endpoint.Enabled = req.Enabled

	if err := app.db.UpdateEndpoint(endpoint); err != nil {
		app.logger.Error("Error updating endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Broadcast endpoint update event via SSE
	app.sseHub.BroadcastEndpointUpdate("endpoint_updated", endpoint)

	// Update endpoint in monitoring engine
	if app.monitoringEngine != nil && app.monitoringEngine.IsRunning() {
		if err := app.monitoringEngine.UpdateEndpoint(endpoint); err != nil {
			app.logger.Error("Error updating endpoint in monitoring engine", "err", err.Error())
			// Don't fail the request, just log the error
		} else {
			app.logger.Info("Updated endpoint in monitoring engine", "endpoint_id", endpoint.ID.String(), "name", endpoint.Name)
		}
	}

	app.writeJSON(w, http.StatusOK, EndpointResponse{Endpoint: endpoint})
}

// deleteEndpoint handles DELETE /api/v1/admin/endpoints/{id}
func (app *Application) deleteEndpoint(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	// Get endpoint for SSE broadcast before deleting
	endpoint, err := app.db.GetEndpoint(id)
	if err != nil {
		app.logger.Error("Error getting endpoint for deletion", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Endpoint not found")
		return
	}

	if err := app.db.DeleteEndpoint(id); err != nil {
		app.logger.Error("Error deleting endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Remove endpoint from monitoring engine
	if app.monitoringEngine != nil && app.monitoringEngine.IsRunning() {
		if err := app.monitoringEngine.RemoveEndpoint(endpoint.ID.String()); err != nil {
			app.logger.Error("Error removing endpoint from monitoring engine", "err", err.Error())
			// Don't fail the request, just log the error
		} else {
			app.logger.Info("Removed endpoint from monitoring engine", "endpoint_id", endpoint.ID.String(), "name", endpoint.Name)
		}
	}

	// Broadcast endpoint deletion event via SSE
	app.sseHub.BroadcastEndpointUpdate("endpoint_deleted", endpoint)

	w.WriteHeader(http.StatusNoContent)
}

// Monitoring Logs API

// MonitoringLogsResponse represents the response for monitoring logs
type MonitoringLogsResponse struct {
	Logs  []data.MonitoringLog `json:"logs"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
}

// listMonitoringLogs handles GET /api/v1/admin/monitoring-logs
func (app *Application) listMonitoringLogs(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	page := 1
	limit := 50

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Parse hours parameter (default to 24 hours)
	hours := parseTimeHoursParam(r)

	// Parse endpoint filter
	var endpointID *uuid.UUID
	if endpointIDStr := r.URL.Query().Get("endpoint_id"); endpointIDStr != "" {
		if id, err := uuid.Parse(endpointIDStr); err == nil {
			endpointID = &id
		}
	}

	// Parse success filter
	var success *bool
	if successStr := r.URL.Query().Get("success"); successStr != "" {
		if s, err := strconv.ParseBool(successStr); err == nil {
			success = &s
		}
	}

	// Use database-level pagination
	logs, total, err := app.db.GetMonitoringLogsWithPagination(page, limit, hours, endpointID, success)
	if err != nil {
		app.logger.Error("Error getting monitoring logs", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	response := MonitoringLogsResponse{
		Logs:  logs,
		Total: int(total),
		Page:  page,
		Limit: limit,
	}

	app.writeJSON(w, http.StatusOK, response)
}

// getEndpointLogs handles GET /api/v1/admin/endpoints/{id}/logs
func (app *Application) getEndpointLogs(w http.ResponseWriter, r *http.Request) {
	endpointID, err := parseUUIDParam(r, "id")
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	// Parse pagination parameters
	limit := parseLimitParam(r, constants.DefaultLimit, constants.MaxLogsLimit)

	logs, err := app.db.GetMonitoringLogs(endpointID, limit)
	if err != nil {
		app.logger.Error("Error getting endpoint logs", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	response := MonitoringLogsResponse{
		Logs:  logs,
		Total: len(logs),
		Page:  1,
		Limit: limit,
	}

	app.writeJSON(w, http.StatusOK, response)
}

// Incident Management API

// IncidentRequest represents the request body for incident operations
type IncidentRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Severity    string   `json:"severity"`
	Status      string   `json:"status"`
	EndpointIDs []string `json:"endpoint_ids,omitempty"`
}

// IncidentResponse represents the response for incident operations
type IncidentResponse struct {
	*data.Incident
}

// ListIncidentsResponse represents the response for listing incidents
type ListIncidentsResponse struct {
	Incidents []data.Incident `json:"incidents"`
	Total     int             `json:"total"`
	Page      int             `json:"page"`
	Limit     int             `json:"limit"`
}

// listIncidents handles GET /api/v1/admin/incidents
func (app *Application) listIncidents(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	page := 1
	limit := 50

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Parse filters
	status := r.URL.Query().Get("status")
	severity := r.URL.Query().Get("severity")

	// Use database-level pagination
	incidents, total, err := app.db.GetIncidentsWithPagination(page, limit, status, severity)
	if err != nil {
		app.logger.Error("Error getting incidents", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	response := ListIncidentsResponse{
		Incidents: incidents,
		Total:     int(total),
		Page:      page,
		Limit:     limit,
	}

	app.writeJSON(w, http.StatusOK, response)
}

// createIncident handles POST /api/v1/admin/incidents
func (app *Application) createIncident(w http.ResponseWriter, r *http.Request) {
	var req IncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Validate request
	if errors := validateIncidentRequest(&req); len(errors) > 0 {
		app.respondWithValidationErrors(w, errors)
		return
	}

	if req.Severity == "" {
		req.Severity = "medium"
	}

	if req.Status == "" {
		req.Status = "open"
	}

	// Get current user for created_by
	user := app.getUserFromContext(r)
	var createdBy *uuid.UUID
	if user != nil {
		createdBy = &user.ID
	}

	// Create incident
	incident := &data.Incident{
		Title:       req.Title,
		Description: req.Description,
		Severity:    req.Severity,
		Status:      req.Status,
		CreatedBy:   createdBy,
	}

	if err := app.db.CreateIncident(incident); err != nil {
		app.logger.Error("Error creating incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Create timeline entry for incident creation
	timeline := &data.IncidentTimeline{
		IncidentID: incident.ID,
		UserID:     createdBy,
		EventType:  "created",
		Message:    stringPtr("Incident created"),
		Metadata: map[string]interface{}{
			"severity": incident.Severity,
			"status":   incident.Status,
		},
	}
	if err := app.db.CreateIncidentTimeline(timeline); err != nil {
		app.logger.Error("Error creating incident timeline", "err", err.Error())
		// Continue anyway, the incident was created
	}

	// Create endpoint incidents if endpoint IDs provided
	for _, endpointIDStr := range req.EndpointIDs {
		endpointID, err := uuid.Parse(endpointIDStr)
		if err != nil {
			continue // Skip invalid UUIDs
		}

		endpointIncident := &data.EndpointIncident{
			EndpointID: endpointID,
			IncidentID: incident.ID,
		}

		if err := app.db.CreateEndpointIncident(endpointIncident); err != nil {
			app.logger.Error("Error creating endpoint incident", "err", err.Error())
			// Continue with other endpoints
		} else {
			// Create timeline entry for endpoint association
			timeline := &data.IncidentTimeline{
				IncidentID: incident.ID,
				UserID:     createdBy,
				EventType:  "endpoint_associated",
				Message:    stringPtr("Endpoint associated with incident"),
				Metadata: map[string]interface{}{
					"endpoint_id": endpointIDStr,
				},
			}
			if timelineErr := app.db.CreateIncidentTimeline(timeline); timelineErr != nil {
				app.logger.Error("Error creating timeline for endpoint association", "err", timelineErr.Error())
			}
		}
	}

	// Broadcast incident creation event via SSE
	app.sseHub.BroadcastIncidentUpdate("incident_created", incident)

	app.writeJSON(w, http.StatusCreated, IncidentResponse{Incident: incident})
}

// getIncident handles GET /api/v1/admin/incidents/{id}
func (app *Application) getIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	incident, err := app.db.GetIncident(id)
	if err != nil {
		app.logger.Error("Error getting incident", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	app.writeJSON(w, http.StatusOK, IncidentResponse{Incident: incident})
}

// updateIncident handles PUT /api/v1/admin/incidents/{id}
func (app *Application) updateIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	// Get existing incident
	incident, err := app.db.GetIncident(id)
	if err != nil {
		app.logger.Error("Error getting incident", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	// Store original values for timeline tracking
	originalStatus := incident.Status
	originalSeverity := incident.Severity
	originalTitle := incident.Title
	originalDescription := incident.Description

	var req IncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Get current user for timeline tracking
	user := app.getUserFromContext(r)
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}

	// Update fields and track changes
	var timelineEntries []*data.IncidentTimeline

	if req.Title != "" && req.Title != incident.Title {
		timelineEntries = append(timelineEntries, &data.IncidentTimeline{
			IncidentID: incident.ID,
			UserID:     userID,
			EventType:  "update",
			OldValue:   &originalTitle,
			NewValue:   &req.Title,
			Message:    stringPtr("Title updated"),
		})
		incident.Title = req.Title
	}

	if req.Description != incident.Description {
		timelineEntries = append(timelineEntries, &data.IncidentTimeline{
			IncidentID: incident.ID,
			UserID:     userID,
			EventType:  "update",
			OldValue:   &originalDescription,
			NewValue:   &req.Description,
			Message:    stringPtr("Description updated"),
		})
		incident.Description = req.Description
	}

	if req.Severity != "" && req.Severity != incident.Severity {
		timelineEntries = append(timelineEntries, &data.IncidentTimeline{
			IncidentID: incident.ID,
			UserID:     userID,
			EventType:  "update",
			OldValue:   &originalSeverity,
			NewValue:   &req.Severity,
			Message:    stringPtr("Severity changed"),
		})
		incident.Severity = req.Severity
	}

	if req.Status != "" && req.Status != incident.Status {
		timelineEntries = append(timelineEntries, &data.IncidentTimeline{
			IncidentID: incident.ID,
			UserID:     userID,
			EventType:  "status_change",
			OldValue:   &originalStatus,
			NewValue:   &req.Status,
			Message:    stringPtr(fmt.Sprintf("Status changed from %s to %s", originalStatus, req.Status)),
		})
		incident.Status = req.Status

		// If status is resolved, set end time and create resolved timeline entry
		if req.Status == "resolved" && incident.EndTime == nil {
			now := time.Now()
			incident.EndTime = &now
			timelineEntries = append(timelineEntries, &data.IncidentTimeline{
				IncidentID: incident.ID,
				UserID:     userID,
				EventType:  "resolved",
				Message:    stringPtr("Incident resolved"),
				Metadata: map[string]interface{}{
					"resolved_at": now.Format(time.RFC3339),
				},
			})
		}
	}

	if err := app.db.UpdateIncident(incident); err != nil {
		app.logger.Error("Error updating incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Create timeline entries
	for _, entry := range timelineEntries {
		if err := app.db.CreateIncidentTimeline(entry); err != nil {
			app.logger.Error("Error creating incident timeline", "err", err.Error())
			// Continue anyway
		}
	}

	// Broadcast incident update event via SSE
	app.sseHub.BroadcastIncidentUpdate("incident_updated", incident)

	app.writeJSON(w, http.StatusOK, IncidentResponse{Incident: incident})
}

// deleteIncident handles DELETE /api/v1/admin/incidents/{id}
func (app *Application) deleteIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	// Get incident for SSE broadcast before deleting
	incident, err := app.db.GetIncident(id)
	if err != nil {
		app.logger.Error("Error getting incident for deletion", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	if err := app.db.DeleteIncident(id); err != nil {
		app.logger.Error("Error deleting incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Broadcast incident deletion event via SSE
	app.sseHub.BroadcastIncidentUpdate("incident_deleted", incident)

	w.WriteHeader(http.StatusNoContent)
}

// Incident-Endpoint Association API

// EndpointIncidentRequest represents the request body for endpoint incident operations
type EndpointIncidentRequest struct {
	EndpointIDs []string `json:"endpoint_ids"`
}

// associateEndpointsWithIncident handles POST /api/v1/admin/incidents/{id}/endpoints
func (app *Application) associateEndpointsWithIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	incidentID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	// Check if incident exists
	_, err = app.db.GetIncident(incidentID)
	if err != nil {
		app.logger.Error("Error getting incident", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	var req EndpointIncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Get current user
	user := app.getUserFromContext(r)
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}

	// Associate endpoints with incident
	for _, endpointIDStr := range req.EndpointIDs {
		endpointID, err := uuid.Parse(endpointIDStr)
		if err != nil {
			continue // Skip invalid UUIDs
		}

		// Check if endpoint exists
		endpoint, err := app.db.GetEndpoint(endpointID)
		if err != nil {
			continue // Skip non-existent endpoints
		}

		// Create endpoint incident association
		endpointIncident := &data.EndpointIncident{
			EndpointID: endpointID,
			IncidentID: incidentID,
		}

		if err := app.db.CreateEndpointIncident(endpointIncident); err != nil {
			app.logger.Error("Error creating endpoint incident", "err", err.Error())
			// Continue with other endpoints
		} else {
			// Create timeline entry for endpoint association
			timeline := &data.IncidentTimeline{
				IncidentID: incidentID,
				UserID:     userID,
				EventType:  "endpoint_associated",
				Message:    stringPtr(fmt.Sprintf("Endpoint '%s' associated with incident", endpoint.Name)),
				Metadata: map[string]interface{}{
					"endpoint_id":   endpointIDStr,
					"endpoint_name": endpoint.Name,
				},
			}
			if timelineErr := app.db.CreateIncidentTimeline(timeline); timelineErr != nil {
				app.logger.Error("Error creating timeline for endpoint association", "err", timelineErr.Error())
			}
		}
	}

	app.writeJSON(w, http.StatusCreated, map[string]string{"message": "Endpoints associated with incident"})
}

// removeEndpointFromIncident handles DELETE /api/v1/admin/incidents/{id}/endpoints/{endpoint_id}
func (app *Application) removeEndpointFromIncident(w http.ResponseWriter, r *http.Request) {
	incidentIDStr := chi.URLParam(r, "id")
	endpointIDStr := chi.URLParam(r, "endpoint_id")

	incidentID, err := uuid.Parse(incidentIDStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	endpointID, err := uuid.Parse(endpointIDStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	// Get endpoint name for timeline
	endpoint, _ := app.db.GetEndpoint(endpointID)
	endpointName := "Unknown"
	if endpoint != nil {
		endpointName = endpoint.Name
	}

	if err := app.db.DeleteEndpointIncident(endpointID, incidentID); err != nil {
		app.logger.Error("Error removing endpoint from incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	// Get current user
	user := app.getUserFromContext(r)
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}

	// Create timeline entry for endpoint removal
	timeline := &data.IncidentTimeline{
		IncidentID: incidentID,
		UserID:     userID,
		EventType:  "endpoint_removed",
		Message:    stringPtr(fmt.Sprintf("Endpoint '%s' removed from incident", endpointName)),
		Metadata: map[string]interface{}{
			"endpoint_id":   endpointID.String(),
			"endpoint_name": endpointName,
		},
	}
	if err := app.db.CreateIncidentTimeline(timeline); err != nil {
		app.logger.Error("Error creating timeline for endpoint removal", "err", err.Error())
		// Continue anyway
	}

	w.WriteHeader(http.StatusNoContent)
}

// getIncidentEndpoints handles GET /api/v1/admin/incidents/{id}/endpoints
func (app *Application) getIncidentEndpoints(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	incidentID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	endpointIncidents, err := app.db.GetEndpointIncidents(incidentID)
	if err != nil {
		app.logger.Error("Error getting incident endpoints", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	app.writeJSON(w, http.StatusOK, map[string]interface{}{
		"endpoint_incidents": endpointIncidents,
	})
}

// getEndpointIncidents handles GET /api/v1/admin/endpoints/{id}/incidents
func (app *Application) getEndpointIncidents(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	endpointID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidEndpointID)
		return
	}

	incidents, err := app.db.GetIncidentsByEndpoint(endpointID)
	if err != nil {
		app.logger.Error("Error getting endpoint incidents", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	app.writeJSON(w, http.StatusOK, map[string]interface{}{
		"incidents": incidents,
		"total":     len(incidents),
	})
}

// getIncidentTimeline handles GET /api/v1/admin/incidents/{id}/timeline
func (app *Application) getIncidentTimeline(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	incidentID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	timeline, err := app.db.GetIncidentTimeline(incidentID)
	if err != nil {
		app.logger.Error("Error getting incident timeline", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	app.writeJSON(w, http.StatusOK, map[string]interface{}{
		"timeline": timeline,
		"total":    len(timeline),
	})
}

// addIncidentComment handles POST /api/v1/admin/incidents/{id}/comments
func (app *Application) addIncidentComment(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	incidentID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, constants.ErrInvalidIncidentID)
		return
	}

	// Check if incident exists
	_, err = app.db.GetIncident(incidentID)
	if err != nil {
		app.logger.Error("Error getting incident", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if strings.TrimSpace(req.Message) == "" {
		app.errorResponse(w, http.StatusBadRequest, "Message is required")
		return
	}

	// Get current user
	user := app.getUserFromContext(r)
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}

	// Create timeline entry for comment
	timeline := &data.IncidentTimeline{
		IncidentID: incidentID,
		UserID:     userID,
		EventType:  "comment",
		Message:    &req.Message,
	}

	if err := app.db.CreateIncidentTimeline(timeline); err != nil {
		app.logger.Error("Error creating incident comment", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, constants.ErrInternalServer)
		return
	}

	app.writeJSON(w, http.StatusCreated, map[string]string{"message": "Comment added"})
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
