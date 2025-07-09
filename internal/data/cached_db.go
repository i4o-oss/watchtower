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
	// Always fetch from database to ensure consistency
	return cdb.DB.GetEndpoint(id)
}

func (cdb *CachedDB) GetEndpointsWithPagination(page, limit int, enabled *bool) ([]Endpoint, int64, error) {
	// Always fetch from database to ensure immediate consistency after create/update/delete
	// This is the most critical endpoint for admin UI, so we prioritize consistency over cache performance
	return cdb.DB.GetEndpointsWithPagination(page, limit, enabled)
}

func (cdb *CachedDB) GetEnabledEndpoints() ([]Endpoint, error) {
	// Always fetch from database to ensure status page shows new endpoints immediately
	// This is critical for user experience on the public status page
	return cdb.DB.GetEnabledEndpoints()
}

func (cdb *CachedDB) CreateEndpoint(endpoint *Endpoint) error {
	// No caching needed - direct database operation
	return cdb.DB.CreateEndpoint(endpoint)
}

func (cdb *CachedDB) UpdateEndpoint(endpoint *Endpoint) error {
	// No caching needed - direct database operation
	return cdb.DB.UpdateEndpoint(endpoint)
}

func (cdb *CachedDB) DeleteEndpoint(id uuid.UUID) error {
	// No caching needed - direct database operation
	return cdb.DB.DeleteEndpoint(id)
}

// Cached Monitoring Log operations

func (cdb *CachedDB) GetMonitoringLogsWithPagination(page, limit, hours int, endpointID *uuid.UUID, success *bool) ([]MonitoringLog, int64, error) {
	// Only cache if hours <= 24 (current day data)
	shouldCache := hours <= 24

	if shouldCache {
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
	}

	// Cache miss or not cacheable, get from database
	logs, total, err := cdb.DB.GetMonitoringLogsWithPagination(page, limit, hours, endpointID, success)
	if err != nil {
		return nil, 0, err
	}

	// Cache the result only for current day data with 24h TTL
	if shouldCache {
		var endpointIDStr *string
		if endpointID != nil {
			str := endpointID.String()
			endpointIDStr = &str
		}

		key := cdb.keyBuilder.MonitoringLogsKey(page, limit, hours, endpointIDStr, success)
		cached := struct {
			Logs  []MonitoringLog `json:"logs"`
			Total int64           `json:"total"`
		}{
			Logs:  logs,
			Total: total,
		}

		if err := cdb.cache.Set(key, cached, cache.CacheExpireVeryLong); err != nil {
			log.Printf("Failed to cache monitoring logs pagination: %v", err)
		}
	}

	return logs, total, nil
}

func (cdb *CachedDB) GetUptimeStats(endpointID uuid.UUID, days int) (float64, error) {
	// No caching - always fetch from database for accuracy
	return cdb.DB.GetUptimeStats(endpointID, days)
}

func (cdb *CachedDB) GetLatestMonitoringStatus() (map[uuid.UUID]MonitoringLog, error) {
	// No caching - always fetch latest status from database for accuracy
	return cdb.DB.GetLatestMonitoringStatus()
}

func (cdb *CachedDB) CreateMonitoringLog(log *MonitoringLog) error {
	err := cdb.DB.CreateMonitoringLog(log)
	if err != nil {
		return err
	}

	// Invalidate current day monitoring caches only
	cdb.invalidateMonitoringCaches()

	return nil
}

// Incident operations (no caching)

func (cdb *CachedDB) GetIncident(id uuid.UUID) (*Incident, error) {
	// No caching - direct database operation
	return cdb.DB.GetIncident(id)
}

func (cdb *CachedDB) GetIncidentsWithPagination(page, limit int, status string, severity string) ([]Incident, int64, error) {
	// No caching - direct database operation
	return cdb.DB.GetIncidentsWithPagination(page, limit, status, severity)
}

func (cdb *CachedDB) CreateIncident(incident *Incident) error {
	// No caching - direct database operation
	return cdb.DB.CreateIncident(incident)
}

func (cdb *CachedDB) UpdateIncident(incident *Incident) error {
	// No caching - direct database operation
	return cdb.DB.UpdateIncident(incident)
}

func (cdb *CachedDB) DeleteIncident(id uuid.UUID) error {
	// No caching - direct database operation
	return cdb.DB.DeleteIncident(id)
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

func (cdb *CachedDB) invalidateMonitoringCaches() {
	// Only invalidate current day monitoring logs cache (24h window)
	if err := cdb.cache.DeletePattern("monitoring_logs:*"); err != nil {
		log.Printf("Failed to delete monitoring_logs:* pattern: %v", err)
	}
}

// Cache warming methods

func (cdb *CachedDB) WarmCache() error {
	log.Println("Cache warming skipped - using direct database access for consistency")
	// No cache warming needed since we prioritize consistency over cache performance
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
