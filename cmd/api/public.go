package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// PublicStatusResponse represents the public status API response
type PublicStatusResponse struct {
	Services    []ServiceStatus `json:"services"`
	Overall     OverallStatus   `json:"overall"`
	LastUpdated time.Time       `json:"last_updated"`
}

// ServiceStatus represents the status of a single service
type ServiceStatus struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Status       string    `json:"status"` // "operational", "degraded", "outage"
	UptimeToday  float64   `json:"uptime_today"`
	Uptime30Day  float64   `json:"uptime_30_day"`
	Uptime90Day  float64   `json:"uptime_90_day"`
	LastCheck    time.Time `json:"last_check"`
	ResponseTime *int      `json:"response_time_ms,omitempty"`
}

// OverallStatus represents the overall system status
type OverallStatus struct {
	Status      string  `json:"status"` // "operational", "degraded", "outage"
	UptimeToday float64 `json:"uptime_today"`
	Uptime30Day float64 `json:"uptime_30_day"`
	Uptime90Day float64 `json:"uptime_90_day"`
}

// UptimeDataPoint represents a single uptime data point
type UptimeDataPoint struct {
	Date   string  `json:"date"`
	Uptime float64 `json:"uptime"`
	Status string  `json:"status"`
}

// UptimeResponse represents the uptime history API response
type UptimeResponse struct {
	EndpointID   string            `json:"endpoint_id"`
	EndpointName string            `json:"endpoint_name"`
	Data         []UptimeDataPoint `json:"data"`
	Period       string            `json:"period"`
}

