package providers

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log/slog"
	"net/smtp"
	"strings"
	"time"

	"github.com/i4o-oss/watchtower/internal/notification"
)

// EmailProvider implements notification.NotificationProvider for email notifications
type EmailProvider struct {
	enabled   bool
	smtpHost  string
	smtpPort  string
	username  string
	password  string
	fromEmail string
	fromName  string
	toEmails  []string
	logger    *slog.Logger
}

// EmailConfig contains configuration for the email provider
type EmailConfig struct {
	SMTPHost  string   `json:"smtp_host"`
	SMTPPort  string   `json:"smtp_port"`
	Username  string   `json:"username"`
	Password  string   `json:"password"`
	FromEmail string   `json:"from_email"`
	FromName  string   `json:"from_name"`
	ToEmails  []string `json:"to_emails"`
}

// NewEmailProvider creates a new email notification provider
func NewEmailProvider(logger *slog.Logger) *EmailProvider {
	if logger == nil {
		logger = slog.Default()
	}

	return &EmailProvider{
		enabled: false,
		logger:  logger,
	}
}

// GetType returns the provider type
func (e *EmailProvider) GetType() notification.ProviderType {
	return notification.ProviderTypeEmail
}

// IsEnabled returns whether this provider is enabled
func (e *EmailProvider) IsEnabled() bool {
	return e.enabled
}

// Configure sets up the provider with the given configuration
func (e *EmailProvider) Configure(config notification.ProviderConfig) error {
	if config.Type != notification.ProviderTypeEmail {
		return fmt.Errorf("invalid provider type: expected %s, got %s", notification.ProviderTypeEmail, config.Type)
	}

	// Extract email configuration from settings
	smtpHost, ok := config.Settings["smtp_host"].(string)
	if !ok || smtpHost == "" {
		return fmt.Errorf("smtp_host is required")
	}

	smtpPort, ok := config.Settings["smtp_port"].(string)
	if !ok || smtpPort == "" {
		return fmt.Errorf("smtp_port is required")
	}

	username, ok := config.Settings["username"].(string)
	if !ok || username == "" {
		return fmt.Errorf("username is required")
	}

	password, ok := config.Settings["password"].(string)
	if !ok || password == "" {
		return fmt.Errorf("password is required")
	}

	fromEmail, ok := config.Settings["from_email"].(string)
	if !ok || fromEmail == "" {
		return fmt.Errorf("from_email is required")
	}

	fromName, ok := config.Settings["from_name"].(string)
	if !ok || fromName == "" {
		fromName = "Watchtower"
	}

	toEmailsInterface, ok := config.Settings["to_emails"]
	if !ok {
		return fmt.Errorf("to_emails is required")
	}

	var toEmails []string
	switch v := toEmailsInterface.(type) {
	case []string:
		toEmails = v
	case []interface{}:
		for _, email := range v {
			if emailStr, ok := email.(string); ok {
				toEmails = append(toEmails, emailStr)
			}
		}
	default:
		return fmt.Errorf("to_emails must be an array of strings")
	}

	if len(toEmails) == 0 {
		return fmt.Errorf("at least one email address is required in to_emails")
	}

	e.smtpHost = smtpHost
	e.smtpPort = smtpPort
	e.username = username
	e.password = password
	e.fromEmail = fromEmail
	e.fromName = fromName
	e.toEmails = toEmails
	e.enabled = config.Enabled

	e.logger.Info("Email provider configured",
		"smtp_host", smtpHost,
		"smtp_port", smtpPort,
		"from_email", fromEmail,
		"to_emails_count", len(toEmails),
		"enabled", e.enabled)

	return nil
}

