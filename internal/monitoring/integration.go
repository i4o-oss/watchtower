package monitoring

import (
	"github.com/charmbracelet/log"
	"github.com/i4o-oss/watchtower/internal/data"
)

// StartMonitoringEngine creates and starts a monitoring engine with default configuration
func StartMonitoringEngine(db *data.DB, logger *log.Logger) (*MonitoringEngine, error) {
	config := DefaultEngineConfig()
	engine := NewMonitoringEngine(config, db, logger)

	if err := engine.Start(); err != nil {
		return nil, err
	}

	return engine, nil
}

// StartMonitoringEngineWithConfig creates and starts a monitoring engine with custom configuration
func StartMonitoringEngineWithConfig(config EngineConfig, db *data.DB, logger *log.Logger) (*MonitoringEngine, error) {
	engine := NewMonitoringEngine(config, db, logger)

	if err := engine.Start(); err != nil {
		return nil, err
	}

	return engine, nil
}

// The monitoring package exports for external use
var (
	// Default configurations
	DefaultWorkerPoolConfig = WorkerPoolConfig{
		WorkerCount:    5,
		JobQueueSize:   100,
		ResultChanSize: 50,
	}

	DefaultSchedulerConfig = SchedulerConfig{
		TickInterval: 10,
		MaxFailures:  5,
	}

	DefaultValidatorConfig = ValidatorConfig{
		MaxResponseTimeMs:        30000,
		ContentValidationEnabled: true,
		StrictStatusCodeCheck:    false,
		MaxValidationTimeMs:      1000,
	}
)
