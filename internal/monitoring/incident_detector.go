package monitoring

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/data"
)

// IncidentDetector monitors endpoint health and automatically creates incidents
type IncidentDetector struct {
	db               *data.DB
	logger           *log.Logger
	config           IncidentDetectorConfig
	ctx              context.Context
	cancel           context.CancelFunc
	wg               sync.WaitGroup
	endpointFailures map[uuid.UUID]*FailureTracker
	activeIncidents  map[uuid.UUID]uuid.UUID // endpoint_id -> incident_id
	mu               sync.RWMutex
	isRunning        bool
}

// IncidentDetectorConfig holds configuration for incident detection
type IncidentDetectorConfig struct {
	// CheckInterval is how often to check for incidents
	CheckInterval time.Duration
	// ConsecutiveFailures is the number of consecutive failures before creating an incident
	ConsecutiveFailures int
	// FailureWindow is the time window to consider for failure counting
	FailureWindow time.Duration
	// RecoveryThreshold is the number of consecutive successes needed to resolve an incident
	RecoveryThreshold int
	// AutoResolve whether to automatically resolve incidents when endpoints recover
	AutoResolve bool
	// SeverityThresholds define response time thresholds for different severities
	SeverityThresholds SeverityThresholds
}

// SeverityThresholds defines response time thresholds for incident severity
type SeverityThresholds struct {
	CriticalResponseTimeMs int // Above this = critical
	HighResponseTimeMs     int // Above this = high
	MediumResponseTimeMs   int // Above this = medium
	// Below medium = low
}

// FailureTracker tracks failure patterns for an endpoint
type FailureTracker struct {
	EndpointID          uuid.UUID
	ConsecutiveFailures int
	ConsecutiveSuccess  int
	LastFailureTime     time.Time
	LastSuccessTime     time.Time
	FailureHistory      []time.Time
}

// DefaultIncidentDetectorConfig returns a default configuration
func DefaultIncidentDetectorConfig() IncidentDetectorConfig {
	return IncidentDetectorConfig{
		CheckInterval:       30 * time.Second,
		ConsecutiveFailures: 3,
		FailureWindow:       10 * time.Minute,
		RecoveryThreshold:   2,
		AutoResolve:         true,
		SeverityThresholds: SeverityThresholds{
			CriticalResponseTimeMs: 10000, // 10s
			HighResponseTimeMs:     5000,  // 5s
			MediumResponseTimeMs:   2000,  // 2s
		},
	}
}

// NewIncidentDetector creates a new incident detector
func NewIncidentDetector(config IncidentDetectorConfig, db *data.DB, logger *log.Logger) *IncidentDetector {
	ctx, cancel := context.WithCancel(context.Background())

	return &IncidentDetector{
		db:               db,
		logger:           logger,
		config:           config,
		ctx:              ctx,
		cancel:           cancel,
		endpointFailures: make(map[uuid.UUID]*FailureTracker),
		activeIncidents:  make(map[uuid.UUID]uuid.UUID),
	}
}

// Start begins the incident detection process
func (id *IncidentDetector) Start() error {
	id.mu.Lock()
	defer id.mu.Unlock()

	if id.isRunning {
		return fmt.Errorf("incident detector is already running")
	}

	id.logger.Info("starting incident detector")

	// Start the detection loop
	id.wg.Add(1)
	go id.detectionLoop()

	id.isRunning = true
	return nil
}

// Stop gracefully stops the incident detector
func (id *IncidentDetector) Stop() error {
	id.mu.Lock()
	defer id.mu.Unlock()

	if !id.isRunning {
		return nil
	}

	id.logger.Info("stopping incident detector")

	// Signal shutdown
	id.cancel()

	// Wait for goroutines to finish
	id.wg.Wait()

	id.isRunning = false
	return nil
}

// detectionLoop is the main detection loop
func (id *IncidentDetector) detectionLoop() {
	defer id.wg.Done()

	ticker := time.NewTicker(id.config.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			id.performDetection()
		case <-id.ctx.Done():
			id.logger.Debug("incident detector stopping")
			return
		}
	}
}

