package monitoring

import "errors"

var (
	// ErrJobQueueFull is returned when the job queue is full and cannot accept more jobs
	ErrJobQueueFull = errors.New("job queue is full")

	// ErrWorkerPoolStopped is returned when trying to submit jobs to a stopped worker pool
	ErrWorkerPoolStopped = errors.New("worker pool is stopped")

	// ErrInvalidEndpoint is returned when an endpoint configuration is invalid
	ErrInvalidEndpoint = errors.New("invalid endpoint configuration")

	// ErrHTTPRequestFailed is returned when an HTTP request fails
	ErrHTTPRequestFailed = errors.New("HTTP request failed")

	// ErrTimeout is returned when a request times out
	ErrTimeout = errors.New("request timeout")

	// ErrMaxRetriesExceeded is returned when maximum retry attempts are exceeded
	ErrMaxRetriesExceeded = errors.New("maximum retry attempts exceeded")
)
