// API utility functions for making authenticated requests with CSRF tokens

// API Base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// CSRF token cache to avoid fetching it multiple times
let csrfTokenCache: string | null = null
let csrfTokenExpiry: number = 0

/**
 * Get CSRF token from server or cache
 */
export async function getCSRFToken(): Promise<string | null> {
	// Check if we have a cached token that's still valid (cache for 10 minutes)
	const now = Date.now()
	if (csrfTokenCache && now < csrfTokenExpiry) {
		return csrfTokenCache
	}

	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (response.ok) {
			const data = await response.json()
			csrfTokenCache = data.csrf_token
			csrfTokenExpiry = now + 10 * 60 * 1000 // Cache for 10 minutes
			return csrfTokenCache
		}

		// Clear cache on failure
		csrfTokenCache = null
		csrfTokenExpiry = 0
		return null
	} catch (error) {
		console.error('Failed to get CSRF token:', error)
		csrfTokenCache = null
		csrfTokenExpiry = 0
		return null
	}
}

/**
 * Clear CSRF token cache (useful when token becomes invalid)
 */
export function clearCSRFTokenCache() {
	csrfTokenCache = null
	csrfTokenExpiry = 0
}

/**
 * Make an authenticated API request with CSRF token
 */
export async function makeAuthenticatedRequest(
	url: string,
	options: RequestInit = {},
): Promise<Response> {
	const headers = new Headers(options.headers)

	// Always include credentials for session-based auth
	const requestOptions: RequestInit = {
		...options,
		credentials: 'include',
		headers,
	}

	// Add CSRF token for unsafe methods
	const method = options.method?.toUpperCase() || 'GET'
	const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

	if (unsafeMethods.includes(method)) {
		const csrfToken = await getCSRFToken()
		if (csrfToken) {
			headers.set('X-CSRF-Token', csrfToken)
		}
	}

	// Set default content type if not provided
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}

	const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

	try {
		const response = await fetch(fullUrl, requestOptions)

		// If we get a 403 (forbidden), it might be due to invalid CSRF token
		// Clear the cache and retry once
		if (response.status === 403 && unsafeMethods.includes(method)) {
			clearCSRFTokenCache()
			const retryToken = await getCSRFToken()
			if (retryToken) {
				headers.set('X-CSRF-Token', retryToken)
				return fetch(fullUrl, requestOptions)
			}
		}

		return response
	} catch (error) {
		console.error('API request failed:', error)
		throw error
	}
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
	get: (url: string, options: RequestInit = {}) =>
		makeAuthenticatedRequest(url, { ...options, method: 'GET' }),

	post: (url: string, data?: any, options: RequestInit = {}) =>
		makeAuthenticatedRequest(url, {
			...options,
			method: 'POST',
			body: data ? JSON.stringify(data) : options.body,
		}),

	put: (url: string, data?: any, options: RequestInit = {}) =>
		makeAuthenticatedRequest(url, {
			...options,
			method: 'PUT',
			body: data ? JSON.stringify(data) : options.body,
		}),

	patch: (url: string, data?: any, options: RequestInit = {}) =>
		makeAuthenticatedRequest(url, {
			...options,
			method: 'PATCH',
			body: data ? JSON.stringify(data) : options.body,
		}),

	delete: (url: string, options: RequestInit = {}) =>
		makeAuthenticatedRequest(url, { ...options, method: 'DELETE' }),
}

/**
 * Helper function to handle API responses
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errorText = await response.text()
		let errorMessage = `HTTP ${response.status}: ${response.statusText}`

		try {
			const errorData = JSON.parse(errorText)
			errorMessage = errorData.message || errorMessage
		} catch {
			// If parsing fails, use the text as is
			errorMessage = errorText || errorMessage
		}

		throw new Error(errorMessage)
	}

	const contentType = response.headers.get('content-type')
	if (contentType && contentType.includes('application/json')) {
		return response.json()
	}

	return response.text() as T
}

/**
 * Example usage:
 *
 * // Simple GET request
 * const response = await api.get('/api/v1/auth/me');
 * const user = await handleApiResponse(response);
 *
 * // POST request with data
 * const response = await api.post('/api/v1/auth/logout');
 * await handleApiResponse(response);
 *
 * // PUT request with data
 * const response = await api.put('/api/v1/endpoints/123', { name: 'Updated Name' });
 * const updatedEndpoint = await handleApiResponse(response);
 *
 * // Custom request with full control
 * const response = await makeAuthenticatedRequest('/api/v1/custom', {
 *   method: 'POST',
 *   headers: { 'Custom-Header': 'value' },
 *   body: JSON.stringify({ data: 'example' })
 * });
 */
