# Watchtower - Status Monitoring Application
## Product Requirements Document

### 1. Overview

Watchtower is a comprehensive status monitoring application that allows users to monitor multiple endpoints, track uptime, and display service status to visitors. The application combines real-time monitoring with incident management and provides both admin and public-facing interfaces.

### 2. Core Features

#### 2.1 Endpoint Monitoring Configuration
- Add multiple endpoints for monitoring
- Configure HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Set custom monitoring intervals (1min, 5min, 15min, 30min, 1hr, 6hr, 12hr, 24hr)
- Add custom request headers (key-value pairs)
- Configure request body with JSON editor
- Set endpoint name and description
- Enable/disable monitoring for individual endpoints
- Configure expected response codes and timeout values
- Set up alert thresholds and notification preferences

#### 2.2 Monitoring Engine
- Continuous background monitoring based on configured intervals
- HTTP request execution with custom headers and body
- Response time tracking and logging
- Status code validation and error handling
- Retry logic for failed requests
- Monitoring history retention (90+ days)
- Real-time status updates
- Performance metrics collection (response time, availability percentage)

#### 2.3 Data Storage and Logging
- Store monitoring results with timestamps
- Track response times, status codes, and error messages
- Maintain uptime/downtime events
- Store incident reports and metadata
- Historical data retention for trend analysis
- Efficient data structure for quick queries and visualization

#### 2.4 Public Status Page (Home Page)
- Display current status of all monitored endpoints
- Show real-time status indicators (up/down/degraded)
- 90-day uptime graphs for each endpoint
- Interactive daily breakdown on graph click
- Display incident reports for selected dates
- Responsive design for mobile and desktop
- Auto-refresh functionality
- Service status summary dashboard

#### 2.5 Admin Dashboard
- Secure authentication for admin access
- Endpoint management interface (CRUD operations)
- Monitoring configuration panel
- Incident report creation and management
- Historical data visualization and analytics
- System health monitoring
- User management (if multi-admin support needed)
- Notification settings and alert configuration

#### 2.6 Incident Management
- Create incident reports with title, description, and severity
- Assign incidents to specific endpoints and date ranges
- Publish/unpublish incident reports
- Incident status tracking (investigating, identified, monitoring, resolved)
- Automatic incident detection based on monitoring failures
- Manual incident creation for maintenance windows
- Incident timeline and update history

### 3. Technical Architecture

#### 3.1 Backend (Golang)
- RESTful API endpoints for monitoring configuration
- Background goroutines for monitoring execution
- Database integration for data persistence
- Authentication and authorization middleware
- WebSocket support for real-time updates
- Structured logging and error handling
- Configuration management
- Health check endpoints

#### 3.2 Frontend (React Router v7)
- SPA mode with client-side routing
- Responsive UI components
- Real-time status updates via WebSocket
- Interactive charts and graphs
- Form validation and error handling using TanStack Forms
- Admin authentication flow
- JSON editor for request body configuration
- Progressive web app features
- Type-safe form validation with TanStack Forms integration

#### 3.3 Database Schema
- Endpoints table (id, name, description, url, method, headers, body, interval, enabled, created_at, updated_at)
- Monitoring_logs table (id, endpoint_id, timestamp, status_code, response_time, error_message, success)
- Incidents table (id, title, description, severity, status, start_time, end_time, created_at, updated_at)
- Endpoint_incidents table (endpoint_id, incident_id, affected_start, affected_end)
- Users table (id, username, password_hash, role, created_at, updated_at)

### 4. User Stories

#### 4.1 Admin User Stories
- As an admin, I want to add new endpoints to monitor so that I can track their availability
- As an admin, I want to configure monitoring intervals so that I can balance monitoring frequency with system resources
- As an admin, I want to set custom headers and request bodies so that I can monitor authenticated or complex endpoints
- As an admin, I want to create incident reports so that I can communicate issues to users
- As an admin, I want to view historical monitoring data so that I can analyze trends and patterns
- As an admin, I want to receive alerts when services go down so that I can respond quickly

