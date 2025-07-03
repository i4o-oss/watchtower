package data

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/i4o-oss/watchtower/internal/cache"
)

// CachedDB wraps the regular DB with caching functionality
type CachedDB struct {
	*DB
	cache      cache.Cache
	keyBuilder *cache.CacheKeyBuilder
}

// NewCachedDB creates a new cached database wrapper
func NewCachedDB(db *DB, cacheInstance cache.Cache) *CachedDB {
	return &CachedDB{
		DB:         db,
		cache:      cacheInstance,
		keyBuilder: cache.NewCacheKeyBuilder(),
	}
}

// Cached Endpoint operations

func (cdb *CachedDB) GetEndpoint(id uuid.UUID) (*Endpoint, error) {
	key := cdb.keyBuilder.EndpointKey(id.String())

	// Try cache first
	var endpoint Endpoint
	if err := cdb.cache.Get(key, &endpoint); err == nil {
		return &endpoint, nil
	}

	// Cache miss, get from database
	endpoint_ptr, err := cdb.DB.GetEndpoint(id)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if err := cdb.cache.Set(key, *endpoint_ptr, cache.CacheExpireMedium); err != nil {
		log.Printf("Failed to cache endpoint %s: %v", id, err)
	}

	return endpoint_ptr, nil
}

func (cdb *CachedDB) GetEndpointsWithPagination(page, limit int, enabled *bool) ([]Endpoint, int64, error) {
	key := cdb.keyBuilder.EndpointsKey(page, limit, enabled)

	// Try cache first
	var cached struct {
		Endpoints []Endpoint `json:"endpoints"`
		Total     int64      `json:"total"`
	}
	if err := cdb.cache.Get(key, &cached); err == nil {
		return cached.Endpoints, cached.Total, nil
	}

	// Cache miss, get from database
	endpoints, total, err := cdb.DB.GetEndpointsWithPagination(page, limit, enabled)
	if err != nil {
		return nil, 0, err
	}

	// Cache the result
	cached.Endpoints = endpoints
	cached.Total = total
	if err := cdb.cache.Set(key, cached, cache.CacheExpireShort); err != nil {
		log.Printf("Failed to cache endpoints pagination: %v", err)
	}

	return endpoints, total, nil
}

func (cdb *CachedDB) GetEnabledEndpoints() ([]Endpoint, error) {
	key := cache.CacheKeyEnabledEndpoints

	// Try cache first
	var endpoints []Endpoint
	if err := cdb.cache.Get(key, &endpoints); err == nil {
		return endpoints, nil
	}

	// Cache miss, get from database
	endpoints, err := cdb.DB.GetEnabledEndpoints()
	if err != nil {
		return nil, err
	}

	// Cache the result
	if err := cdb.cache.Set(key, endpoints, cache.CacheExpireShort); err != nil {
		log.Printf("Failed to cache enabled endpoints: %v", err)
	}

	return endpoints, nil
}

func (cdb *CachedDB) CreateEndpoint(endpoint *Endpoint) error {
	err := cdb.DB.CreateEndpoint(endpoint)
	if err != nil {
		return err
	}

	// Invalidate related caches
	cdb.invalidateEndpointCaches()

	return nil
}

func (cdb *CachedDB) UpdateEndpoint(endpoint *Endpoint) error {
	err := cdb.DB.UpdateEndpoint(endpoint)
	if err != nil {
		return err
	}

	// Invalidate caches
	cdb.cache.Delete(cdb.keyBuilder.EndpointKey(endpoint.ID.String()))
	cdb.invalidateEndpointCaches()

	return nil
}

func (cdb *CachedDB) DeleteEndpoint(id uuid.UUID) error {
	err := cdb.DB.DeleteEndpoint(id)
	if err != nil {
		return err
	}

	// Invalidate caches
	cdb.cache.Delete(cdb.keyBuilder.EndpointKey(id.String()))
	cdb.invalidateEndpointCaches()

	return nil
}

// Cached Monitoring Log operations