// performDetection checks for incidents and recoveries
func (id *IncidentDetector) performDetection() {
	// Get recent monitoring logs
	logs, err := id.db.GetRecentMonitoringLogs(int(id.config.FailureWindow.Hours()))
	if err != nil {
		id.logger.Error("failed to get recent monitoring logs", "error", err)
		return
	}

	// Group logs by endpoint
	endpointLogs := make(map[uuid.UUID][]data.MonitoringLog)
	for _, log := range logs {
		endpointLogs[log.EndpointID] = append(endpointLogs[log.EndpointID], log)
	}

	// Process each endpoint
	for endpointID, logs := range endpointLogs {
		id.processEndpointLogs(endpointID, logs)
	}
}

// processEndpointLogs processes logs for a specific endpoint
func (id *IncidentDetector) processEndpointLogs(endpointID uuid.UUID, logs []data.MonitoringLog) {
	id.mu.Lock()
	defer id.mu.Unlock()

	// Get or create failure tracker
	tracker, exists := id.endpointFailures[endpointID]
	if !exists {
		tracker = &FailureTracker{
			EndpointID: endpointID,
		}
		id.endpointFailures[endpointID] = tracker
	}

	// Sort logs by timestamp (most recent first)
	if len(logs) == 0 {
		return
	}

	// Process logs in reverse chronological order to find current state
	for i := len(logs) - 1; i >= 0; i-- {
		log := logs[i]

		if log.Success {
			if tracker.ConsecutiveFailures > 0 {
				// Reset failure count on success
				tracker.ConsecutiveFailures = 0
				tracker.LastSuccessTime = log.Timestamp
			}
			tracker.ConsecutiveSuccess++
		} else {
			if tracker.ConsecutiveSuccess > 0 {
				// Reset success count on failure
				tracker.ConsecutiveSuccess = 0
				tracker.LastFailureTime = log.Timestamp
			}
			tracker.ConsecutiveFailures++
			tracker.FailureHistory = append(tracker.FailureHistory, log.Timestamp)
		}
	}

	// Clean old failures from history
	cutoff := time.Now().Add(-id.config.FailureWindow)
	var recentFailures []time.Time
	for _, failureTime := range tracker.FailureHistory {
		if failureTime.After(cutoff) {
			recentFailures = append(recentFailures, failureTime)
		}
	}
	tracker.FailureHistory = recentFailures

	// Check if we should create an incident
	if tracker.ConsecutiveFailures >= id.config.ConsecutiveFailures {
		id.createIncidentIfNeeded(endpointID, tracker, logs)
	}

	// Check if we should resolve an incident
	if tracker.ConsecutiveSuccess >= id.config.RecoveryThreshold {
		id.resolveIncidentIfNeeded(endpointID, tracker)
	}
}

