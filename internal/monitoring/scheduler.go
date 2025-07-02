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

// ScheduledEndpoint represents an endpoint with its scheduling information
type ScheduledEndpoint struct {
	Endpoint     *data.Endpoint
	NextRun      time.Time
	Interval     time.Duration
	LastRun      *time.Time
	IsActive     bool
	FailureCount int
}

// Scheduler manages monitoring intervals for different endpoints
type Scheduler struct {
	mu               sync.RWMutex
	endpoints        map[uuid.UUID]*ScheduledEndpoint
	workerPool       *WorkerPool
	endpointProvider EndpointProvider
	logger           *log.Logger
	ctx              context.Context
	cancel           context.CancelFunc
	wg               sync.WaitGroup
	tickInterval     time.Duration
}

// EndpointProvider defines the interface for getting endpoint configurations
type EndpointProvider interface {
	GetEnabledEndpoints() ([]data.Endpoint, error)
}

// SchedulerConfig holds configuration for the scheduler
type SchedulerConfig struct {
	TickInterval time.Duration // How often to check for jobs to schedule
	MaxFailures  int           // Max consecutive failures before disabling endpoint
}

// NewScheduler creates a new scheduler instance
func NewScheduler(config SchedulerConfig, workerPool *WorkerPool, endpointProvider EndpointProvider, logger *log.Logger) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())

	if config.TickInterval == 0 {
		config.TickInterval = 10 * time.Second // Default tick interval
	}

	return &Scheduler{
		endpoints:        make(map[uuid.UUID]*ScheduledEndpoint),
		workerPool:       workerPool,
		endpointProvider: endpointProvider,
		logger:           logger,
		ctx:              ctx,
		cancel:           cancel,
		tickInterval:     config.TickInterval,
	}
}

// Start begins the scheduling operation
func (s *Scheduler) Start() error {
	s.logger.Info("starting scheduler", "tick_interval", s.tickInterval)

	// Load initial endpoints
	if err := s.LoadEndpoints(); err != nil {
		return fmt.Errorf("failed to load initial endpoints: %w", err)
	}

	// Start the scheduling loop
	s.wg.Add(1)
	go s.scheduleLoop()

	// Start endpoint refresh loop
	s.wg.Add(1)
	go s.endpointRefreshLoop()

	return nil
}

// Stop gracefully shuts down the scheduler
func (s *Scheduler) Stop() {
	s.logger.Info("stopping scheduler")
	s.cancel()
	s.wg.Wait()
	s.logger.Info("scheduler stopped")
}

// LoadEndpoints loads endpoints from the provider and updates the schedule
func (s *Scheduler) LoadEndpoints() error {
	endpoints, err := s.endpointProvider.GetEnabledEndpoints()
	if err != nil {
		return fmt.Errorf("failed to get endpoints: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Track which endpoints are in the new list
	newEndpoints := make(map[uuid.UUID]bool)

	for _, endpoint := range endpoints {
		newEndpoints[endpoint.ID] = true

		// Create or update scheduled endpoint
		scheduled, exists := s.endpoints[endpoint.ID]
		if !exists {
			// New endpoint
			scheduled = &ScheduledEndpoint{
				Endpoint:     &endpoint,
				Interval:     time.Duration(endpoint.CheckIntervalSeconds) * time.Second,
				NextRun:      time.Now().Add(time.Duration(endpoint.CheckIntervalSeconds) * time.Second),
				IsActive:     true,
				FailureCount: 0,
			}
			s.endpoints[endpoint.ID] = scheduled
			s.logger.Debug("added new endpoint to schedule", "endpoint_id", endpoint.ID, "interval", scheduled.Interval)
		} else {
			// Update existing endpoint
			scheduled.Endpoint = &endpoint
			newInterval := time.Duration(endpoint.CheckIntervalSeconds) * time.Second
			if scheduled.Interval != newInterval {
				scheduled.Interval = newInterval
				// Reschedule if interval changed
				scheduled.NextRun = time.Now().Add(newInterval)
				s.logger.Debug("updated endpoint interval", "endpoint_id", endpoint.ID, "new_interval", newInterval)
			}
		}
	}

	// Remove endpoints that are no longer enabled
	for id := range s.endpoints {
		if !newEndpoints[id] {
			delete(s.endpoints, id)
			s.logger.Debug("removed endpoint from schedule", "endpoint_id", id)
		}
	}

	s.logger.Info("loaded endpoints", "count", len(s.endpoints))
	return nil
}

// scheduleLoop is the main scheduling loop
func (s *Scheduler) scheduleLoop() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.tickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.processPendingJobs()
		case <-s.ctx.Done():
			s.logger.Debug("schedule loop stopping")
			return
		}
	}
}

// endpointRefreshLoop periodically reloads endpoints from the provider
func (s *Scheduler) endpointRefreshLoop() {
	defer s.wg.Done()

	// Refresh endpoints every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := s.LoadEndpoints(); err != nil {
				s.logger.Error("failed to refresh endpoints", "error", err)
			}
		case <-s.ctx.Done():
			s.logger.Debug("endpoint refresh loop stopping")
			return
		}
	}
}

