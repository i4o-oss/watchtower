package cache

import (
	"time"
)

// NoOpCache implements the Cache interface but does nothing (no caching)
type NoOpCache struct{}

// NewNoOpCache creates a new no-op cache
func NewNoOpCache() *NoOpCache {
	return &NoOpCache{}
}

// Set does nothing in no-op cache
func (n *NoOpCache) Set(key string, value interface{}, expiration time.Duration) error {
	return nil
}

// Get always returns cache miss in no-op cache
func (n *NoOpCache) Get(key string, dest interface{}) error {
	return ErrCacheMiss
}

// Delete does nothing in no-op cache
func (n *NoOpCache) Delete(key string) error {
	return nil
}

// DeletePattern does nothing in no-op cache
func (n *NoOpCache) DeletePattern(pattern string) error {
	return nil
}

// Exists always returns false in no-op cache
func (n *NoOpCache) Exists(key string) (bool, error) {
	return false, nil
}

// SetNX always returns true (as if key was set) in no-op cache
func (n *NoOpCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	return true, nil
}

// Increment always returns 1 in no-op cache
func (n *NoOpCache) Increment(key string) (int64, error) {
	return 1, nil
}

// IncrementWithExpiry always returns 1 in no-op cache
func (n *NoOpCache) IncrementWithExpiry(key string, expiration time.Duration) (int64, error) {
	return 1, nil
}

// Close does nothing in no-op cache
func (n *NoOpCache) Close() error {
	return nil
}
