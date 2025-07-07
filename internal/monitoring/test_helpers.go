package monitoring

import (
	"time"

	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/data"
	"gorm.io/gorm"
)

// MockDB implements the interfaces needed by the monitoring engine
type MockDB struct {
	endpoints        []data.Endpoint
	monitoringLogs   []data.MonitoringLog
	shouldFail       bool
	failOnOperation  string
}

func NewMockDB() *MockDB {
	return &MockDB{
		endpoints:      make([]data.Endpoint, 0),
		monitoringLogs: make([]data.MonitoringLog, 0),
		shouldFail:     false,
	}
}

// Implement EndpointProvider interface
func (m *MockDB) GetEnabledEndpoints() ([]data.Endpoint, error) {
	if m.shouldFail && m.failOnOperation == "GetEnabledEndpoints" {
		return nil, gorm.ErrInvalidTransaction
	}
	
	var enabled []data.Endpoint
	for _, endpoint := range m.endpoints {
		if endpoint.Enabled {
			enabled = append(enabled, endpoint)
		}
	}
	return enabled, nil
}

// Implement MonitoringDB interface
func (m *MockDB) CreateMonitoringLog(log *data.MonitoringLog) error {
	if m.shouldFail && m.failOnOperation == "CreateMonitoringLog" {
		return gorm.ErrInvalidTransaction
	}
	
	log.ID = uuid.New()
	log.Timestamp = time.Now()
	m.monitoringLogs = append(m.monitoringLogs, *log)
	return nil
}

// Additional methods needed by the engine
func (m *MockDB) GetRecentMonitoringLogs(hours int) ([]data.MonitoringLog, error) {
	if m.shouldFail && m.failOnOperation == "GetRecentMonitoringLogs" {
		return nil, gorm.ErrInvalidTransaction
	}
	
	// Return logs from the last `hours` hours
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
	var recentLogs []data.MonitoringLog
	for _, log := range m.monitoringLogs {
		if log.Timestamp.After(cutoff) {
			recentLogs = append(recentLogs, log)
		}
	}
	return recentLogs, nil
}

// Helper methods for test setup
func (m *MockDB) AddEndpoint(endpoint data.Endpoint) {
	endpoint.ID = uuid.New()
	m.endpoints = append(m.endpoints, endpoint)
}

func (m *MockDB) SetShouldFail(shouldFail bool, operation string) {
	m.shouldFail = shouldFail
	m.failOnOperation = operation
}