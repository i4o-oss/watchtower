package monitoring

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/data"
)

// MonitoringDB defines the interface for database operations needed by the worker pool
type MonitoringDB interface {
	CreateMonitoringLog(log *data.MonitoringLog) error
}

// Job represents a monitoring task to be executed
type Job struct {
	ID         uuid.UUID
	EndpointID uuid.UUID
	Endpoint   *data.Endpoint
	Timestamp  time.Time
}

// Result represents the result of a monitoring job
type Result struct {
	Job            Job
	Success        bool
	StatusCode     *int
	ResponseTimeMs *int
	ErrorMessage   *string
	ResponseSample *string
	ExecutedAt     time.Time
}

// WorkerPool manages a pool of workers for executing monitoring jobs
type WorkerPool struct {
	workers    int
	jobQueue   chan Job
	resultChan chan Result
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	logger     *log.Logger
	db         MonitoringDB
	httpClient *HTTPClient
	validator  *ResponseValidator
}

// WorkerPoolConfig holds configuration for the worker pool
type WorkerPoolConfig struct {
	WorkerCount    int
	JobQueueSize   int
	ResultChanSize int
}

// NewWorkerPool creates a new worker pool with the specified configuration
func NewWorkerPool(config WorkerPoolConfig, logger *log.Logger, db MonitoringDB) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())

	return &WorkerPool{
		workers:    config.WorkerCount,
		jobQueue:   make(chan Job, config.JobQueueSize),
		resultChan: make(chan Result, config.ResultChanSize),
		ctx:        ctx,
		cancel:     cancel,
		logger:     logger,
		db:         db,
		httpClient: NewHTTPClient(HTTPClientConfig{
			Timeout:       30 * time.Second,
			MaxRetries:    3,
			RetryDelay:    1 * time.Second,
			MaxRetryDelay: 10 * time.Second,
		}),
		validator: NewResponseValidator(ValidatorConfig{
			MaxResponseTimeMs:        30000,
			ContentValidationEnabled: true,
			StrictStatusCodeCheck:    false,
			MaxValidationTimeMs:      1000,
		}),
	}
}

// Start begins the worker pool operation
func (wp *WorkerPool) Start() {
	wp.logger.Info("starting worker pool", "workers", wp.workers)

	// Start workers
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}

	// Start result processor
	wp.wg.Add(1)
	go wp.resultProcessor()
}

// Stop gracefully shuts down the worker pool
func (wp *WorkerPool) Stop() {
	wp.logger.Info("stopping worker pool")

	// Close job queue and cancel context
	close(wp.jobQueue)
	wp.cancel()

	// Wait for all workers to finish
	wp.wg.Wait()

	// Close result channel
	close(wp.resultChan)

	wp.logger.Info("worker pool stopped")
}

// SubmitJob adds a job to the worker pool queue
func (wp *WorkerPool) SubmitJob(job Job) error {
	select {
	case wp.jobQueue <- job:
		return nil
	case <-wp.ctx.Done():
		return wp.ctx.Err()
	default:
		wp.logger.Warn("job queue is full, dropping job", "endpoint_id", job.EndpointID)
		return ErrJobQueueFull
	}
}

// worker is the main worker function that processes jobs
func (wp *WorkerPool) worker(workerID int) {
	defer wp.wg.Done()

	wp.logger.Debug("worker started", "worker_id", workerID)

	for {
		select {
		case job, ok := <-wp.jobQueue:
			if !ok {
				wp.logger.Debug("worker stopping - job queue closed", "worker_id", workerID)
				return
			}

			wp.logger.Debug("worker processing job", "worker_id", workerID, "endpoint_id", job.EndpointID)
			result := wp.executeJob(job)

			// Send result to result processor
			select {
			case wp.resultChan <- result:
			case <-wp.ctx.Done():
				wp.logger.Debug("worker stopping - context cancelled", "worker_id", workerID)
				return
			}

		case <-wp.ctx.Done():
			wp.logger.Debug("worker stopping - context cancelled", "worker_id", workerID)
			return
		}
	}
}

// executeJob performs the actual HTTP monitoring request
func (wp *WorkerPool) executeJob(job Job) Result {
	start := time.Now()

	result := Result{
		Job:        job,
		ExecutedAt: start,
	}

	// Execute HTTP request
	response, err := wp.httpClient.ExecuteRequest(job.Endpoint)
	if err != nil {
		result.Success = false
		errMsg := err.Error()
		result.ErrorMessage = &errMsg
		wp.logger.Error("job execution failed",
			"endpoint_id", job.EndpointID,
			"error", err.Error())
		return result
	}

	// Calculate response time
	responseTime := time.Since(start)
	responseTimeMs := int(responseTime.Milliseconds())
	result.ResponseTimeMs = &responseTimeMs
	result.StatusCode = &response.StatusCode
	result.ResponseSample = response.BodySample

	// Validate response using the validator
	validationResult := wp.validator.ValidateResponse(job.Endpoint, response, responseTime)
	result.Success = validationResult.Success

	if !validationResult.Success {
		// Collect all validation errors into a single error message
		var errorMessages []string
		for _, validationError := range validationResult.Errors {
			errorMessages = append(errorMessages, validationError.Description)
		}
		errMsg := fmt.Sprintf("validation failed: %s", strings.Join(errorMessages, "; "))
		result.ErrorMessage = &errMsg
	}

	wp.logger.Debug("job executed",
		"endpoint_id", job.EndpointID,
		"status_code", response.StatusCode,
		"response_time_ms", responseTimeMs,
		"success", result.Success,
		"validation_errors", len(validationResult.Errors))

	return result
}

// resultProcessor handles the results from workers and saves them to database
func (wp *WorkerPool) resultProcessor() {
	defer wp.wg.Done()

	wp.logger.Debug("result processor started")

	for {
		select {
		case result, ok := <-wp.resultChan:
			if !ok {
				wp.logger.Debug("result processor stopping - result channel closed")
				return
			}

			// Save monitoring result to database
			monitoringLog := &data.MonitoringLog{
				EndpointID:         result.Job.EndpointID,
				Timestamp:          result.ExecutedAt,
				StatusCode:         result.StatusCode,
				ResponseTimeMs:     result.ResponseTimeMs,
				ErrorMessage:       result.ErrorMessage,
				Success:            result.Success,
				ResponseBodySample: result.ResponseSample,
			}

			if err := wp.db.CreateMonitoringLog(monitoringLog); err != nil {
				wp.logger.Error("failed to save monitoring log",
					"endpoint_id", result.Job.EndpointID,
					"error", err.Error())
			} else {
				wp.logger.Debug("monitoring log saved",
					"endpoint_id", result.Job.EndpointID,
					"log_id", monitoringLog.ID)
			}

		case <-wp.ctx.Done():
			wp.logger.Debug("result processor stopping - context cancelled")
			return
		}
	}
}

// GetStats returns current worker pool statistics
func (wp *WorkerPool) GetStats() WorkerPoolStats {
	return WorkerPoolStats{
		Workers:         wp.workers,
		JobQueueSize:    len(wp.jobQueue),
		JobQueueCap:     cap(wp.jobQueue),
		ResultQueueSize: len(wp.resultChan),
		ResultQueueCap:  cap(wp.resultChan),
	}
}

// WorkerPoolStats represents worker pool statistics
type WorkerPoolStats struct {
	Workers         int `json:"workers"`
	JobQueueSize    int `json:"job_queue_size"`
	JobQueueCap     int `json:"job_queue_capacity"`
	ResultQueueSize int `json:"result_queue_size"`
	ResultQueueCap  int `json:"result_queue_capacity"`
}
