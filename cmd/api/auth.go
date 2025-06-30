package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/sessions"
	"github.com/i4o-oss/watchtower/internal/data"
	"gorm.io/gorm"
)

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"`
}

type AuthResponse struct {
	Message string     `json:"message,omitempty"`
	User    *data.User `json:"user,omitempty"`
	Token   string     `json:"token,omitempty"` // For consistency, but not used with HTTP-only cookies
}

// Session management
var store *sessions.CookieStore
var sessionName string

func initSessionStore() {
	secretKey := os.Getenv("SESSION_SECRET")
	if secretKey == "" {
		secretKey = "your-secret-key-change-this-in-production"
	}

	sessionName = os.Getenv("SESSION_NAME")
	if sessionName == "" {
		sessionName = "auth-session"
	}

	// Check if we're in production environment
	env := os.Getenv("ENV")
	isSecure := env == "production"

	store = sessions.NewCookieStore([]byte(secretKey))
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteStrictMode, // Better CSRF protection
		Domain:   "",                      // Let browser handle domain
	}
}

// Register handles user registration
func (app *Application) register(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" {
		app.errorResponse(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Check if user already exists
	exists, err := app.db.UserExists(req.Email)
	if err != nil {
		app.logger.Error("Database error checking user existence", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if exists {
		app.errorResponse(w, http.StatusConflict, "User with this email already exists")
		return
	}

	// Create new user
	user := &data.User{
		Email: req.Email,
		Name:  req.Name,
	}

	// Hash password
	if err := user.HashPassword(req.Password); err != nil {
		app.logger.Error("Error hashing password", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Save user to database
	if err := app.db.CreateUser(user); err != nil {
		app.logger.Error("Error creating user", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Create session
	session, _ := store.Get(r, sessionName)
	session.Values["user_id"] = user.ID.String()
	session.Values["authenticated"] = true
	if err := session.Save(r, w); err != nil {
		app.logger.Error("Error saving session", "err", err.Error())
	}

	app.writeJSON(w, http.StatusCreated, AuthResponse{
		User: user,
	})
}

// Login handles user authentication
func (app *Application) login(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.errorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" {
		app.errorResponse(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Get user by email
	user, err := app.db.GetUserByEmail(req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}
		app.logger.Error("Database error getting user", "err", err.Error())
		app.errorResponse(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Check password
	if err := user.CheckPassword(req.Password); err != nil {
		app.errorResponse(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Create session
	session, _ := store.Get(r, sessionName)
	session.Values["user_id"] = user.ID.String()
	session.Values["authenticated"] = true
	if err := session.Save(r, w); err != nil {
		app.logger.Error("Error saving session", "err", err.Error())
	}

	app.writeJSON(w, http.StatusOK, AuthResponse{
		User: user,
	})
}

// Logout handles user logout
func (app *Application) logout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, sessionName)
	session.Values["authenticated"] = false
	delete(session.Values, "user_id")
	session.Options.MaxAge = -1 // Delete the session

	if err := session.Save(r, w); err != nil {
		app.logger.Error("Error clearing session", "err", err.Error())
	}

	app.writeJSON(w, http.StatusOK, map[string]string{
		"message": "Logout successful",
	})
}

// Me returns current user information
func (app *Application) me(w http.ResponseWriter, r *http.Request) {
	user := app.getUserFromContext(r)
	if user == nil {
		app.errorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	app.writeJSON(w, http.StatusOK, user)
}

// Authentication middleware
func (app *Application) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := store.Get(r, sessionName)

		authenticated, ok := session.Values["authenticated"].(bool)
		if !ok || !authenticated {
			app.errorResponse(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		userIDStr, ok := session.Values["user_id"].(string)
		if !ok {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		// Get user from database
		user, err := app.db.GetUserByID(userID)
		if err != nil {
			app.logger.Error("Error getting user from session", "err", err.Error())
			app.errorResponse(w, http.StatusUnauthorized, "Invalid session")
			return
		}

		// Add user to request context
		ctx := r.Context()
		ctx = setUserContext(ctx, user)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}
