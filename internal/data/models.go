package data

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	Email     string    `json:"email" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"` // Don't include in JSON responses
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName sets the table name to singular form
func (User) TableName() string {
	return "user"
}

// HashPassword hashes the user's password using bcrypt
func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword checks if the provided password matches the user's hashed password
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

// CreateUser creates a new user in the database
func (db *DB) CreateUser(user *User) error {
	return db.DB.Create(user).Error
}

// GetUserByEmail retrieves a user by email
func (db *DB) GetUserByEmail(email string) (*User, error) {
	var user User
	err := db.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (db *DB) GetUserByID(id uuid.UUID) (*User, error) {
	var user User
	err := db.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UserExists checks if a user exists by email without logging "record not found" errors
func (db *DB) UserExists(email string) (bool, error) {
	var count int64
	err := db.DB.Model(&User{}).Where("email = ?", email).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetUserCount returns the total number of users in the system
func (db *DB) GetUserCount() (int64, error) {
	var count int64
	err := db.DB.Model(&User{}).Count(&count).Error
	return count, err
}

// HTTPHeaders represents JSON headers for HTTP requests
type HTTPHeaders map[string]string

// Value implements the driver.Valuer interface for database storage
func (h HTTPHeaders) Value() (driver.Value, error) {
	if h == nil {
		return "{}", nil
	}
	return json.Marshal(h)
}

// Scan implements the sql.Scanner interface for database retrieval
func (h *HTTPHeaders) Scan(value interface{}) error {
	if value == nil {
		*h = make(HTTPHeaders)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, h)
	case string:
		return json.Unmarshal([]byte(v), h)
	default:
		return errors.New("cannot scan non-string value into HTTPHeaders")
	}
}

// Endpoint represents a monitoring target
type Endpoint struct {
	ID                   uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	Name                 string      `json:"name" gorm:"not null"`
	Description          string      `json:"description"`
	URL                  string      `json:"url" gorm:"not null"`
	Method               string      `json:"method" gorm:"default:GET"`
	Headers              HTTPHeaders `json:"headers" gorm:"type:jsonb;default:'{}'"`
	Body                 string      `json:"body"`
	ExpectedStatusCode   int         `json:"expected_status_code" gorm:"default:200"`
	TimeoutSeconds       int         `json:"timeout_seconds" gorm:"default:30"`
	CheckIntervalSeconds int         `json:"check_interval_seconds" gorm:"default:300"`
	Enabled              bool        `json:"enabled" gorm:"default:true"`
	CreatedAt            time.Time   `json:"created_at"`
	UpdatedAt            time.Time   `json:"updated_at"`
}

// TableName sets the table name to singular form
func (Endpoint) TableName() string {
	return "endpoint"
}

// MonitoringLog represents a monitoring check result
type MonitoringLog struct {
	ID                 uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	EndpointID         uuid.UUID `json:"endpoint_id" gorm:"type:uuid;not null"`
	Endpoint           *Endpoint `json:"endpoint,omitempty" gorm:"foreignKey:EndpointID"`
	Timestamp          time.Time `json:"timestamp" gorm:"default:now()"`
	StatusCode         *int      `json:"status_code"`
	ResponseTimeMs     *int      `json:"response_time_ms"`
	ErrorMessage       *string   `json:"error_message"`
	Success            bool      `json:"success" gorm:"not null"`
	ResponseBodySample *string   `json:"response_body_sample"`
	CreatedAt          time.Time `json:"created_at"`
}

// TableName sets the table name to singular form
func (MonitoringLog) TableName() string {
	return "monitoring_log"
}

// Endpoint database operations
func (db *DB) CreateEndpoint(endpoint *Endpoint) error {
	return db.DB.Create(endpoint).Error
}

func (db *DB) GetEndpoint(id uuid.UUID) (*Endpoint, error) {
	var endpoint Endpoint
	err := db.DB.First(&endpoint, id).Error
	if err != nil {
		return nil, err
	}
	return &endpoint, nil
}

func (db *DB) GetEndpoints() ([]Endpoint, error) {
	var endpoints []Endpoint
	err := db.DB.Order("created_at DESC").Find(&endpoints).Error
	return endpoints, err
}

// GetEndpointsWithPagination gets endpoints with pagination and filtering
func (db *DB) GetEndpointsWithPagination(page, limit int, enabled *bool) ([]Endpoint, int64, error) {
	var endpoints []Endpoint
	var total int64

	query := db.DB.Model(&Endpoint{})

	// Apply filters
	if enabled != nil {
		query = query.Where("enabled = ?", *enabled)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&endpoints).Error

	return endpoints, total, err
}

func (db *DB) GetEnabledEndpoints() ([]Endpoint, error) {
	var endpoints []Endpoint
	err := db.DB.Where("enabled = ?", true).Find(&endpoints).Error
	return endpoints, err
}

func (db *DB) UpdateEndpoint(endpoint *Endpoint) error {
	return db.DB.Save(endpoint).Error
}

func (db *DB) DeleteEndpoint(id uuid.UUID) error {
	return db.DB.Delete(&Endpoint{}, id).Error
}

// MonitoringLog database operations
func (db *DB) CreateMonitoringLog(log *MonitoringLog) error {
	return db.DB.Create(log).Error
}

func (db *DB) GetMonitoringLogs(endpointID uuid.UUID, limit int) ([]MonitoringLog, error) {
	var logs []MonitoringLog
	query := db.DB.Where("endpoint_id = ?", endpointID).Order("timestamp DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&logs).Error
	return logs, err
}

func (db *DB) GetRecentMonitoringLogs(hours int) ([]MonitoringLog, error) {
	var logs []MonitoringLog
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
	err := db.DB.Where("timestamp > ?", cutoff).Order("timestamp DESC").Find(&logs).Error
	return logs, err
}

// GetMonitoringLogsWithPagination gets monitoring logs with proper pagination
func (db *DB) GetMonitoringLogsWithPagination(page, limit, hours int, endpointID *uuid.UUID, success *bool) ([]MonitoringLog, int64, error) {
	var logs []MonitoringLog
	var total int64

	query := db.DB.Model(&MonitoringLog{})

	// Apply time filter
	if hours > 0 {
		cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
		query = query.Where("timestamp > ?", cutoff)
	}

	// Apply endpoint filter
	if endpointID != nil {
		query = query.Where("endpoint_id = ?", *endpointID)
	}

	// Apply success filter
	if success != nil {
		query = query.Where("success = ?", *success)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Order("timestamp DESC").Offset(offset).Limit(limit).Find(&logs).Error

	return logs, total, err
}

// GetMonitoringLogsByDateRange gets monitoring logs for an endpoint within a date range
func (db *DB) GetMonitoringLogsByDateRange(endpointID uuid.UUID, startDate, endDate time.Time) ([]MonitoringLog, error) {
	var logs []MonitoringLog
	err := db.DB.Where("endpoint_id = ? AND timestamp BETWEEN ? AND ?", endpointID, startDate, endDate).
		Order("timestamp ASC").Find(&logs).Error
	return logs, err
}

// GetUptimeStats calculates uptime statistics for an endpoint over a period
func (db *DB) GetUptimeStats(endpointID uuid.UUID, days int) (float64, error) {
	cutoff := time.Now().AddDate(0, 0, -days)

	var total, successful int64

	// Count total checks
	err := db.DB.Model(&MonitoringLog{}).
		Where("endpoint_id = ? AND timestamp > ?", endpointID, cutoff).
		Count(&total).Error
	if err != nil {
		return 0, err
	}

	// Count successful checks
	err = db.DB.Model(&MonitoringLog{}).
		Where("endpoint_id = ? AND timestamp > ? AND success = true", endpointID, cutoff).
		Count(&successful).Error
	if err != nil {
		return 0, err
	}

	if total == 0 {
		return 100.0, nil
	}

	return (float64(successful) / float64(total)) * 100.0, nil
}

// GetLatestMonitoringStatus gets the latest monitoring status for all endpoints
func (db *DB) GetLatestMonitoringStatus() (map[uuid.UUID]MonitoringLog, error) {
	var logs []MonitoringLog

	// Get the latest log for each endpoint
	err := db.DB.Raw(`
		SELECT DISTINCT ON (endpoint_id) endpoint_id, id, timestamp, status_code, 
		       response_time_ms, error_message, success, response_body_sample, created_at
		FROM monitoring_log
		ORDER BY endpoint_id, timestamp DESC
	`).Scan(&logs).Error

	if err != nil {
		return nil, err
	}

	result := make(map[uuid.UUID]MonitoringLog)
	for _, log := range logs {
		result[log.EndpointID] = log
	}

	return result, nil
}

// Incident represents a system incident
type Incident struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	Title       string     `json:"title" gorm:"not null"`
	Description string     `json:"description"`
	Severity    string     `json:"severity" gorm:"default:medium"`
	Status      string     `json:"status" gorm:"default:open"`
	StartTime   time.Time  `json:"start_time" gorm:"default:now()"`
	EndTime     *time.Time `json:"end_time"`
	CreatedBy   *uuid.UUID `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relationships
	Creator           *User              `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
	EndpointIncidents []EndpointIncident `json:"endpoint_incidents,omitempty" gorm:"foreignKey:IncidentID"`
}

// TableName sets the table name to singular form
func (Incident) TableName() string {
	return "incident"
}

// EndpointIncident represents the junction table linking incidents to endpoints
type EndpointIncident struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	EndpointID    uuid.UUID  `json:"endpoint_id" gorm:"type:uuid;not null"`
	IncidentID    uuid.UUID  `json:"incident_id" gorm:"type:uuid;not null"`
	AffectedStart time.Time  `json:"affected_start" gorm:"default:now()"`
	AffectedEnd   *time.Time `json:"affected_end"`
	CreatedAt     time.Time  `json:"created_at"`

	// Relationships
	Endpoint *Endpoint `json:"endpoint,omitempty" gorm:"foreignKey:EndpointID"`
	Incident *Incident `json:"incident,omitempty" gorm:"foreignKey:IncidentID"`
}

// TableName sets the table name to singular form
func (EndpointIncident) TableName() string {
	return "endpoint_incident"
}

// Incident database operations
func (db *DB) CreateIncident(incident *Incident) error {
	return db.DB.Create(incident).Error
}

func (db *DB) GetIncident(id uuid.UUID) (*Incident, error) {
	var incident Incident
	err := db.DB.Preload("Creator").Preload("EndpointIncidents.Endpoint").First(&incident, id).Error
	if err != nil {
		return nil, err
	}
	return &incident, nil
}

func (db *DB) GetIncidents() ([]Incident, error) {
	var incidents []Incident
	err := db.DB.Preload("Creator").Order("created_at DESC").Find(&incidents).Error
	return incidents, err
}

func (db *DB) GetOpenIncidents() ([]Incident, error) {
	var incidents []Incident
	err := db.DB.Where("status != ?", "resolved").Preload("Creator").Order("created_at DESC").Find(&incidents).Error
	return incidents, err
}

// GetIncidentsWithPagination gets incidents with pagination and filtering
func (db *DB) GetIncidentsWithPagination(page, limit int, status string, severity string) ([]Incident, int64, error) {
	var incidents []Incident
	var total int64

	query := db.DB.Model(&Incident{})

	// Apply filters
	if status != "" && status != "all" {
		if status == "open" {
			query = query.Where("status != ?", "resolved")
		} else {
			query = query.Where("status = ?", status)
		}
	}

	if severity != "" && severity != "all" {
		query = query.Where("severity = ?", severity)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination with preloading
	offset := (page - 1) * limit
	err := query.Preload("Creator").Order("created_at DESC").Offset(offset).Limit(limit).Find(&incidents).Error

	return incidents, total, err
}

func (db *DB) UpdateIncident(incident *Incident) error {
	return db.DB.Save(incident).Error
}

func (db *DB) DeleteIncident(id uuid.UUID) error {
	return db.DB.Delete(&Incident{}, id).Error
}

// EndpointIncident database operations
func (db *DB) CreateEndpointIncident(endpointIncident *EndpointIncident) error {
	return db.DB.Create(endpointIncident).Error
}

func (db *DB) GetEndpointIncidents(incidentID uuid.UUID) ([]EndpointIncident, error) {
	var endpointIncidents []EndpointIncident
	err := db.DB.Where("incident_id = ?", incidentID).Preload("Endpoint").Find(&endpointIncidents).Error
	return endpointIncidents, err
}

func (db *DB) GetIncidentsByEndpoint(endpointID uuid.UUID) ([]Incident, error) {
	var incidents []Incident
	err := db.DB.Joins("JOIN endpoint_incident ON incident.id = endpoint_incident.incident_id").
		Where("endpoint_incident.endpoint_id = ?", endpointID).
		Preload("Creator").
		Order("incident.created_at DESC").
		Find(&incidents).Error
	return incidents, err
}

func (db *DB) UpdateEndpointIncident(endpointIncident *EndpointIncident) error {
	return db.DB.Save(endpointIncident).Error
}

func (db *DB) DeleteEndpointIncident(endpointID uuid.UUID, incidentID uuid.UUID) error {
	return db.DB.Where("endpoint_id = ? AND incident_id = ?", endpointID, incidentID).Delete(&EndpointIncident{}).Error
}

// IncidentTimeline represents a timeline entry for incident history
type IncidentTimeline struct {
	ID         uuid.UUID              `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	IncidentID uuid.UUID              `json:"incident_id" gorm:"type:uuid;not null"`
	UserID     *uuid.UUID             `json:"user_id" gorm:"type:uuid"`
	EventType  string                 `json:"event_type" gorm:"not null"`
	OldValue   *string                `json:"old_value"`
	NewValue   *string                `json:"new_value"`
	Message    *string                `json:"message"`
	Metadata   map[string]interface{} `json:"metadata" gorm:"type:jsonb;default:'{}'"`
	CreatedAt  time.Time              `json:"created_at"`

	// Relationships
	Incident *Incident `json:"incident,omitempty" gorm:"foreignKey:IncidentID"`
	User     *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName sets the table name to singular form
func (IncidentTimeline) TableName() string {
	return "incident_timeline"
}

// IncidentTimeline database operations
func (db *DB) CreateIncidentTimeline(timeline *IncidentTimeline) error {
	return db.DB.Create(timeline).Error
}

func (db *DB) GetIncidentTimeline(incidentID uuid.UUID) ([]IncidentTimeline, error) {
	var timeline []IncidentTimeline
	err := db.DB.Where("incident_id = ?", incidentID).
		Preload("User").
		Order("created_at ASC").
		Find(&timeline).Error
	return timeline, err
}

func (db *DB) GetRecentIncidentActivity(limit int) ([]IncidentTimeline, error) {
	var timeline []IncidentTimeline
	query := db.DB.Preload("Incident").Preload("User").Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&timeline).Error
	return timeline, err
}

// Settings represents application settings
type Settings struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	SiteName    string    `json:"site_name" gorm:"not null;default:'Watchtower'"`
	Description string    `json:"description"`
	Domain      string    `json:"domain"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName sets the table name to singular form
func (Settings) TableName() string {
	return "settings"
}

// GetSettings retrieves the application settings (should only be one record)
func (db *DB) GetSettings() (*Settings, error) {
	var settings Settings
	err := db.DB.First(&settings).Error
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

// CreateSettings creates initial settings record
func (db *DB) CreateSettings(settings *Settings) error {
	return db.DB.Create(settings).Error
}

// UpdateSettings updates the settings record
func (db *DB) UpdateSettings(settings *Settings) error {
	return db.DB.Save(settings).Error
}

// UpdateAdminCredentials updates admin email and password
func (db *DB) UpdateAdminCredentials(adminEmail, currentPassword, newPassword string) error {
	// First, verify the current password
	user, err := db.GetUserByEmail(adminEmail)
	if err != nil {
		// Try to get the admin user by finding the first user (assuming single admin)
		var firstUser User
		if err := db.DB.First(&firstUser).Error; err != nil {
			return err
		}
		user = &firstUser
	}

	// Check current password
	if err := user.CheckPassword(currentPassword); err != nil {
		return errors.New("current password is incorrect")
	}

	// Update email if provided and different
	if adminEmail != "" && adminEmail != user.Email {
		user.Email = adminEmail
	}

	// Update password if provided
	if newPassword != "" {
		if err := user.HashPassword(newPassword); err != nil {
			return err
		}
	}

	return db.DB.Save(user).Error
}
