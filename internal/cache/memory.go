package cache

import (
	"reflect"
	"sync"
	"time"
)

// cacheItem represents an item in the memory cache
type cacheItem struct {
	value      interface{}
	expiration time.Time
}

// isExpired checks if the cache item has expired
func (item *cacheItem) isExpired() bool {
	return time.Now().After(item.expiration)
}

// MemoryCache implements the Cache interface using in-memory storage
type MemoryCache struct {
	items map[string]*cacheItem
	mutex sync.RWMutex
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		items: make(map[string]*cacheItem),
	}

	// Start cleanup goroutine to remove expired items
	go cache.cleanupExpired()

	return cache
}

// Set stores a value in the cache with expiration
func (m *MemoryCache) Set(key string, value interface{}, expiration time.Duration) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.items[key] = &cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}

	return nil
}

// Get retrieves a value from the cache
func (m *MemoryCache) Get(key string, dest interface{}) error {
	m.mutex.RLock()
	item, exists := m.items[key]
	if !exists {
		m.mutex.RUnlock()
		return ErrCacheMiss
	}

	if item.isExpired() {
		// Remove expired item and unlock
		m.mutex.RUnlock()
		m.mutex.Lock()
		delete(m.items, key)
		m.mutex.Unlock()
		return ErrCacheMiss
	}
	m.mutex.RUnlock()

	// Copy the value to destination using reflection for complex types
	switch d := dest.(type) {
	case *bool:
		if v, ok := item.value.(bool); ok {
			*d = v
		} else {
			return ErrCacheMiss
		}
	case *string:
		if v, ok := item.value.(string); ok {
			*d = v
		} else {
			return ErrCacheMiss
		}
	case *int:
		if v, ok := item.value.(int); ok {
			*d = v
		} else {
			return ErrCacheMiss
		}
	case *int64:
		if v, ok := item.value.(int64); ok {
			*d = v
		} else {
			return ErrCacheMiss
		}
	default:
		// For complex types, use reflection to handle struct to pointer conversion
		destVal := reflect.ValueOf(dest)
		itemVal := reflect.ValueOf(item.value)

		// Check if dest is a pointer and we can set its value
		if destVal.Kind() == reflect.Ptr && destVal.Elem().CanSet() {
			// If the cached value type matches the pointed-to type, assign directly
			if itemVal.Type().AssignableTo(destVal.Elem().Type()) {
				destVal.Elem().Set(itemVal)
				return nil
			}
			// If the cached value is a pointer and matches the pointed-to type
			if itemVal.Kind() == reflect.Ptr && itemVal.Elem().Type().AssignableTo(destVal.Elem().Type()) {
				destVal.Elem().Set(itemVal.Elem())
				return nil
			}
		}

		return ErrCacheMiss
	}

	return nil
}

// Delete removes a value from the cache
func (m *MemoryCache) Delete(key string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.items, key)
	return nil
}

// DeletePattern removes all keys matching a pattern (simple prefix matching)
func (m *MemoryCache) DeletePattern(pattern string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Simple pattern matching - just check if key starts with pattern
	keysToDelete := make([]string, 0)
	for key := range m.items {
		if len(key) >= len(pattern) && key[:len(pattern)] == pattern {
			keysToDelete = append(keysToDelete, key)
		}
	}

	for _, key := range keysToDelete {
		delete(m.items, key)
	}

	return nil
}

// Exists checks if a key exists in the cache
func (m *MemoryCache) Exists(key string) (bool, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.items[key]
	if !exists {
		return false, nil
	}

	if item.isExpired() {
		// Remove expired item
		delete(m.items, key)
		return false, nil
	}

	return true, nil
}

// SetNX sets a value only if the key doesn't exist
func (m *MemoryCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, exists := m.items[key]
	if exists && !item.isExpired() {
		return false, nil // Key already exists
	}

	m.items[key] = &cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}

	return true, nil
}

// Increment increments a counter
func (m *MemoryCache) Increment(key string) (int64, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, exists := m.items[key]
	if !exists || item.isExpired() {
		// Initialize counter at 1
		m.items[key] = &cacheItem{
			value:      int64(1),
			expiration: time.Now().Add(time.Hour), // Default 1 hour expiration
		}
		return 1, nil
	}

	if counter, ok := item.value.(int64); ok {
		newValue := counter + 1
		item.value = newValue
		return newValue, nil
	}

	// If it's not an int64, initialize at 1
	item.value = int64(1)
	return 1, nil
}

// IncrementWithExpiry increments a counter with expiration
func (m *MemoryCache) IncrementWithExpiry(key string, expiration time.Duration) (int64, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, exists := m.items[key]
	if !exists || item.isExpired() {
		// Initialize counter at 1
		m.items[key] = &cacheItem{
			value:      int64(1),
			expiration: time.Now().Add(expiration),
		}
		return 1, nil
	}

	if counter, ok := item.value.(int64); ok {
		newValue := counter + 1
		item.value = newValue
		item.expiration = time.Now().Add(expiration) // Reset expiration
		return newValue, nil
	}

	// If it's not an int64, initialize at 1
	item.value = int64(1)
	item.expiration = time.Now().Add(expiration)
	return 1, nil
}

// Close cleans up the cache
func (m *MemoryCache) Close() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Clear all items
	m.items = make(map[string]*cacheItem)
	return nil
}

// cleanupExpired removes expired items from the cache periodically
func (m *MemoryCache) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute) // Cleanup every 5 minutes
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.mutex.Lock()
			now := time.Now()
			keysToDelete := make([]string, 0)

			for key, item := range m.items {
				if now.After(item.expiration) {
					keysToDelete = append(keysToDelete, key)
				}
			}

			for _, key := range keysToDelete {
				delete(m.items, key)
			}

			m.mutex.Unlock()
		}
	}
}

// Size returns the number of items in the cache
func (m *MemoryCache) Size() int {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	return len(m.items)
}

// Clear removes all items from the cache
func (m *MemoryCache) Clear() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.items = make(map[string]*cacheItem)
}
