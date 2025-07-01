package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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

	endpoints, err := app.db.GetEndpoints()
	if err != nil {
		app.logger.Error("Error getting endpoints", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Simple pagination (in production, use database-level pagination)
	total := len(endpoints)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		endpoints = []data.Endpoint{}
	} else {
		if end > total {
			end = total
		}
		endpoints = endpoints[start:end]
	}

	response := ListEndpointsResponse{
		Endpoints: endpoints,
		Total:     total,
		Page:      page,
		Limit:     limit,
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
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	app.writeJSON(w, http.StatusCreated, EndpointResponse{Endpoint: endpoint})
}

// getEndpoint handles GET /api/v1/admin/endpoints/{id}
func (app *Application) getEndpoint(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid endpoint ID")
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
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid endpoint ID")
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
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	app.writeJSON(w, http.StatusOK, EndpointResponse{Endpoint: endpoint})
}

// deleteEndpoint handles DELETE /api/v1/admin/endpoints/{id}
func (app *Application) deleteEndpoint(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid endpoint ID")
		return
	}

	if err := app.db.DeleteEndpoint(id); err != nil {
		app.logger.Error("Error deleting endpoint", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

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
	hours := 24
	if hoursStr := r.URL.Query().Get("hours"); hoursStr != "" {
		if h, err := strconv.Atoi(hoursStr); err == nil && h > 0 && h <= 720 { // Max 30 days
			hours = h
		}
	}

	logs, err := app.db.GetRecentMonitoringLogs(hours)
	if err != nil {
		app.logger.Error("Error getting monitoring logs", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Simple pagination
	total := len(logs)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		logs = []data.MonitoringLog{}
	} else {
		if end > total {
			end = total
		}
		logs = logs[start:end]
	}

	response := MonitoringLogsResponse{
		Logs:  logs,
		Total: total,
		Page:  page,
		Limit: limit,
	}

	app.writeJSON(w, http.StatusOK, response)
}

// getEndpointLogs handles GET /api/v1/admin/endpoints/{id}/logs
func (app *Application) getEndpointLogs(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	endpointID, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid endpoint ID")
		return
	}

	// Parse pagination parameters
	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}

	logs, err := app.db.GetMonitoringLogs(endpointID, limit)
	if err != nil {
		app.logger.Error("Error getting endpoint logs", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
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

	var incidents []data.Incident
	var err error

	// Check if we should only show open incidents
	if r.URL.Query().Get("status") == "open" {
		incidents, err = app.db.GetOpenIncidents()
	} else {
		incidents, err = app.db.GetIncidents()
	}

	if err != nil {
		app.logger.Error("Error getting incidents", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Simple pagination
	total := len(incidents)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		incidents = []data.Incident{}
	} else {
		if end > total {
			end = total
		}
		incidents = incidents[start:end]
	}

	response := ListIncidentsResponse{
		Incidents: incidents,
		Total:     total,
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
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
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
		}
	}

	app.writeJSON(w, http.StatusCreated, IncidentResponse{Incident: incident})
}

// getIncident handles GET /api/v1/admin/incidents/{id}
func (app *Application) getIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid incident ID")
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
		app.errorResponse(w, http.StatusBadRequest, "Invalid incident ID")
		return
	}

	// Get existing incident
	incident, err := app.db.GetIncident(id)
	if err != nil {
		app.logger.Error("Error getting incident", "err", err.Error())
		app.errorResponse(w, http.StatusNotFound, "Incident not found")
		return
	}

	var req IncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Update fields
	if req.Title != "" {
		incident.Title = req.Title
	}
	incident.Description = req.Description
	if req.Severity != "" {
		incident.Severity = req.Severity
	}
	if req.Status != "" {
		incident.Status = req.Status
		// If status is resolved, set end time
		if req.Status == "resolved" && incident.EndTime == nil {
			now := time.Now()
			incident.EndTime = &now
		}
	}

	if err := app.db.UpdateIncident(incident); err != nil {
		app.logger.Error("Error updating incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	app.writeJSON(w, http.StatusOK, IncidentResponse{Incident: incident})
}

// deleteIncident handles DELETE /api/v1/admin/incidents/{id}
func (app *Application) deleteIncident(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid incident ID")
		return
	}

	if err := app.db.DeleteIncident(id); err != nil {
		app.logger.Error("Error deleting incident", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