// SendNotification sends an email notification
func (e *EmailProvider) SendNotification(ctx context.Context, data notification.NotificationData) notification.DeliveryResult {
	if !e.enabled {
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("email provider is disabled"),
			Timestamp: time.Now(),
			Details:   "Provider disabled",
		}
	}

	// Generate email content
	subject := e.generateSubject(data)
	htmlBody, textBody, err := e.generateEmailBody(data)
	if err != nil {
		return notification.DeliveryResult{
			Success:   false,
			Error:     fmt.Errorf("failed to generate email body: %w", err),
			Timestamp: time.Now(),
			Details:   "Email template generation failed",
		}
	}

	// Send email to all recipients
	for _, toEmail := range e.toEmails {
		err = e.sendEmail(toEmail, subject, htmlBody, textBody)
		if err != nil {
			e.logger.Error("Failed to send email",
				"to", toEmail,
				"subject", subject,
				"error", err)
			return notification.DeliveryResult{
				Success:   false,
				Error:     fmt.Errorf("failed to send email to %s: %w", toEmail, err),
				Timestamp: time.Now(),
				Details:   fmt.Sprintf("SMTP send failed: %s", err.Error()),
			}
		}
	}

	e.logger.Info("Email notification sent successfully",
		"recipients", len(e.toEmails),
		"subject", subject,
		"type", data.Type)

	return notification.DeliveryResult{
		Success:   true,
		Timestamp: time.Now(),
		Details:   fmt.Sprintf("Email sent to %d recipients", len(e.toEmails)),
	}
}

// TestConnection tests if the provider is properly configured and can send emails
func (e *EmailProvider) TestConnection(ctx context.Context) error {
	if !e.enabled {
		return fmt.Errorf("email provider is disabled")
	}

	// Test SMTP connection
	auth := smtp.PlainAuth("", e.username, e.password, e.smtpHost)
	addr := fmt.Sprintf("%s:%s", e.smtpHost, e.smtpPort)

	// Try to connect and authenticate
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	return nil
}

// sendEmail sends an email using SMTP
func (e *EmailProvider) sendEmail(to, subject, htmlBody, textBody string) error {
	auth := smtp.PlainAuth("", e.username, e.password, e.smtpHost)
	addr := fmt.Sprintf("%s:%s", e.smtpHost, e.smtpPort)

	// Create email message
	msg := e.buildEmailMessage(to, subject, htmlBody, textBody)

	// Send email
	err := smtp.SendMail(addr, auth, e.fromEmail, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("SMTP send failed: %w", err)
	}

	return nil
}

// buildEmailMessage builds the raw email message
func (e *EmailProvider) buildEmailMessage(to, subject, htmlBody, textBody string) string {
	var msg bytes.Buffer

	// Headers
	msg.WriteString(fmt.Sprintf("From: %s <%s>\r\n", e.fromName, e.fromEmail))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: multipart/alternative; boundary=\"boundary\"\r\n")
	msg.WriteString("\r\n")

	// Text version
	msg.WriteString("--boundary\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(textBody)
	msg.WriteString("\r\n")

	// HTML version
	msg.WriteString("--boundary\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)
	msg.WriteString("\r\n")

	msg.WriteString("--boundary--\r\n")

	return msg.String()
}

// generateSubject generates the email subject based on notification data
func (e *EmailProvider) generateSubject(data notification.NotificationData) string {
	switch data.Type {
	case notification.NotificationTypeEndpointDown:
		return fmt.Sprintf("🔴 Alert: %s is DOWN", data.Title)
	case notification.NotificationTypeEndpointUp:
		return fmt.Sprintf("🟢 Recovery: %s is UP", data.Title)
	case notification.NotificationTypeIncidentCreated:
		return fmt.Sprintf("🚨 New Incident: %s", data.Title)
	case notification.NotificationTypeIncidentUpdated:
		return fmt.Sprintf("📋 Incident Update: %s", data.Title)
	case notification.NotificationTypeIncidentResolved:
		return fmt.Sprintf("✅ Incident Resolved: %s", data.Title)
	default:
		return fmt.Sprintf("📢 Notification: %s", data.Title)
	}
}

// generateEmailBody generates both HTML and text email bodies
func (e *EmailProvider) generateEmailBody(data notification.NotificationData) (string, string, error) {
	// Generate HTML body
	htmlBody, err := e.generateHTMLBody(data)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate HTML body: %w", err)
	}

	// Generate text body
	textBody := e.generateTextBody(data)

	return htmlBody, textBody, nil
}