#### 4.2 Public User Stories
- As a visitor, I want to see the current status of all services so that I know if they're available
- As a visitor, I want to view uptime history so that I can understand service reliability
- As a visitor, I want to see incident reports so that I understand what issues occurred and when
- As a visitor, I want to access the status page from any device so that I can check status on the go
- As a visitor, I want real-time updates so that I don't need to refresh the page manually

### 5. API Endpoints

#### 5.1 Public API
- GET /api/status - Get current status of all endpoints
- GET /api/uptime/:endpoint_id - Get uptime data for specific endpoint
- GET /api/incidents - Get published incident reports
- GET /api/incidents/:date - Get incidents for specific date
- WebSocket /ws/status - Real-time status updates

#### 5.2 Admin API
- POST /api/auth/login - Admin authentication
- POST /api/auth/logout - Admin logout
- GET /api/admin/endpoints - List all endpoints
- POST /api/admin/endpoints - Create new endpoint
- PUT /api/admin/endpoints/:id - Update endpoint
- DELETE /api/admin/endpoints/:id - Delete endpoint
- GET /api/admin/monitoring-logs - Get monitoring history
- POST /api/admin/incidents - Create incident report
- PUT /api/admin/incidents/:id - Update incident report
- DELETE /api/admin/incidents/:id - Delete incident report

### 6. UI/UX Requirements

#### 6.1 Status Page Design
- Clean, professional appearance suitable for public viewing
- Color-coded status indicators (green=up, red=down, yellow=degraded)
- Responsive grid layout for multiple endpoints
- Interactive uptime graphs with hover details
- Incident popup/modal for detailed information
- Auto-refresh with visual indicators
- Loading states and error handling

#### 6.2 Admin Dashboard Design
- Secure login form with validation
- Tabbed interface for different admin functions
- Form-based endpoint configuration with validation
- JSON editor with syntax highlighting
- Data tables with sorting and pagination
- Chart visualizations for analytics
- Confirmation dialogs for destructive actions
- Responsive design for mobile administration

#### 6.3 Accessibility
- ARIA labels and semantic HTML
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management for interactive elements

### 7. Performance Requirements

#### 7.1 Monitoring Performance
- Support for 100+ simultaneous endpoint monitoring
- Configurable monitoring intervals from 1 minute to 24 hours
- Response time tracking with millisecond precision
- Efficient database queries for historical data
- Background processing without blocking UI operations

#### 7.2 Application Performance
- Status page load time < 2 seconds
- Real-time updates with < 1 second latency
- Uptime graph rendering for 90 days of data
- Efficient data pagination for large datasets
- Optimized bundle size for fast loading

### 8. Security Requirements

#### 8.1 Authentication
- Secure admin authentication with password hashing
- Session management with secure tokens
- Automatic session expiration
- Protection against brute force attacks
- Secure password reset functionality
- **Admin-Only Registration**: Single admin user registration with automatic lockdown after first user signup

#### 8.2 Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection for admin actions
- Secure handling of sensitive configuration data

### 9. Deployment and Operations

#### 9.1 Configuration
- Environment-based configuration management
- Database connection configuration
- Monitoring interval limits and defaults
- Alert notification settings
- Public/private endpoint access controls

#### 9.2 Monitoring and Maintenance
- Application health monitoring
- Database performance monitoring
- Log management and rotation
- Backup and recovery procedures
- Update and deployment procedures

### 10. Notification System

#### 10.1 Notification Channels
- **Email Notifications**: SMTP-based email alerts for downtime and incidents
- **Slack Integration**: Webhook-based notifications to Slack channels
- **Discord Integration**: Webhook-based notifications to Discord servers
- **Webhook Notifications**: Generic HTTP POST callbacks for custom integrations
- **Multiple Destinations**: Admins can configure multiple notification channels per rule

#### 10.2 Notification Rules and Triggers
- **Downtime Alerts**: Notifications when endpoints go down or become unreachable
- **Incident Notifications**: Alerts when incidents are created, updated, or resolved
- **Recovery Notifications**: Alerts when services return to normal operation
- **Threshold-Based Alerts**: Notifications based on response time thresholds
- **Maintenance Window Notifications**: Alerts for scheduled maintenance periods
- **Escalation Rules**: Progressive notification escalation based on duration