func (cdb *CachedDB) GetMonitoringLogsWithPagination(page, limit, hours int, endpointID *uuid.UUID, success *bool) ([]MonitoringLog, int64, error) {
	var endpointIDStr *string
	if endpointID != nil {
		str := endpointID.String()
		endpointIDStr = &str
	}

	key := cdb.keyBuilder.MonitoringLogsKey(page, limit, hours, endpointIDStr, success)

	// Try cache first
	var cached struct {
		Logs  []MonitoringLog `json:"logs"`
		Total int64           `json:"total"`
	}
	if err := cdb.cache.Get(key, &cached); err == nil {
		return cached.Logs, cached.Total, nil
	}

	// Cache miss, get from database
	logs, total, err := cdb.DB.GetMonitoringLogsWithPagination(page, limit, hours, endpointID, success)
	if err != nil {
		return nil, 0, err
	}

	// Cache the result with shorter expiration for monitoring data
	cached.Logs = logs
	cached.Total = total
	if err := cdb.cache.Set(key, cached, cache.CacheExpireShort); err != nil {
		log.Printf("Failed to cache monitoring logs pagination: %v", err)
	}

	return logs, total, nil
}

func (cdb *CachedDB) GetUptimeStats(endpointID uuid.UUID, days int) (float64, error) {
	key := cdb.keyBuilder.UptimeStatsKey(endpointID.String(), days)

	// Try cache first
	var uptime float64
	if err := cdb.cache.Get(key, &uptime); err == nil {
		return uptime, nil
	}

	// Cache miss, get from database
	uptime, err := cdb.DB.GetUptimeStats(endpointID, days)
	if err != nil {
		return 0, err
	}

	// Cache the result for longer since uptime stats don't change frequently
	if err := cdb.cache.Set(key, uptime, cache.CacheExpireMedium); err != nil {
		log.Printf("Failed to cache uptime stats: %v", err)
	}

	return uptime, nil
}

func (cdb *CachedDB) GetLatestMonitoringStatus() (map[uuid.UUID]MonitoringLog, error) {
	key := cache.CacheKeyLatestStatus

	// Try cache first
	var status map[uuid.UUID]MonitoringLog
	if err := cdb.cache.Get(key, &status); err == nil {
		return status, nil
	}

	// Cache miss, get from database
	status, err := cdb.DB.GetLatestMonitoringStatus()
	if err != nil {
		return nil, err
	}

	// Cache the result with short expiration since this changes frequently
	if err := cdb.cache.Set(key, status, cache.CacheExpireShort); err != nil {
		log.Printf("Failed to cache latest monitoring status: %v", err)
	}

	return status, nil
}

func (cdb *CachedDB) CreateMonitoringLog(log *MonitoringLog) error {
	err := cdb.DB.CreateMonitoringLog(log)
	if err != nil {
		return err
	}

	// Invalidate related caches
	cdb.invalidateMonitoringCaches()

	return nil
}

// Cached Incident operations

func (cdb *CachedDB) GetIncident(id uuid.UUID) (*Incident, error) {
	key := fmt.Sprintf(cache.CacheKeyIncident, id.String())

	// Try cache first
	var incident Incident
	if err := cdb.cache.Get(key, &incident); err == nil {
		return &incident, nil
	}

	// Cache miss, get from database
	incident_ptr, err := cdb.DB.GetIncident(id)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if err := cdb.cache.Set(key, *incident_ptr, cache.CacheExpireMedium); err != nil {
		log.Printf("Failed to cache incident %s: %v", id, err)
	}

	return incident_ptr, nil
}

func (cdb *CachedDB) GetIncidentsWithPagination(page, limit int, status string, severity string) ([]Incident, int64, error) {
	key := cdb.keyBuilder.IncidentsKey(page, limit, status, severity)

	// Try cache first
	var cached struct {
		Incidents []Incident `json:"incidents"`
		Total     int64      `json:"total"`
	}
	if err := cdb.cache.Get(key, &cached); err == nil {
		return cached.Incidents, cached.Total, nil
	}

	// Cache miss, get from database
	incidents, total, err := cdb.DB.GetIncidentsWithPagination(page, limit, status, severity)
	if err != nil {
		return nil, 0, err
	}

	// Cache the result
	cached.Incidents = incidents
	cached.Total = total
	if err := cdb.cache.Set(key, cached, cache.CacheExpireShort); err != nil {
		log.Printf("Failed to cache incidents pagination: %v", err)
	}

	return incidents, total, nil
}

func (cdb *CachedDB) CreateIncident(incident *Incident) error {
	err := cdb.DB.CreateIncident(incident)
	if err != nil {
		return err
	}

	// Invalidate related caches
	cdb.invalidateIncidentCaches()

	return nil
}

