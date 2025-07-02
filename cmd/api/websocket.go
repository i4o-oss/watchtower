package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocket upgrader with proper configuration
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, you should check the origin properly
		return true
	},
}

// WebSocketHub manages WebSocket connections and broadcasts
type WebSocketHub struct {
	clients    map[*WebSocketClient]bool
	broadcast  chan []byte
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	mu         sync.RWMutex
}

// WebSocketClient represents a WebSocket client connection
type WebSocketClient struct {
	hub    *WebSocketHub
	conn   *websocket.Conn
	send   chan []byte
	userID string // Optional user identification
}

// WebSocketMessage represents messages sent over WebSocket
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// StatusUpdateMessage represents a status update message
type StatusUpdateMessage struct {
	EndpointID   string    `json:"endpoint_id"`
	EndpointName string    `json:"endpoint_name"`
	Status       string    `json:"status"`
	ResponseTime *int      `json:"response_time_ms,omitempty"`
	Timestamp    time.Time `json:"timestamp"`
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[*WebSocketClient]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Send welcome message
			welcome := WebSocketMessage{
				Type:      "connected",
				Data:      map[string]string{"message": "Connected to status updates"},
				Timestamp: time.Now(),
			}
			if data, err := json.Marshal(welcome); err == nil {
				select {
				case client.send <- data:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}

			log.Printf("WebSocket client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastStatusUpdate broadcasts a status update to all connected clients
func (h *WebSocketHub) BroadcastStatusUpdate(endpointID, endpointName, status string, responseTime *int) {
	update := StatusUpdateMessage{
		EndpointID:   endpointID,
		EndpointName: endpointName,
		Status:       status,
		ResponseTime: responseTime,
		Timestamp:    time.Now(),
	}

	message := WebSocketMessage{
		Type:      "status_update",
		Data:      update,
		Timestamp: time.Now(),
	}

	if data, err := json.Marshal(message); err == nil {
		select {
		case h.broadcast <- data:
		default:
			log.Printf("Broadcast channel full, dropping message")
		}
	}
}

// BroadcastIncidentUpdate broadcasts an incident update to all connected clients
func (h *WebSocketHub) BroadcastIncidentUpdate(incidentType string, incident interface{}) {
	message := WebSocketMessage{
		Type:      incidentType, // "incident_created", "incident_updated", "incident_resolved"
		Data:      incident,
		Timestamp: time.Now(),
	}

	if data, err := json.Marshal(message); err == nil {
		select {
		case h.broadcast <- data:
		default:
			log.Printf("Broadcast channel full, dropping incident message")
		}
	}
}

// GetClientCount returns the number of connected clients
func (h *WebSocketHub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// handleWebSocket handles WebSocket connection upgrades
func (app *Application) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		app.logger.Error("failed to upgrade WebSocket connection", "error", err)
		return
	}

	client := &WebSocketClient{
		hub:  app.wsHub,
		conn: conn,
		send: make(chan []byte, 256),
	}

	client.hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second) // Ping every 54 seconds
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming messages (for now, we just log them)
		log.Printf("Received WebSocket message: %s", message)

		// You could implement client-to-server messaging here
		// For example: subscription to specific endpoints, authentication, etc.
	}
}

// StartStatusBroadcaster starts a goroutine that periodically broadcasts status updates
func (app *Application) StartStatusBroadcaster() {
	go func() {
		ticker := time.NewTicker(30 * time.Second) // Broadcast every 30 seconds
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				app.broadcastCurrentStatus()
			}
		}
	}()
}

// broadcastCurrentStatus gets current status and broadcasts it to WebSocket clients
func (app *Application) broadcastCurrentStatus() {
	endpoints, err := app.db.GetEndpoints()
	if err != nil {
		app.logger.Error("failed to get endpoints for status broadcast", "error", err)
		return
	}

	for _, endpoint := range endpoints {
		if !endpoint.Enabled {
			continue
		}

		// Get latest monitoring log
		logs, err := app.db.GetMonitoringLogs(endpoint.ID, 1)
		if err != nil {
			continue
		}

		if len(logs) > 0 {
			log := logs[0]
			status := "operational"
			if !log.Success {
				status = "outage"
			}

			app.wsHub.BroadcastStatusUpdate(
				endpoint.ID.String(),
				endpoint.Name,
				status,
				log.ResponseTimeMs,
			)
		}
	}
}

// Helper method to broadcast when monitoring results come in
func (app *Application) BroadcastMonitoringResult(endpointID, endpointName string, success bool, responseTime *int) {
	status := "operational"
	if !success {
		status = "outage"
	}

	app.wsHub.BroadcastStatusUpdate(endpointID, endpointName, status, responseTime)
}