#### 10.3 Notification Configuration
- **Channel Management**: CRUD operations for notification channels
- **Rule Configuration**: Mapping of endpoints to notification channels
- **Notification Preferences**: Per-user and per-endpoint notification settings
- **Template Customization**: Customizable notification message templates
- **Delivery Scheduling**: Time-based notification delivery preferences
- **Notification History**: Logs of all sent notifications with delivery status

#### 10.4 Admin Notification Features
- **Channel Setup**: Configure email SMTP, Slack webhooks, Discord webhooks
- **Multi-Channel Support**: Send notifications to multiple channels simultaneously
- **Channel Testing**: Test notification delivery before activation
- **Notification Templates**: Pre-defined and custom message templates
- **Delivery Status**: Track notification delivery success/failure
- **Notification Logs**: Historical record of all notifications sent

#### 10.5 User Notification Features (Future)
- **Public Subscriptions**: Allow status page visitors to subscribe to notifications
- **Email Subscriptions**: Public email subscription for incident updates
- **Notification Preferences**: User-specific notification preferences
- **Subscription Management**: Self-service subscription management interface
- **Unsubscribe Functionality**: Easy unsubscribe from notifications

#### 10.6 Technical Implementation
- **Notification Service**: Pluggable notification provider architecture
- **Queue System**: Asynchronous notification processing with retry logic
- **Rate Limiting**: Prevent notification spam with configurable limits
- **Template Engine**: Dynamic message generation with variable substitution
- **Delivery Tracking**: Comprehensive delivery status monitoring
- **Provider Abstraction**: Easy addition of new notification providers

#### 10.7 Database Schema Extensions
- **notification_channels**: Store notification channel configurations
- **notification_rules**: Define notification rules and endpoint mappings
- **notification_logs**: Track notification delivery history and status
- **notification_templates**: Store customizable notification templates
- **user_notification_preferences**: Per-user notification settings

#### 10.8 API Endpoints for Notifications
- **Admin API**: Full CRUD for notification channels and rules
- **Test API**: Endpoints for testing notification delivery
- **Logs API**: Access to notification delivery history
- **Templates API**: Manage notification message templates
- **Preferences API**: User notification preference management

#### 10.9 Security and Privacy
- **Secure Credentials**: Encrypted storage of notification provider credentials
- **Access Control**: Role-based access to notification configuration
- **Data Privacy**: Compliance with privacy regulations for user data
- **Audit Logging**: Comprehensive logging of notification configuration changes
- **Webhook Security**: Secure webhook endpoint verification

#### 10.10 Performance and Reliability
- **Async Processing**: Non-blocking notification delivery
- **Retry Logic**: Automatic retry for failed notifications
- **Fallback Mechanisms**: Alternative notification methods on provider failure
- **Batch Processing**: Efficient processing of multiple notifications
- **Monitoring**: Health monitoring of notification delivery systems

### 11. Future Enhancements

#### 11.1 Advanced Features
- Multi-region monitoring
- API monitoring with response validation
- Certificate expiration monitoring
- Maintenance window scheduling
- Public API for status integration
- Custom branding and white-label options
- Advanced analytics and reporting
- Team collaboration features
- Integration with external monitoring tools

#### 10.2 Scalability
- Horizontal scaling for monitoring workers
- Database sharding for large datasets
- CDN integration for global performance
- Caching strategies for improved performance
- Load balancing for high availability

### 11. Success Metrics

#### 11.1 Technical Metrics
- Monitoring accuracy (>99.9% successful checks)
- Status page availability (>99.9% uptime)
- Response time for status queries (<500ms)
- Data retention compliance (90+ days)
- Alert response time (<1 minute)

#### 11.2 User Experience Metrics
- Admin task completion rate
- Status page bounce rate
- Mobile responsiveness score
- Accessibility compliance score
- User satisfaction ratings

### 12. Acceptance Criteria

#### 12.1 Core Functionality
- All endpoint monitoring configurations work as specified
- Status page displays accurate real-time information
- Uptime graphs show correct historical data
- Incident reports display properly on status page
- Admin dashboard allows full CRUD operations
- Authentication system works securely

#### 12.2 Performance and Reliability
- Application handles concurrent monitoring without performance degradation
- Database queries complete within acceptable time limits
- UI remains responsive during data loading
- Error handling prevents system crashes
- Data integrity maintained across all operations

