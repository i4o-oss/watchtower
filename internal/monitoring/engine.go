package monitoring

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/data"
)

// MonitoringEngine is the main monitoring system that coordinates all components
type MonitoringEngine struct {
	workerPool *WorkerPool
	scheduler  *Scheduler
	db         *data.DB
	logger     *log.Logger
	config     EngineConfig
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	isRunning  bool
	mu         sync.RWMutex
}

// EngineConfig holds configuration for the monitoring engine
type EngineConfig struct {
	WorkerPoolConfig WorkerPoolConfig
	SchedulerConfig  SchedulerConfig
	ValidatorConfig  ValidatorConfig
	HTTPClientConfig HTTPClientConfig
}

// DefaultEngineConfig returns a default configuration for the monitoring engine
func DefaultEngineConfig() EngineConfig {
	return EngineConfig{
		WorkerPoolConfig: WorkerPoolConfig{
			WorkerCount:    5,
			JobQueueSize:   100,
			ResultChanSize: 50,
		},
		SchedulerConfig: SchedulerConfig{
			TickInterval: 10 * time.Second,
			MaxFailures:  5,
		},
		ValidatorConfig: ValidatorConfig{
			MaxResponseTimeMs:        30000,
			ContentValidationEnabled: true,
			StrictStatusCodeCheck:    false,
			MaxValidationTimeMs:      1000,
		},
		HTTPClientConfig: HTTPClientConfig{
			Timeout:            30 * time.Second,
			MaxRetries:         3,
			RetryDelay:         1 * time.Second,
			MaxRetryDelay:      10 * time.Second,
			ConnectTimeout:     10 * time.Second,
			ResponseTimeout:    30 * time.Second,
			MaxResponseBodyKB:  64,
			InsecureSkipVerify: false,
			FollowRedirects:    true,
			MaxRedirects:       10,
		},
	}
}

// NewMonitoringEngine creates a new monitoring engine
func NewMonitoringEngine(config EngineConfig, db *data.DB, logger *log.Logger) *MonitoringEngine {
	ctx, cancel := context.WithCancel(context.Background())

	return &MonitoringEngine{
		db:     db,
		logger: logger,
		config: config,
		ctx:    ctx,
		cancel: cancel,
	}
}

// Start starts the monitoring engine
func (e *MonitoringEngine) Start() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.isRunning {
		return fmt.Errorf("monitoring engine is already running")
	}

	e.logger.Info("starting monitoring engine")

	// Create worker pool
	e.workerPool = NewWorkerPool(e.config.WorkerPoolConfig, e.logger, e.db)

	// Create scheduler with the database as endpoint provider
	e.scheduler = NewScheduler(e.config.SchedulerConfig, e.workerPool, e.db, e.logger)

	// Start worker pool
	e.workerPool.Start()

	// Start scheduler
	if err := e.scheduler.Start(); err != nil {
		e.workerPool.Stop()
		return fmt.Errorf("failed to start scheduler: %w", err)
	}

	// Start job result monitoring
	e.wg.Add(1)
	go e.resultMonitor()

	// Start health monitoring
	e.wg.Add(1)
	go e.healthMonitor()

	e.isRunning = true
	e.logger.Info("monitoring engine started successfully")

	return nil
}

// Stop gracefully stops the monitoring engine
func (e *MonitoringEngine) Stop() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.isRunning {
		return nil
	}

	e.logger.Info("stopping monitoring engine")

	// Signal shutdown
	e.cancel()

	// Stop scheduler first (stops creating new jobs)
	if e.scheduler != nil {
		e.scheduler.Stop()
	}

	// Stop worker pool (completes in-flight jobs)
	if e.workerPool != nil {
		e.workerPool.Stop()
	}

	// Wait for all goroutines to finish
	e.wg.Wait()

	e.isRunning = false
	e.logger.Info("monitoring engine stopped")

	return nil
}

// IsRunning returns whether the monitoring engine is currently running
func (e *MonitoringEngine) IsRunning() bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.isRunning
}

// GetStatus returns the current status of the monitoring engine
func (e *MonitoringEngine) GetStatus() EngineStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()

	status := EngineStatus{
		IsRunning: e.isRunning,
		StartTime: time.Now(), // TODO: Track actual start time
	}

	if e.isRunning {
		if e.workerPool != nil {
			status.WorkerPoolStats = e.workerPool.GetStats()
		}

		if e.scheduler != nil {
			status.ScheduleStatus = e.scheduler.GetScheduleStatus()
		}
	}

	return status
}

// resultMonitor monitors job results and updates scheduler state
func (e *MonitoringEngine) resultMonitor() {
	defer e.wg.Done()

	e.logger.Debug("starting result monitor")

	// This would typically listen to worker pool results
	// For now, we'll implement a simple monitoring loop
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Check for recent monitoring results and update scheduler
			e.updateSchedulerFromResults()
		case <-e.ctx.Done():
			e.logger.Debug("result monitor stopping")
			return
		}
	}
}