// generateHTMLBody generates HTML email body
func (e *EmailProvider) generateHTMLBody(data notification.NotificationData) (string, error) {
	htmlTemplate := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{.Title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { padding: 20px; color: white; }
        .header-down { background-color: #dc3545; }
        .header-up { background-color: #28a745; }
        .header-incident { background-color: #dc3545; }
        .header-incident-update { background-color: #ffc107; color: #212529; }
        .header-incident-resolved { background-color: #28a745; }
        .header-default { background-color: #6c757d; }
        .content { padding: 20px; }
        .footer { padding: 15px 20px; background-color: #f8f9fa; font-size: 12px; color: #6c757d; }
        .metadata { margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 14px; }
        .timestamp { font-weight: bold; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header {{.HeaderClass}}">
            <h1>{{.Icon}} {{.Title}}</h1>
        </div>
        <div class="content">
            <p>{{.Message}}</p>
            {{if .URL}}
            <p><strong>URL:</strong> <a href="{{.URL}}">{{.URL}}</a></p>
            {{end}}
            {{if .Severity}}
            <p><strong>Severity:</strong> {{.Severity}}</p>
            {{end}}
            <div class="metadata">
                <p class="timestamp">Time: {{.FormattedTime}}</p>
                {{if .EndpointID}}
                <p>Endpoint ID: {{.EndpointID}}</p>
                {{end}}
                {{if .IncidentID}}
                <p>Incident ID: {{.IncidentID}}</p>
                {{end}}
            </div>
        </div>
        <div class="footer">
            <p>This notification was sent by Watchtower monitoring system.</p>
        </div>
    </div>
</body>
</html>`

	templateData := e.buildTemplateData(data)

	tmpl, err := template.New("email").Parse(htmlTemplate)
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML template: %w", err)
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, templateData)
	if err != nil {
		return "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	return buf.String(), nil
}

// generateTextBody generates plain text email body
func (e *EmailProvider) generateTextBody(data notification.NotificationData) string {
	var buf strings.Builder

	// Title
	buf.WriteString(fmt.Sprintf("%s %s\n", e.getIconText(data.Type), data.Title))
	buf.WriteString(strings.Repeat("=", len(data.Title)+4))
	buf.WriteString("\n\n")

	// Message
	buf.WriteString(data.Message)
	buf.WriteString("\n\n")

	// URL
	if data.URL != "" {
		buf.WriteString(fmt.Sprintf("URL: %s\n", data.URL))
	}

	// Severity
	if data.Severity != "" {
		buf.WriteString(fmt.Sprintf("Severity: %s\n", data.Severity))
	}

	buf.WriteString("\n")

	// Metadata
	buf.WriteString("Details:\n")
	buf.WriteString(fmt.Sprintf("Time: %s\n", data.Timestamp.Format("2006-01-02 15:04:05 UTC")))

	if data.EndpointID != nil {
		buf.WriteString(fmt.Sprintf("Endpoint ID: %d\n", *data.EndpointID))
	}

	if data.IncidentID != nil {
		buf.WriteString(fmt.Sprintf("Incident ID: %d\n", *data.IncidentID))
	}

	buf.WriteString("\n---\n")
	buf.WriteString("This notification was sent by Watchtower monitoring system.")

	return buf.String()
}

// buildTemplateData builds template data for email generation
func (e *EmailProvider) buildTemplateData(data notification.NotificationData) map[string]interface{} {
	return map[string]interface{}{
		"Title":         data.Title,
		"Message":       data.Message,
		"URL":           data.URL,
		"Severity":      data.Severity,
		"EndpointID":    data.EndpointID,
		"IncidentID":    data.IncidentID,
		"FormattedTime": data.Timestamp.Format("2006-01-02 15:04:05 UTC"),
		"Icon":          e.getIconText(data.Type),
		"HeaderClass":   e.getHeaderClass(data.Type),
	}
}

// getIconText returns text icon for notification type
func (e *EmailProvider) getIconText(notificationType notification.NotificationType) string {
	switch notificationType {
	case notification.NotificationTypeEndpointDown:
		return "🔴"
	case notification.NotificationTypeEndpointUp:
		return "🟢"
	case notification.NotificationTypeIncidentCreated:
		return "🚨"
	case notification.NotificationTypeIncidentUpdated:
		return "📋"
	case notification.NotificationTypeIncidentResolved:
		return "✅"
	default:
		return "📢"
	}
}

// getHeaderClass returns CSS class for email header based on notification type
func (e *EmailProvider) getHeaderClass(notificationType notification.NotificationType) string {
	switch notificationType {
	case notification.NotificationTypeEndpointDown:
		return "header-down"
	case notification.NotificationTypeEndpointUp:
		return "header-up"
	case notification.NotificationTypeIncidentCreated:
		return "header-incident"
	case notification.NotificationTypeIncidentUpdated:
		return "header-incident-update"
	case notification.NotificationTypeIncidentResolved:
		return "header-incident-resolved"
	default:
		return "header-default"
	}
}