func (cdb *CachedDB) UpdateIncident(incident *Incident) error {
	err := cdb.DB.UpdateIncident(incident)
	if err != nil {
		return err
	}

	// Invalidate caches
	cdb.cache.Delete(fmt.Sprintf(cache.CacheKeyIncident, incident.ID.String()))
	cdb.invalidateIncidentCaches()

	return nil
}

func (cdb *CachedDB) DeleteIncident(id uuid.UUID) error {
	err := cdb.DB.DeleteIncident(id)
	if err != nil {
		return err
	}

	// Invalidate caches
	cdb.cache.Delete(fmt.Sprintf(cache.CacheKeyIncident, id.String()))
	cdb.invalidateIncidentCaches()

	return nil
}

// Cached User operations

func (cdb *CachedDB) GetUserByEmail(email string) (*User, error) {
	key := fmt.Sprintf(cache.CacheKeyUserByEmail, email)

	// Try cache first
	var user User
	if err := cdb.cache.Get(key, &user); err == nil {
		return &user, nil
	}

	// Cache miss, get from database
	user_ptr, err := cdb.DB.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if err := cdb.cache.Set(key, *user_ptr, cache.CacheExpireLong); err != nil {
		log.Printf("Failed to cache user by email %s: %v", email, err)
	}

	return user_ptr, nil
}

func (cdb *CachedDB) GetUserByID(id uuid.UUID) (*User, error) {
	key := fmt.Sprintf(cache.CacheKeyUser, id.String())

	// Try cache first
	var user User
	if err := cdb.cache.Get(key, &user); err == nil {
		return &user, nil
	}

	// Cache miss, get from database
	user_ptr, err := cdb.DB.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if err := cdb.cache.Set(key, *user_ptr, cache.CacheExpireLong); err != nil {
		log.Printf("Failed to cache user %s: %v", id, err)
	}

	return user_ptr, nil
}

func (cdb *CachedDB) CreateUser(user *User) error {
	err := cdb.DB.CreateUser(user)
	if err != nil {
		return err
	}

	// Cache the new user
	cdb.cache.Set(fmt.Sprintf(cache.CacheKeyUser, user.ID.String()), *user, cache.CacheExpireLong)
	cdb.cache.Set(fmt.Sprintf(cache.CacheKeyUserByEmail, user.Email), *user, cache.CacheExpireLong)

	return nil
}

// Cache invalidation helpers

func (cdb *CachedDB) invalidateEndpointCaches() {
	// Invalidate paginated endpoints caches
	cdb.cache.DeletePattern("endpoints:page:*")
	cdb.cache.Delete(cache.CacheKeyEnabledEndpoints)
	cdb.cache.Delete(cache.CacheKeyHealthSummary)
	cdb.cache.Delete(cache.CacheKeyLatestStatus)
}

func (cdb *CachedDB) invalidateMonitoringCaches() {
	// Invalidate monitoring logs caches
	cdb.cache.DeletePattern("monitoring_logs:*")
	cdb.cache.DeletePattern("endpoint_logs:*")
	cdb.cache.DeletePattern("recent_logs:*")
	cdb.cache.DeletePattern("uptime_stats:*")
	cdb.cache.Delete(cache.CacheKeyLatestStatus)
	cdb.cache.Delete(cache.CacheKeyHealthSummary)
}

func (cdb *CachedDB) invalidateIncidentCaches() {
	// Invalidate incident caches
	cdb.cache.DeletePattern("incidents:*")
	cdb.cache.Delete(cache.CacheKeyOpenIncidents)
}

// Cache warming methods

func (cdb *CachedDB) WarmCache() error {
	log.Println("Starting cache warming...")

	// Warm enabled endpoints cache
	if _, err := cdb.GetEnabledEndpoints(); err != nil {
		log.Printf("Failed to warm enabled endpoints cache: %v", err)
	}

	// Warm latest monitoring status cache
	if _, err := cdb.GetLatestMonitoringStatus(); err != nil {
		log.Printf("Failed to warm latest monitoring status cache: %v", err)
	}

	log.Println("Cache warming completed")
	return nil
}

// Cache metrics and monitoring

func (cdb *CachedDB) GetCacheStats() map[string]interface{} {
	// This would return cache hit/miss statistics
	// Implementation depends on whether Redis provides these metrics
	return map[string]interface{}{
		"cache_type": "redis",
		"status":     "connected",
	}
}

// GetSQLDB returns the underlying sql.DB for health checks and connections
func (cdb *CachedDB) GetSQLDB() (*sql.DB, error) {
	return cdb.DB.DB.DB()
}