// IncidentSummary represents a public incident summary
type IncidentSummary struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	Severity    string     `json:"severity"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Services    []string   `json:"affected_services"`
}

// IncidentsResponse represents the incidents API response
type IncidentsResponse struct {
	Incidents   []IncidentSummary `json:"incidents"`
	LastUpdated time.Time         `json:"last_updated"`
}

// getPublicStatus returns the current status of all services
func (app *Application) getPublicStatus(w http.ResponseWriter, r *http.Request) {
	// Get all enabled endpoints
	endpoints, err := app.db.GetEnabledEndpoints()
	if err != nil {
		app.logger.Error("failed to get endpoints", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Get latest monitoring status for all endpoints efficiently
	latestStatus, err := app.db.GetLatestMonitoringStatus()
	if err != nil {
		app.logger.Error("failed to get latest monitoring status", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	services := make([]ServiceStatus, 0, len(endpoints))
	var totalUptimeToday, totalUptime30Day, totalUptime90Day float64
	var overallStatus = "operational"

	for _, endpoint := range endpoints {
		service := ServiceStatus{
			ID:   endpoint.ID.String(),
			Name: endpoint.Name,
		}

		// Set status based on latest monitoring result
		if latestLog, exists := latestStatus[endpoint.ID]; exists {
			service.LastCheck = latestLog.Timestamp
			if latestLog.ResponseTimeMs != nil {
				service.ResponseTime = latestLog.ResponseTimeMs
			}

			if latestLog.Success {
				service.Status = "operational"
			} else {
				service.Status = "outage"
				overallStatus = "outage"
			}
		} else {
			service.Status = "unknown"
			if overallStatus == "operational" {
				overallStatus = "degraded"
			}
		}

		// Calculate uptime percentages using efficient method
		service.UptimeToday, _ = app.db.GetUptimeStats(endpoint.ID, 1)  // 1 day
		service.Uptime30Day, _ = app.db.GetUptimeStats(endpoint.ID, 30) // 30 days
		service.Uptime90Day, _ = app.db.GetUptimeStats(endpoint.ID, 90) // 90 days

		// Update overall uptime averages
		totalUptimeToday += service.UptimeToday
		totalUptime30Day += service.Uptime30Day
		totalUptime90Day += service.Uptime90Day

		services = append(services, service)
	}

	// Calculate overall uptime averages
	serviceCount := float64(len(services))
	overall := OverallStatus{
		Status: overallStatus,
	}

	if serviceCount > 0 {
		overall.UptimeToday = totalUptimeToday / serviceCount
		overall.Uptime30Day = totalUptime30Day / serviceCount
		overall.Uptime90Day = totalUptime90Day / serviceCount
	}

	response := PublicStatusResponse{
		Services:    services,
		Overall:     overall,
		LastUpdated: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=60") // Cache for 1 minute
	json.NewEncoder(w).Encode(response)
}

// getUptimeData returns uptime history for a specific endpoint
func (app *Application) getUptimeData(w http.ResponseWriter, r *http.Request) {
	endpointIDStr := chi.URLParam(r, "endpoint_id")
	if endpointIDStr == "" {
		http.Error(w, "Endpoint ID is required", http.StatusBadRequest)
		return
	}

	endpointID, err := uuid.Parse(endpointIDStr)
	if err != nil {
		http.Error(w, "Invalid endpoint ID", http.StatusBadRequest)
		return
	}

	// Get the endpoint
	endpoint, err := app.db.GetEndpoint(endpointID)
	if err != nil {
		app.logger.Error("failed to get endpoint", "endpoint_id", endpointID, "error", err)
		http.Error(w, "Endpoint not found", http.StatusNotFound)
		return
	}

	// Parse days parameter (default to 90)
	daysStr := r.URL.Query().Get("days")
	days := 90
	if daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 && parsedDays <= 365 {
			days = parsedDays
		}
	}

	// Generate daily uptime data
	data := make([]UptimeDataPoint, 0, days)
	now := time.Now()

	for i := days - 1; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")

		// Calculate uptime for this specific day
		uptime := app.calculateUptimeForDate(endpointID, date)

		// Determine status based on uptime
		status := "operational"
		if uptime < 99.0 {
			status = "degraded"
		}
		if uptime < 95.0 {
			status = "outage"
		}

		data = append(data, UptimeDataPoint{
			Date:   dateStr,
			Uptime: uptime,
			Status: status,
		})
	}

	response := UptimeResponse{
		EndpointID:   endpointID.String(),
		EndpointName: endpoint.Name,
		Data:         data,
		Period:       fmt.Sprintf("%d days", days),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=300") // Cache for 5 minutes
	json.NewEncoder(w).Encode(response)
}

// getPublicIncidents returns published incidents
func (app *Application) getPublicIncidents(w http.ResponseWriter, r *http.Request) {
	// Get open incidents (non-resolved incidents that should be visible on status page)
	incidents, err := app.db.GetOpenIncidents()
	if err != nil {
		app.logger.Error("failed to get incidents", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	summaries := make([]IncidentSummary, 0, len(incidents))
	for _, incident := range incidents {
		// Get affected services for this incident
		affectedServices := make([]string, 0)
		if len(incident.EndpointIncidents) > 0 {
			for _, ei := range incident.EndpointIncidents {
				if ei.Endpoint != nil {
					affectedServices = append(affectedServices, ei.Endpoint.Name)
				}
			}
		}

		summary := IncidentSummary{
			ID:          incident.ID.String(),
			Title:       incident.Title,
			Description: incident.Description,
			Status:      incident.Status,
			Severity:    incident.Severity,
			StartTime:   incident.StartTime,
			EndTime:     incident.EndTime,
			Services:    affectedServices,
		}

		summaries = append(summaries, summary)
	}

	response := IncidentsResponse{
		Incidents:   summaries,
		LastUpdated: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=120") // Cache for 2 minutes
	json.NewEncoder(w).Encode(response)
}

// calculateUptime calculates uptime percentage for an endpoint over the specified number of days
func (app *Application) calculateUptime(endpointID uuid.UUID, days int) float64 {
	// Get monitoring logs for the specified period
	cutoff := time.Now().AddDate(0, 0, -days)

	// This is a simplified implementation - in production you'd want more efficient querying
	logs, err := app.db.GetMonitoringLogs(endpointID, 10000) // Get many logs
	if err != nil {
		app.logger.Error("failed to get monitoring logs for uptime calculation", "error", err)
		return 0.0
	}

	var totalChecks, successfulChecks int
	for _, log := range logs {
		if log.Timestamp.After(cutoff) {
			totalChecks++
			if log.Success {
				successfulChecks++
			}
		}
	}

	if totalChecks == 0 {
		return 100.0 // No data means we assume it's operational
	}

	return (float64(successfulChecks) / float64(totalChecks)) * 100.0
}

// calculateUptimeForDate calculates uptime for a specific date
func (app *Application) calculateUptimeForDate(endpointID uuid.UUID, date time.Time) float64 {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Use the new efficient date range query
	logs, err := app.db.GetMonitoringLogsByDateRange(endpointID, startOfDay, endOfDay)
	if err != nil {
		return 100.0 // Default to operational if we can't get data
	}

	if len(logs) == 0 {
		return 100.0
	}

	var successfulChecks int
	for _, log := range logs {
		if log.Success {
			successfulChecks++
		}
	}

	return (float64(successfulChecks) / float64(len(logs))) * 100.0
}
