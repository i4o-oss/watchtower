package main

import (
	"encoding/json"
	"net/http"
	"time"
)

// PerformanceMetrics represents frontend performance data
type PerformanceMetrics struct {
	FCP              *float64 `json:"fcp"`  // First Contentful Paint
	LCP              *float64 `json:"lcp"`  // Largest Contentful Paint
	FID              *float64 `json:"fid"`  // First Input Delay
	CLS              *float64 `json:"cls"`  // Cumulative Layout Shift
	TTFB             *float64 `json:"ttfb"` // Time to First Byte
	LoadTime         *float64 `json:"loadTime"`
	DOMContentLoaded *float64 `json:"domContentLoaded"`
	Route            string   `json:"route"`
	UserAgent        string   `json:"userAgent"`
	Timestamp        int64    `json:"timestamp"`
}

// collectPerformanceMetrics handles POST /api/v1/performance-metrics
func (app *Application) collectPerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	var metrics PerformanceMetrics

	if err := json.NewDecoder(r.Body).Decode(&metrics); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON in request body")
		return
	}

	// Log performance metrics for monitoring
	app.logger.Info("Frontend performance metrics received",
		"route", metrics.Route,
		"loadTime", metrics.LoadTime,
		"fcp", metrics.FCP,
		"lcp", metrics.LCP,
		"fid", metrics.FID,
		"cls", metrics.CLS,
		"ttfb", metrics.TTFB,
		"userAgent", metrics.UserAgent,
	)

	// In a production system, you might want to:
	// 1. Store metrics in a time-series database
	// 2. Aggregate metrics for monitoring dashboards
	// 3. Alert on performance degradations
	// 4. Calculate percentiles and trends

	// For now, just return success
	response := map[string]interface{}{
		"status":    "success",
		"timestamp": time.Now(),
		"message":   "Performance metrics received",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