### 13. Form Management System

#### 13.1 TanStack Forms Integration
- **Form Library**: TanStack Forms v1.14.1 for type-safe form management
- **React Router Integration**: Seamless integration with React Router v7 clientLoader/clientAction
- **Form Validation**: Real-time client-side validation with comprehensive error handling
- **Form State Management**: Centralized form state with proper loading states and error handling
- **Type Safety**: Full TypeScript support with type-safe form data and validation

#### 13.2 Form Components
- **Login Form**: Email/password authentication with validation
- **Registration Form**: User registration with email validation and password requirements
- **Endpoint Forms**: Complex forms for creating and editing monitoring endpoints
- **Incident Forms**: Forms for creating and managing system incidents
- **Notification Channel Forms**: Multi-tab forms for configuring email, Slack, Discord, and webhook notifications
- **Form Utilities**: Reusable validation functions and form field components

#### 13.3 Form Validation
- **Built-in Validators**: Email, URL, number, length, and required field validation
- **Custom Validators**: Domain-specific validation for endpoints and notification settings
- **Real-time Validation**: Immediate feedback on form field changes
- **Server-side Integration**: Proper handling of server validation errors
- **Error Display**: Consistent error message display across all forms

#### 13.4 Form Features
- **Auto-save**: Automatic form state preservation during navigation
- **Loading States**: Visual feedback during form submission
- **Success Notifications**: Toast notifications for successful form submissions
- **Error Recovery**: Graceful handling of network and validation errors
- **JSON Editing**: Specialized JSON editors for headers and request bodies
- **Conditional Fields**: Dynamic form fields based on user selections

### 14. Admin-Only Registration System

#### 14.1 First-Time Setup Flow
- **Empty Database Detection**: Check if any users exist in the database on application startup
- **Home Route Redirect**: When no users exist, redirect visitors from home route (`/`) to registration page
- **Initial Admin Registration**: Allow first user to register as the primary administrator
- **Automatic Lockdown**: After first successful registration, disable all registration functionality

#### 14.2 Registration Protection
- **Post-Registration Blocking**: Block all registration attempts after initial admin is created
- **UI Registration Block**: Hide/disable registration forms and links after first user signup
- **API Registration Block**: Return appropriate error responses (403 Forbidden) for registration API calls
- **Route Protection**: Prevent access to registration routes and redirect to login page
- **Error Messaging**: Provide clear error messages explaining registration is disabled

#### 14.3 Security Features
- **Registration Status Tracking**: Track registration status in application state/database
- **Anti-Takeover Protection**: Prevent unauthorized users from gaining admin access
- **Session Validation**: Ensure only legitimate admin sessions can access admin features
- **Audit Logging**: Log all registration attempts for security monitoring

#### 14.4 Technical Implementation
- **Database Check**: Query users table on application startup to determine registration status
- **Middleware Protection**: Server-side middleware to block registration endpoints
- **Frontend State**: Frontend state management to control registration UI visibility
- **Route Guards**: Client-side route guards to redirect unauthorized registration attempts
- **Error Handling**: Graceful error handling for blocked registration attempts

#### 14.5 User Stories
- **As a first-time deployer**, I want to be automatically directed to registration when no admin exists, so I can quickly set up the application
- **As an admin**, I want registration to be automatically disabled after I sign up, so unauthorized users cannot create admin accounts
- **As a potential attacker**, I should receive clear error messages when attempting to register after the first admin is created, preventing confusion while maintaining security
- **As an admin**, I want to see that registration is permanently disabled in the UI, so I know the system is secure

#### 14.6 API Endpoints
- **GET /api/auth/registration-status** - Check if registration is currently allowed
- **POST /api/auth/register** - Register new user (blocked after first user)
- **Middleware**: Authentication middleware to check registration status on relevant routes

#### 14.7 Database Schema Updates
- **Registration tracking**: Add system configuration table or use user count to track registration status
- **Admin role tracking**: Ensure first registered user receives admin privileges
- **Audit trail**: Optional logging table for registration attempts and security events

This PRD provides a comprehensive foundation for developing the Watchtower status monitoring application, covering all requested features and technical requirements while maintaining scalability and security standards.