package cache

import (
	"errors"
	"fmt"
	"time"
)

// Common cache errors
var (
	ErrCacheMiss    = errors.New("cache miss")
	ErrCacheExpired = errors.New("cache expired")
)

// Cache interface defines the caching operations
type Cache interface {
	Set(key string, value interface{}, expiration time.Duration) error
	Get(key string, dest interface{}) error
	Delete(key string) error
	DeletePattern(pattern string) error
	Exists(key string) (bool, error)
	SetNX(key string, value interface{}, expiration time.Duration) (bool, error)
	Increment(key string) (int64, error)
	IncrementWithExpiry(key string, expiration time.Duration) (int64, error)
	Close() error
}

// Cache key constants
const (
	// Endpoint caching
	CacheKeyEndpoint         = "endpoint:%s"
	CacheKeyEndpoints        = "endpoints:page:%d:limit:%d:enabled:%v"
	CacheKeyEnabledEndpoints = "endpoints:enabled"

	// Monitoring logs caching
	CacheKeyMonitoringLogs = "monitoring_logs:page:%d:limit:%d:hours:%d:endpoint:%s:success:%v"
	CacheKeyEndpointLogs   = "endpoint_logs:%s:limit:%d"
	CacheKeyRecentLogs     = "recent_logs:hours:%d"

	// Incident caching
	CacheKeyIncident      = "incident:%s"
	CacheKeyIncidents     = "incidents:page:%d:limit:%d:status:%s:severity:%s"
	CacheKeyOpenIncidents = "incidents:open"

	// Uptime and stats caching
	CacheKeyUptimeStats   = "uptime_stats:%s:days:%d"
	CacheKeyLatestStatus  = "latest_status"
	CacheKeyHealthSummary = "health_summary"

	// User caching
	CacheKeyUser        = "user:%s"
	CacheKeyUserByEmail = "user:email:%s"

	// Rate limiting
	CacheKeyRateLimit = "rate_limit:%s:%s" // IP:endpoint

	// Session caching
	CacheKeySession = "session:%s"
)

// Cache expiration times
const (
	CacheExpireShort    = 5 * time.Minute  // For frequently changing data
	CacheExpireMedium   = 15 * time.Minute // For semi-static data
	CacheExpireLong     = 1 * time.Hour    // For static data
	CacheExpireVeryLong = 24 * time.Hour   // For very static data

	// Rate limiting
	RateLimitExpire = 1 * time.Minute

	// Session expiration
	SessionExpire = 24 * time.Hour
)

// CacheKeyBuilder helps build cache keys consistently
type CacheKeyBuilder struct{}

// NewCacheKeyBuilder creates a new cache key builder
func NewCacheKeyBuilder() *CacheKeyBuilder {
	return &CacheKeyBuilder{}
}

func (ckb *CacheKeyBuilder) EndpointKey(id string) string {
	return fmt.Sprintf(CacheKeyEndpoint, id)
}

func (ckb *CacheKeyBuilder) EndpointsKey(page, limit int, enabled *bool) string {
	enabledStr := "nil"
	if enabled != nil {
		if *enabled {
			enabledStr = "true"
		} else {
			enabledStr = "false"
		}
	}
	return fmt.Sprintf(CacheKeyEndpoints, page, limit, enabledStr)
}

func (ckb *CacheKeyBuilder) MonitoringLogsKey(page, limit, hours int, endpointID *string, success *bool) string {
	endpointStr := "nil"
	if endpointID != nil {
		endpointStr = *endpointID
	}
	successStr := "nil"
	if success != nil {
		if *success {
			successStr = "true"
		} else {
			successStr = "false"
		}
	}
	return fmt.Sprintf(CacheKeyMonitoringLogs, page, limit, hours, endpointStr, successStr)
}

func (ckb *CacheKeyBuilder) IncidentsKey(page, limit int, status, severity string) string {
	return fmt.Sprintf(CacheKeyIncidents, page, limit, status, severity)
}

func (ckb *CacheKeyBuilder) UptimeStatsKey(endpointID string, days int) string {
	return fmt.Sprintf(CacheKeyUptimeStats, endpointID, days)
}

func (ckb *CacheKeyBuilder) RateLimitKey(ip, endpoint string) string {
	return fmt.Sprintf(CacheKeyRateLimit, ip, endpoint)
}