// createIncidentIfNeeded creates an incident if one doesn't already exist
func (id *IncidentDetector) createIncidentIfNeeded(endpointID uuid.UUID, tracker *FailureTracker, logs []data.MonitoringLog) {
	// Check if there's already an active incident for this endpoint
	if _, exists := id.activeIncidents[endpointID]; exists {
		return
	}

	// Get endpoint details
	endpoint, err := id.db.GetEndpoint(endpointID)
	if err != nil {
		id.logger.Error("failed to get endpoint for incident creation", "endpoint_id", endpointID, "error", err)
		return
	}

	// Determine severity based on response time and failure pattern
	severity := id.determineSeverity(logs)

	// Create incident
	incident := &data.Incident{
		Title: fmt.Sprintf("Endpoint %s is failing", endpoint.Name),
		Description: fmt.Sprintf("Endpoint %s (%s) has failed %d consecutive times. Last failure: %s",
			endpoint.Name, endpoint.URL, tracker.ConsecutiveFailures, tracker.LastFailureTime.Format(time.RFC3339)),
		Severity:  severity,
		Status:    "investigating",
		StartTime: tracker.LastFailureTime,
	}

	if err := id.db.CreateIncident(incident); err != nil {
		id.logger.Error("failed to create incident", "endpoint_id", endpointID, "error", err)
		return
	}

	// Create timeline entry for automatic incident creation
	timeline := &data.IncidentTimeline{
		IncidentID: incident.ID,
		UserID:     nil, // System-generated
		EventType:  "created",
		Message:    stringPtr("Incident automatically created by monitoring system"),
		Metadata: map[string]interface{}{
			"endpoint_id":          endpointID.String(),
			"endpoint_name":        endpoint.Name,
			"consecutive_failures": tracker.ConsecutiveFailures,
			"detection_trigger":    "automatic",
			"severity":             severity,
		},
	}
	if err := id.db.CreateIncidentTimeline(timeline); err != nil {
		id.logger.Error("failed to create incident timeline", "incident_id", incident.ID, "error", err)
		// Continue anyway
	}

	// Create endpoint incident association
	endpointIncident := &data.EndpointIncident{
		EndpointID:    endpointID,
		IncidentID:    incident.ID,
		AffectedStart: tracker.LastFailureTime,
	}

	if err := id.db.CreateEndpointIncident(endpointIncident); err != nil {
		id.logger.Error("failed to create endpoint incident", "incident_id", incident.ID, "endpoint_id", endpointID, "error", err)
		// Continue anyway, the incident was created
	} else {
		// Create timeline entry for endpoint association
		endpointTimeline := &data.IncidentTimeline{
			IncidentID: incident.ID,
			UserID:     nil, // System-generated
			EventType:  "endpoint_associated",
			Message:    stringPtr(fmt.Sprintf("Endpoint '%s' automatically associated due to failures", endpoint.Name)),
			Metadata: map[string]interface{}{
				"endpoint_id":   endpointID.String(),
				"endpoint_name": endpoint.Name,
				"automatic":     true,
			},
		}
		if err := id.db.CreateIncidentTimeline(endpointTimeline); err != nil {
			id.logger.Error("failed to create endpoint association timeline", "incident_id", incident.ID, "error", err)
		}
	}

	// Track the active incident
	id.activeIncidents[endpointID] = incident.ID

	id.logger.Info("automatic incident created",
		"incident_id", incident.ID,
		"endpoint_id", endpointID,
		"endpoint_name", endpoint.Name,
		"severity", severity,
		"consecutive_failures", tracker.ConsecutiveFailures)
}

// resolveIncidentIfNeeded resolves an incident if auto-resolve is enabled
func (id *IncidentDetector) resolveIncidentIfNeeded(endpointID uuid.UUID, tracker *FailureTracker) {
	if !id.config.AutoResolve {
		return
	}

	// Check if there's an active incident for this endpoint
	incidentID, exists := id.activeIncidents[endpointID]
	if !exists {
		return
	}

	// Get the incident
	incident, err := id.db.GetIncident(incidentID)
	if err != nil {
		id.logger.Error("failed to get incident for resolution", "incident_id", incidentID, "error", err)
		return
	}

	// Only resolve if the incident is not already resolved
	if incident.Status == "resolved" {
		delete(id.activeIncidents, endpointID)
		return
	}

	// Update incident status to resolved
	incident.Status = "resolved"
	now := time.Now()
	incident.EndTime = &now

	if err := id.db.UpdateIncident(incident); err != nil {
		id.logger.Error("failed to resolve incident", "incident_id", incidentID, "error", err)
		return
	}

	// Create timeline entry for automatic resolution
	timeline := &data.IncidentTimeline{
		IncidentID: incident.ID,
		UserID:     nil, // System-generated
		EventType:  "resolved",
		Message:    stringPtr("Incident automatically resolved by monitoring system"),
		Metadata: map[string]interface{}{
			"endpoint_id":           endpointID.String(),
			"consecutive_successes": tracker.ConsecutiveSuccess,
			"resolution_trigger":    "automatic",
			"resolved_at":           now.Format(time.RFC3339),
		},
	}
	if err := id.db.CreateIncidentTimeline(timeline); err != nil {
		id.logger.Error("failed to create resolution timeline", "incident_id", incidentID, "error", err)
		// Continue anyway
	}

	// Update endpoint incident end time
	endpointIncidents, err := id.db.GetEndpointIncidents(incidentID)
	if err == nil {
		for _, ei := range endpointIncidents {
			if ei.EndpointID == endpointID && ei.AffectedEnd == nil {
				ei.AffectedEnd = &now
				if updateErr := id.db.UpdateEndpointIncident(&ei); updateErr != nil {
					id.logger.Error("failed to update endpoint incident end time",
						"endpoint_incident_id", ei.ID, "error", updateErr)
				}
				break
			}
		}
	}

	// Remove from active incidents
	delete(id.activeIncidents, endpointID)

	id.logger.Info("automatic incident resolved",
		"incident_id", incidentID,
		"endpoint_id", endpointID,
		"consecutive_successes", tracker.ConsecutiveSuccess)
}

