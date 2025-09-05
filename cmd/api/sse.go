package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// SSEHub manages Server-Sent Events connections and broadcasts
type SSEHub struct {
	clients    map[*SSEClient]bool
	broadcast  chan []byte
	register   chan *SSEClient
	unregister chan *SSEClient
	mu         sync.RWMutex
}

// SSEClient represents a Server-Sent Events client connection
type SSEClient struct {
	hub      *SSEHub
	writer   http.ResponseWriter
	flusher  http.Flusher
	done     chan bool
	clientID string
}

// SSEMessage represents messages sent over SSE
type SSEMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	ID    string      `json:"id,omitempty"`
}

// StatusUpdateMessage represents a status update message
type StatusUpdateMessage struct {
	EndpointID   string    `json:"endpoint_id"`
	EndpointName string    `json:"endpoint_name"`
	Status       string    `json:"status"`
	ResponseTime *int      `json:"response_time_ms,omitempty"`
	Timestamp    time.Time `json:"timestamp"`
}

// NewSSEHub creates a new Server-Sent Events hub
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients:    make(map[*SSEClient]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *SSEClient),
		unregister: make(chan *SSEClient),
	}
}

// Run starts the SSE hub
func (h *SSEHub) Run() {
	// Start periodic ping to keep connections alive
	go h.startPingTicker()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Send welcome message
			client.sendEvent("connected", map[string]string{
				"message":   "Connected to status updates",
				"timestamp": time.Now().Format(time.RFC3339),
			})

			log.Printf("SSE client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.done)
			}
			h.mu.Unlock()
			log.Printf("SSE client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case <-client.done:
					// Client is done, remove it
					delete(h.clients, client)
				default:
					if err := client.writeMessage(message); err != nil {
						log.Printf("Error writing to SSE client: %v", err)
						delete(h.clients, client)
						close(client.done)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// startPingTicker sends periodic ping events to keep connections alive
func (h *SSEHub) startPingTicker() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		h.BroadcastPing()
	}
}

// BroadcastStatusUpdate broadcasts a status update to all connected clients
func (h *SSEHub) BroadcastStatusUpdate(endpointID, endpointName, status string, responseTime *int) {
	update := StatusUpdateMessage{
		EndpointID:   endpointID,
		EndpointName: endpointName,
		Status:       status,
		ResponseTime: responseTime,
		Timestamp:    time.Now(),
	}

	message := SSEMessage{
		Event: "status_update",
		Data:  update,
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	if data, err := json.Marshal(message.Data); err == nil {
		eventData := fmt.Sprintf("event: %s\ndata: %s\nid: %s\n\n", message.Event, string(data), message.ID)
		select {
		case h.broadcast <- []byte(eventData):
		default:
			log.Printf("SSE broadcast channel full, dropping message")
		}
	}
}

// BroadcastIncidentUpdate broadcasts an incident update to all connected clients
func (h *SSEHub) BroadcastIncidentUpdate(incidentType string, incident interface{}) {
	message := SSEMessage{
		Event: incidentType, // "incident_created", "incident_updated", "incident_resolved"
		Data:  incident,
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	if data, err := json.Marshal(message.Data); err == nil {
		eventData := fmt.Sprintf("event: %s\ndata: %s\nid: %s\n\n", message.Event, string(data), message.ID)
		select {
		case h.broadcast <- []byte(eventData):
		default:
			log.Printf("SSE broadcast channel full, dropping incident message")
		}
	}
}

// BroadcastTimelineUpdate broadcasts a timeline update to all connected clients
func (h *SSEHub) BroadcastTimelineUpdate(timelineType string, timeline interface{}) {
	message := SSEMessage{
		Event: timelineType, // "timeline_created", "timeline_updated"
		Data:  timeline,
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	if data, err := json.Marshal(message.Data); err == nil {
		eventData := fmt.Sprintf("event: %s\ndata: %s\nid: %s\n\n", message.Event, string(data), message.ID)
		select {
		case h.broadcast <- []byte(eventData):
		default:
			log.Printf("SSE broadcast channel full, dropping timeline message")
		}
	}
}

// BroadcastEndpointUpdate broadcasts an endpoint update to all connected clients
func (h *SSEHub) BroadcastEndpointUpdate(eventType string, endpoint interface{}) {
	message := SSEMessage{
		Event: eventType, // "endpoint_created", "endpoint_updated", "endpoint_deleted"
		Data:  endpoint,
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	if data, err := json.Marshal(message.Data); err == nil {
		eventData := fmt.Sprintf("event: %s\ndata: %s\nid: %s\n\n", message.Event, string(data), message.ID)
		select {
		case h.broadcast <- []byte(eventData):
		default:
			log.Printf("SSE broadcast channel full, dropping endpoint message")
		}
	}
}

// BroadcastPing sends a ping event to all clients
func (h *SSEHub) BroadcastPing() {
	pingData := fmt.Sprintf("event: ping\ndata: {\"timestamp\":\"%s\"}\n\n", time.Now().Format(time.RFC3339))
	select {
	case h.broadcast <- []byte(pingData):
	default:
		log.Printf("SSE broadcast channel full, dropping ping")
	}
}

// GetClientCount returns the number of connected clients
func (h *SSEHub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// handleSSE handles Server-Sent Events connections
func (app *Application) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	// Check if the response writer supports flushing
	flusher, ok := w.(http.Flusher)
	if !ok {
		app.logger.Error("SSE not supported: response writer does not support flushing")
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Create client
	client := &SSEClient{
		hub:      app.sseHub,
		writer:   w,
		flusher:  flusher,
		done:     make(chan bool),
		clientID: fmt.Sprintf("client_%d", time.Now().UnixNano()),
	}

	// Register client
	client.hub.register <- client

	// Keep connection alive until client disconnects
	<-r.Context().Done()

	// Unregister client when connection closes
	client.hub.unregister <- client
}

// sendEvent sends a specific event to this client
func (c *SSEClient) sendEvent(event string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	eventData := fmt.Sprintf("event: %s\ndata: %s\n\n", event, string(jsonData))
	return c.writeMessage([]byte(eventData))
}

// writeMessage writes a message to the SSE client
func (c *SSEClient) writeMessage(message []byte) error {
	_, err := c.writer.Write(message)
	if err != nil {
		return err
	}
	c.flusher.Flush()
	return nil
}

// Helper method to broadcast when monitoring results come in
func (app *Application) BroadcastMonitoringResult(endpointID, endpointName string, success bool, responseTime *int) {
	status := "operational"
	if !success {
		status = "outage"
	}

	app.sseHub.BroadcastStatusUpdate(endpointID, endpointName, status, responseTime)
}
