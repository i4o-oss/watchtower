package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
	ctx    context.Context
}

type CacheConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// NewRedisCache creates a new Redis cache client
func NewRedisCache(config CacheConfig) (*RedisCache, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", config.Host, config.Port),
		Password: config.Password,
		DB:       config.DB,
	})

	ctx := context.Background()

	// Test the connection
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Successfully connected to Redis cache")

	return &RedisCache{
		client: rdb,
		ctx:    ctx,
	}, nil
}

// Set stores a value in cache with expiration
func (r *RedisCache) Set(key string, value interface{}, expiration time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal cache value: %w", err)
	}

	return r.client.Set(r.ctx, key, jsonData, expiration).Err()
}

// Get retrieves a value from cache
func (r *RedisCache) Get(key string, dest interface{}) error {
	val, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get cache value: %w", err)
	}

	return json.Unmarshal([]byte(val), dest)
}

// Delete removes a key from cache
func (r *RedisCache) Delete(key string) error {
	return r.client.Del(r.ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func (r *RedisCache) DeletePattern(pattern string) error {
	keys, err := r.client.Keys(r.ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return r.client.Del(r.ctx, keys...).Err()
	}

	return nil
}

// Exists checks if a key exists
func (r *RedisCache) Exists(key string) (bool, error) {
	count, err := r.client.Exists(r.ctx, key).Result()
	return count > 0, err
}

// SetNX sets a key only if it doesn't exist (for locking)
func (r *RedisCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal cache value: %w", err)
	}

	return r.client.SetNX(r.ctx, key, jsonData, expiration).Result()
}

// Increment atomically increments a counter
func (r *RedisCache) Increment(key string) (int64, error) {
	return r.client.Incr(r.ctx, key).Result()
}

// IncrementWithExpiry increments a counter and sets expiry if it's a new key
func (r *RedisCache) IncrementWithExpiry(key string, expiration time.Duration) (int64, error) {
	pipe := r.client.Pipeline()
	incr := pipe.Incr(r.ctx, key)
	pipe.Expire(r.ctx, key, expiration)

	_, err := pipe.Exec(r.ctx)
	if err != nil {
		return 0, err
	}

	return incr.Val(), nil
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}

// GetClient returns the underlying Redis client for advanced operations
func (r *RedisCache) GetClient() *redis.Client {
	return r.client
}

// FlushAll clears all cache (use with caution)
func (r *RedisCache) FlushAll() error {
	return r.client.FlushAll(r.ctx).Err()
}
