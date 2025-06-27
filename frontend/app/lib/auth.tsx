import { createContext, useContext, useEffect, useState } from 'react'
import { redirect } from 'react-router'

// Types
export interface User {
	id: number
	email: string
	name?: string
	created_at?: string
	updated_at?: string
}

export interface AuthState {
	user: User | null
	isLoading: boolean
	isAuthenticated: boolean
}

export interface AuthContextType extends AuthState {
	login: (
		email: string,
		password: string,
	) => Promise<{ success: boolean; error?: string }>
	register: (
		email: string,
		password: string,
		name?: string,
	) => Promise<{ success: boolean; error?: string }>
	logout: () => Promise<void>
	checkAuth: () => Promise<void>
}

// API Base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [authState, setAuthState] = useState<AuthState>({
		user: null,
		isLoading: true,
		isAuthenticated: false,
	})

	// Check authentication status
	const checkAuth = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
				method: 'GET',
				credentials: 'include', // Important for HTTP-only cookies
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (response.ok) {
				const user = await response.json()
				setAuthState({
					user,
					isLoading: false,
					isAuthenticated: true,
				})
			} else {
				setAuthState({
					user: null,
					isLoading: false,
					isAuthenticated: false,
				})
			}
		} catch (error) {
			console.error('Auth check failed:', error)
			setAuthState({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			})
		}
	}

	// Login function
	const login = async (email: string, password: string) => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			})

			const data = await response.json()

			if (response.ok) {
				setAuthState({
					user: data.user,
					isLoading: false,
					isAuthenticated: true,
				})
				return { success: true }
			}
			return { success: false, error: data.message || 'Login failed' }
		} catch (error) {
			console.error('Login error:', error)
			return { success: false, error: 'Network error occurred' }
		}
	}

	// Register function
	const register = async (email: string, password: string, name?: string) => {
		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/auth/register`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ email, password, name }),
				},
			)

			const data = await response.json()

			if (response.ok) {
				setAuthState({
					user: data.user,
					isLoading: false,
					isAuthenticated: true,
				})
				return { success: true }
			}
			return {
				success: false,
				error: data.message || 'Registration failed',
			}
		} catch (error) {
			console.error('Registration error:', error)
			return { success: false, error: 'Network error occurred' }
		}
	}

	// Logout function
	const logout = async () => {
		try {
			await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		} catch (error) {
			console.error('Logout error:', error)
		} finally {
			setAuthState({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			})
		}
	}

	// Check auth on mount
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		checkAuth()
	}, [])

	const contextValue: AuthContextType = {
		...authState,
		login,
		register,
		logout,
		checkAuth,
	}

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	)
}

// Hook to use auth context
export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

// Helper function to check if user is authenticated
export function useRequireAuth() {
	const { isAuthenticated, isLoading } = useAuth()
	return { isAuthenticated, isLoading }
}

// Higher-order component for protected routes
export function withAuth<T extends Record<string, unknown>>(
	Component: React.ComponentType<T>,
) {
	return function AuthenticatedComponent(props: T) {
		const { isAuthenticated, isLoading } = useAuth()

		if (isLoading) {
			return (
				<div className='flex items-center justify-center min-h-screen'>
					<div className='text-center'>
						<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto' />
						<p className='mt-2 text-muted-foreground'>Loading...</p>
					</div>
				</div>
			)
		}

		if (!isAuthenticated) {
			// In a real app, you might want to redirect to login
			// For now, just show a message
			return (
				<div className='flex items-center justify-center min-h-screen'>
					<div className='text-center'>
						<h1 className='text-2xl font-bold text-destructive'>
							Access Denied
						</h1>
						<p className='mt-2 text-muted-foreground'>
							You must be logged in to view this page.
						</p>
					</div>
				</div>
			)
		}

		return <Component {...props} />
	}
}

// ClientLoader utility functions for authentication
export interface AuthCheckResult {
	isAuthenticated: boolean
	user?: User
}

/**
 * Checks if the user is authenticated by calling the auth API
 * Returns authentication status and user data if authenticated
 */
export async function checkAuthStatus(): Promise<AuthCheckResult> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (response.ok) {
			const user = await response.json()
			return { isAuthenticated: true, user }
		}

		return { isAuthenticated: false }
	} catch (error) {
		console.error('Auth check failed:', error)
		return { isAuthenticated: false }
	}
}

/**
 * ClientLoader utility that redirects authenticated users to a specified route
 * Use this for login/register pages that should redirect if user is already logged in
 */
export async function requireGuest(redirectTo = '/') {
	const authResult = await checkAuthStatus()

	if (authResult.isAuthenticated) {
		throw redirect(redirectTo)
	}

	return null
}

/**
 * ClientLoader utility that redirects unauthenticated users to login
 * Use this for protected pages that require authentication
 */
export async function requireAuth(redirectTo = '/login') {
	const authResult = await checkAuthStatus()

	if (!authResult.isAuthenticated) {
		throw redirect(redirectTo)
	}

	return authResult.user
}

/**
 * ClientLoader utility that checks auth but doesn't redirect
 * Use this when you need to know auth status but want to handle it in the component
 */
export async function getAuthUser(): Promise<User | null> {
	const authResult = await checkAuthStatus()
	return authResult.user || null
}
