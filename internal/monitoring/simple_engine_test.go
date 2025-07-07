package monitoring

import (
	"testing"
	"time"

	"github.com/charmbracelet/log"
)

func TestEngineComponents(t *testing.T) {
	// Test default configuration
	config := DefaultEngineConfig()
	if config.WorkerPoolConfig.WorkerCount != 5 {
		t.Errorf("Expected WorkerCount=5, got %d", config.WorkerPoolConfig.WorkerCount)
	}
	if config.SchedulerConfig.TickInterval != 10*time.Second {
		t.Errorf("Expected TickInterval=10s, got %v", config.SchedulerConfig.TickInterval)
	}
}

func TestHTTPClientConfig(t *testing.T) {
	// Test HTTP client configuration
	config := HTTPClientConfig{
		Timeout:    5 * time.Second,
		MaxRetries: 3,
	}
	
	client := NewHTTPClient(config)
	if client == nil {
		t.Error("Expected client to be created")
	}
	
	if client.config.Timeout != 5*time.Second {
		t.Errorf("Expected Timeout=5s, got %v", client.config.Timeout)
	}
	
	if client.config.MaxRetries != 3 {
		t.Errorf("Expected MaxRetries=3, got %d", client.config.MaxRetries)
	}
}

func TestParseUUID(t *testing.T) {
	// Test valid UUID
	validUUID := "550e8400-e29b-41d4-a716-446655440000"
	parsed, err := parseUUID(validUUID)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if parsed.String() != validUUID {
		t.Errorf("Expected %s, got %s", validUUID, parsed.String())
	}
	
	// Test invalid UUID
	_, err = parseUUID("invalid-uuid")
	if err == nil {
		t.Error("Expected error for invalid UUID")
	}
}

func TestLoggerCreation(t *testing.T) {
	logger := log.New(nil)
	logger.SetLevel(log.ErrorLevel)
	
	if logger == nil {
		t.Error("Expected logger to be created")
	}
}

func TestMonitoringStructures(t *testing.T) {
	// Test WorkerPoolStats structure
	stats := WorkerPoolStats{
		Workers:         5,
		JobQueueSize:    10,
		JobQueueCap:     100,
		ResultQueueSize: 5,
		ResultQueueCap:  50,
	}
	
	if stats.Workers != 5 {
		t.Errorf("Expected Workers=5, got %d", stats.Workers)
	}
	
	if stats.JobQueueSize != 10 {
		t.Errorf("Expected JobQueueSize=10, got %d", stats.JobQueueSize)
	}
}

func TestMockDBBasics(t *testing.T) {
	mockDB := NewMockDB()
	
	if mockDB == nil {
		t.Error("Expected mock DB to be created")
	}
	
	// Test GetEnabledEndpoints with no endpoints
	endpoints, err := mockDB.GetEnabledEndpoints()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	if len(endpoints) != 0 {
		t.Errorf("Expected 0 endpoints, got %d", len(endpoints))
	}
	
	// Test failure scenario
	mockDB.SetShouldFail(true, "GetEnabledEndpoints")
	_, err = mockDB.GetEnabledEndpoints()
	if err == nil {
		t.Error("Expected error when shouldFail is true")
	}
}