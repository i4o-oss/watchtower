package main

import (
	"net/http"
	"time"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string                 `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Version   string                 `json:"version"`
	Services  map[string]interface{} `json:"services"`
}

// healthCheck handles GET /health
func (app *Application) healthCheck(w http.ResponseWriter, r *http.Request) {
	services := make(map[string]interface{})

	// Check database connection
	sqlDB, err := app.db.GetSQLDB()
	if err != nil {
		services["database"] = map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		}
	} else {
		if err := sqlDB.Ping(); err != nil {
			services["database"] = map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			}
		} else {
			services["database"] = map[string]interface{}{
				"status": "healthy",
			}
		}
	}

	// Check cache connection
	cacheHealthy := true
	cacheError := ""

	// Test cache with a simple operation
	testKey := "health:check"
	if err := app.cache.Set(testKey, "test", time.Minute); err != nil {
		cacheHealthy = false
		cacheError = err.Error()
	} else {
		// Try to retrieve it
		var testValue string
		if err := app.cache.Get(testKey, &testValue); err != nil {
			cacheHealthy = false
			cacheError = err.Error()
		} else {
			// Clean up test key
			app.cache.Delete(testKey)
		}
	}

	if cacheHealthy {
		services["cache"] = map[string]interface{}{
			"status": "healthy",
			"stats":  app.db.GetCacheStats(),
		}
	} else {
		services["cache"] = map[string]interface{}{
			"status": "error",
			"error":  cacheError,
		}
	}

	// Check SSE hub
	services["sse"] = map[string]interface{}{
		"status":      "healthy",
		"connections": len(app.sseHub.clients),
	}

	// Determine overall status
	status := "healthy"
	for _, service := range services {
		if serviceMap, ok := service.(map[string]interface{}); ok {
			if serviceStatus, exists := serviceMap["status"]; exists && serviceStatus != "healthy" {
				status = "degraded"
				break
			}
		}
	}

	response := HealthResponse{
		Status:    status,
		Timestamp: time.Now(),
		Version:   "1.0.0", // Could be injected at build time
		Services:  services,
	}

	// Set appropriate HTTP status code
	statusCode := http.StatusOK
	if status == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	app.writeJSON(w, statusCode, response)
}

// readinessCheck handles GET /ready - for Kubernetes readiness probes
func (app *Application) readinessCheck(w http.ResponseWriter, r *http.Request) {
	// Check if essential services are ready

	// Check database
	sqlDB, err := app.db.GetSQLDB()
	if err != nil {
		app.errorResponse(w, http.StatusServiceUnavailable, "Database not ready")
		return
	}

	if err := sqlDB.Ping(); err != nil {
		app.errorResponse(w, http.StatusServiceUnavailable, "Database not ready")
		return
	}

	// For readiness, we don't require cache to be working (it's optional)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ready"))
}

// livenessCheck handles GET /live - for Kubernetes liveness probes
func (app *Application) livenessCheck(w http.ResponseWriter, r *http.Request) {
	// Simple liveness check - just return OK if the server is running
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Alive"))
}