// determineSeverity determines incident severity based on monitoring logs
func (id *IncidentDetector) determineSeverity(logs []data.MonitoringLog) string {
	if len(logs) == 0 {
		return "medium"
	}

	// Look at recent response times to determine severity
	var avgResponseTime float64
	var responseTimeCount int
	var hasTimeouts bool

	for _, log := range logs {
		if log.ResponseTimeMs != nil {
			avgResponseTime += float64(*log.ResponseTimeMs)
			responseTimeCount++
		}

		// Check for timeouts or connection errors
		if log.ErrorMessage != nil &&
			(containsIgnoreCase(*log.ErrorMessage, "timeout") ||
				containsIgnoreCase(*log.ErrorMessage, "connection")) {
			hasTimeouts = true
		}
	}

	// If we have timeouts or connection errors, it's critical
	if hasTimeouts {
		return "critical"
	}

	// Determine severity based on average response time
	if responseTimeCount > 0 {
		avgResponseTime /= float64(responseTimeCount)

		if avgResponseTime > float64(id.config.SeverityThresholds.CriticalResponseTimeMs) {
			return "critical"
		} else if avgResponseTime > float64(id.config.SeverityThresholds.HighResponseTimeMs) {
			return "high"
		} else if avgResponseTime > float64(id.config.SeverityThresholds.MediumResponseTimeMs) {
			return "medium"
		}
	}

	return "low"
}

// containsIgnoreCase checks if a string contains a substring (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) &&
		len(substr) > 0 &&
		(s == substr ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsIgnoreCase(s[1:], substr))))
}

// stringPtr returns a pointer to the given string
func stringPtr(s string) *string {
	return &s
}

// GetActiveIncidents returns the currently active incidents
func (id *IncidentDetector) GetActiveIncidents() map[uuid.UUID]uuid.UUID {
	id.mu.RLock()
	defer id.mu.RUnlock()

	result := make(map[uuid.UUID]uuid.UUID)
	for endpointID, incidentID := range id.activeIncidents {
		result[endpointID] = incidentID
	}
	return result
}

// GetStats returns statistics about the incident detector
func (id *IncidentDetector) GetStats() IncidentDetectorStats {
	id.mu.RLock()
	defer id.mu.RUnlock()

	return IncidentDetectorStats{
		IsRunning:           id.isRunning,
		ActiveIncidents:     len(id.activeIncidents),
		TrackedEndpoints:    len(id.endpointFailures),
		CheckInterval:       id.config.CheckInterval,
		ConsecutiveFailures: id.config.ConsecutiveFailures,
		RecoveryThreshold:   id.config.RecoveryThreshold,
		AutoResolve:         id.config.AutoResolve,
	}
}

// IncidentDetectorStats represents statistics about the incident detector
type IncidentDetectorStats struct {
	IsRunning           bool          `json:"is_running"`
	ActiveIncidents     int           `json:"active_incidents"`
	TrackedEndpoints    int           `json:"tracked_endpoints"`
	CheckInterval       time.Duration `json:"check_interval"`
	ConsecutiveFailures int           `json:"consecutive_failures"`
	RecoveryThreshold   int           `json:"recovery_threshold"`
	AutoResolve         bool          `json:"auto_resolve"`
}