// updateSchedulerFromResults checks recent monitoring results and updates scheduler
func (e *MonitoringEngine) updateSchedulerFromResults() {
	// Get recent monitoring logs (last 10 minutes)
	logs, err := e.db.GetRecentMonitoringLogs(10) // 10 minutes
	if err != nil {
		e.logger.Error("failed to get recent monitoring logs", "error", err)
		return
	}

	// Track results per endpoint
	endpointResults := make(map[string][]bool)
	for _, log := range logs {
		endpointID := log.EndpointID.String()
		endpointResults[endpointID] = append(endpointResults[endpointID], log.Success)
	}

	// Update scheduler with results
	for endpointIDStr, results := range endpointResults {
		if len(results) > 0 {
			// Use the most recent result
			lastResult := results[len(results)-1]

			// Parse endpoint ID
			if endpointID, err := parseUUID(endpointIDStr); err == nil {
				e.scheduler.OnJobResult(endpointID, lastResult)
			}
		}
	}
}

// healthMonitor monitors the health of the monitoring engine components
func (e *MonitoringEngine) healthMonitor() {
	defer e.wg.Done()

	e.logger.Debug("starting health monitor")

	ticker := time.NewTicker(60 * time.Second) // Check health every minute
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			e.performHealthCheck()
		case <-e.ctx.Done():
			e.logger.Debug("health monitor stopping")
			return
		}
	}
}

// performHealthCheck checks the health of all components
func (e *MonitoringEngine) performHealthCheck() {
	if e.workerPool != nil {
		stats := e.workerPool.GetStats()

		// Check if job queue is getting full
		queueUsage := float64(stats.JobQueueSize) / float64(stats.JobQueueCap) * 100
		if queueUsage > 80 {
			e.logger.Warn("job queue usage high", "usage_percent", queueUsage)
		}

		// Check if result queue is getting full
		resultUsage := float64(stats.ResultQueueSize) / float64(stats.ResultQueueCap) * 100
		if resultUsage > 80 {
			e.logger.Warn("result queue usage high", "usage_percent", resultUsage)
		}
	}

	if e.scheduler != nil {
		scheduleStatus := e.scheduler.GetScheduleStatus()

		// Log overall schedule health
		e.logger.Debug("schedule health check",
			"total_endpoints", scheduleStatus.TotalEndpoints,
			"active_endpoints", scheduleStatus.ActiveEndpoints,
			"inactive_endpoints", scheduleStatus.InactiveEndpoints)
	}
}

// AddEndpoint adds a new endpoint to be monitored
func (e *MonitoringEngine) AddEndpoint(endpoint *data.Endpoint) error {
	if !e.IsRunning() {
		return fmt.Errorf("monitoring engine is not running")
	}

	if e.scheduler != nil {
		e.scheduler.AddEndpoint(endpoint)
	}

	return nil
}

// RemoveEndpoint removes an endpoint from monitoring
func (e *MonitoringEngine) RemoveEndpoint(endpointID string) error {
	if !e.IsRunning() {
		return fmt.Errorf("monitoring engine is not running")
	}

	parsedID, err := parseUUID(endpointID)
	if err != nil {
		return fmt.Errorf("invalid endpoint ID: %w", err)
	}

	if e.scheduler != nil {
		e.scheduler.RemoveEndpoint(parsedID)
	}

	return nil
}

// UpdateEndpoint updates an existing endpoint's monitoring configuration
func (e *MonitoringEngine) UpdateEndpoint(endpoint *data.Endpoint) error {
	if !e.IsRunning() {
		return fmt.Errorf("monitoring engine is not running")
	}

	if e.scheduler != nil {
		e.scheduler.UpdateEndpoint(endpoint)
	}

	return nil
}

// RunWithGracefulShutdown runs the monitoring engine with signal handling for graceful shutdown
func (e *MonitoringEngine) RunWithGracefulShutdown() error {
	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start the engine
	if err := e.Start(); err != nil {
		return fmt.Errorf("failed to start monitoring engine: %w", err)
	}

	e.logger.Info("monitoring engine running, press Ctrl+C to stop")

	// Wait for shutdown signal
	sig := <-sigChan
	e.logger.Info("received shutdown signal", "signal", sig)

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- e.Stop()
	}()

	select {
	case err := <-done:
		if err != nil {
			e.logger.Error("error during shutdown", "error", err)
			return err
		}
		e.logger.Info("graceful shutdown completed")
		return nil
	case <-shutdownCtx.Done():
		e.logger.Error("shutdown timeout exceeded, forcing exit")
		return fmt.Errorf("shutdown timeout exceeded")
	}
}

// EngineStatus represents the current status of the monitoring engine
type EngineStatus struct {
	IsRunning       bool            `json:"is_running"`
	StartTime       time.Time       `json:"start_time"`
	WorkerPoolStats WorkerPoolStats `json:"worker_pool_stats"`
	ScheduleStatus  ScheduleStatus  `json:"schedule_status"`
}

// Helper function to parse UUID strings
func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