// processPendingJobs checks for jobs that need to be scheduled and submits them
func (s *Scheduler) processPendingJobs() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	jobsScheduled := 0

	for endpointID, scheduled := range s.endpoints {
		if !scheduled.IsActive {
			continue
		}

		if now.After(scheduled.NextRun) || now.Equal(scheduled.NextRun) {
			// Time to schedule this job
			job := Job{
				ID:         uuid.New(),
				EndpointID: endpointID,
				Endpoint:   scheduled.Endpoint,
				Timestamp:  now,
			}

			err := s.workerPool.SubmitJob(job)
			if err != nil {
				s.logger.Error("failed to submit job", "endpoint_id", endpointID, "error", err)
				// Don't update NextRun if we couldn't schedule the job
				continue
			}

			// Update scheduling information
			scheduled.LastRun = &now
			scheduled.NextRun = now.Add(scheduled.Interval)
			jobsScheduled++

			s.logger.Debug("scheduled monitoring job",
				"endpoint_id", endpointID,
				"next_run", scheduled.NextRun,
				"interval", scheduled.Interval)
		}
	}

	if jobsScheduled > 0 {
		s.logger.Debug("scheduled jobs", "count", jobsScheduled)
	}
}

// AddEndpoint adds a new endpoint to the schedule
func (s *Scheduler) AddEndpoint(endpoint *data.Endpoint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	scheduled := &ScheduledEndpoint{
		Endpoint:     endpoint,
		Interval:     time.Duration(endpoint.CheckIntervalSeconds) * time.Second,
		NextRun:      time.Now().Add(time.Duration(endpoint.CheckIntervalSeconds) * time.Second),
		IsActive:     endpoint.Enabled,
		FailureCount: 0,
	}

	s.endpoints[endpoint.ID] = scheduled
	s.logger.Info("added endpoint to schedule", "endpoint_id", endpoint.ID, "interval", scheduled.Interval)
}

// RemoveEndpoint removes an endpoint from the schedule
func (s *Scheduler) RemoveEndpoint(endpointID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.endpoints, endpointID)
	s.logger.Info("removed endpoint from schedule", "endpoint_id", endpointID)
}

// UpdateEndpoint updates an existing endpoint in the schedule
func (s *Scheduler) UpdateEndpoint(endpoint *data.Endpoint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	scheduled, exists := s.endpoints[endpoint.ID]
	if !exists {
		// If it doesn't exist, add it
		s.mu.Unlock()
		s.AddEndpoint(endpoint)
		return
	}

	// Update the endpoint
	scheduled.Endpoint = endpoint
	scheduled.IsActive = endpoint.Enabled

	// Update interval if it changed
	newInterval := time.Duration(endpoint.CheckIntervalSeconds) * time.Second
	if scheduled.Interval != newInterval {
		scheduled.Interval = newInterval
		// Reschedule next run
		if scheduled.LastRun != nil {
			scheduled.NextRun = scheduled.LastRun.Add(newInterval)
		} else {
			scheduled.NextRun = time.Now().Add(newInterval)
		}
	}

	s.logger.Info("updated endpoint in schedule", "endpoint_id", endpoint.ID, "interval", scheduled.Interval, "active", scheduled.IsActive)
}

// GetScheduleStatus returns the current schedule status
func (s *Scheduler) GetScheduleStatus() ScheduleStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := ScheduleStatus{
		TotalEndpoints:    len(s.endpoints),
		ActiveEndpoints:   0,
		InactiveEndpoints: 0,
		Endpoints:         make([]EndpointScheduleInfo, 0, len(s.endpoints)),
	}

	for _, scheduled := range s.endpoints {
		if scheduled.IsActive {
			status.ActiveEndpoints++
		} else {
			status.InactiveEndpoints++
		}

		var timeUntilNext *time.Duration
		if scheduled.IsActive {
			duration := time.Until(scheduled.NextRun)
			timeUntilNext = &duration
		}

		info := EndpointScheduleInfo{
			EndpointID:    scheduled.Endpoint.ID,
			EndpointName:  scheduled.Endpoint.Name,
			Interval:      scheduled.Interval,
			NextRun:       scheduled.NextRun,
			LastRun:       scheduled.LastRun,
			IsActive:      scheduled.IsActive,
			FailureCount:  scheduled.FailureCount,
			TimeUntilNext: timeUntilNext,
		}

		status.Endpoints = append(status.Endpoints, info)
	}

	return status
}

// ScheduleStatus represents the current state of the scheduler
type ScheduleStatus struct {
	TotalEndpoints    int                    `json:"total_endpoints"`
	ActiveEndpoints   int                    `json:"active_endpoints"`
	InactiveEndpoints int                    `json:"inactive_endpoints"`
	Endpoints         []EndpointScheduleInfo `json:"endpoints"`
}

// EndpointScheduleInfo contains scheduling information for an endpoint
type EndpointScheduleInfo struct {
	EndpointID    uuid.UUID      `json:"endpoint_id"`
	EndpointName  string         `json:"endpoint_name"`
	Interval      time.Duration  `json:"interval"`
	NextRun       time.Time      `json:"next_run"`
	LastRun       *time.Time     `json:"last_run,omitempty"`
	IsActive      bool           `json:"is_active"`
	FailureCount  int            `json:"failure_count"`
	TimeUntilNext *time.Duration `json:"time_until_next,omitempty"`
}

// OnJobResult handles the result of a monitoring job to update scheduling state
func (s *Scheduler) OnJobResult(endpointID uuid.UUID, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	scheduled, exists := s.endpoints[endpointID]
	if !exists {
		return
	}

	if success {
		// Reset failure count on success
		scheduled.FailureCount = 0
	} else {
		// Increment failure count
		scheduled.FailureCount++

		// Deactivate endpoint if too many failures (configurable threshold)
		if scheduled.FailureCount >= 5 { // TODO: Make this configurable
			scheduled.IsActive = false
			s.logger.Warn("deactivating endpoint due to repeated failures",
				"endpoint_id", endpointID,
				"failure_count", scheduled.FailureCount)
		}
	}
}
