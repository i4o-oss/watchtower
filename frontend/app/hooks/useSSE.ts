import { useEffect, useRef } from 'react'

export interface SSEEventHandler {
	(event: MessageEvent): void
}

export interface SSEOptions {
	url?: string
	withCredentials?: boolean
	reconnectInterval?: number
	onOpen?: () => void
	onError?: (error: Event) => void
}

export interface SSEEventConfig {
	[eventType: string]: SSEEventHandler
}

/**
 * Custom hook for managing Server-Sent Events with flexible event handling
 * @param events - Object mapping event types to their handlers
 * @param options - SSE configuration options
 */
export function useSSE(events: SSEEventConfig, options: SSEOptions = {}) {
	const eventSourceRef = useRef<EventSource | null>(null)
	const {
		url = `${import.meta.env.VITE_API_BASE_URL}/api/v1/events`,
		withCredentials = true,
		reconnectInterval = 5000,
		onOpen,
		onError,
	} = options

	useEffect(() => {
		// Create EventSource
		const eventSource = new EventSource(url, { withCredentials })
		eventSourceRef.current = eventSource

		// Set up event listeners
		Object.entries(events).forEach(([eventType, handler]) => {
			eventSource.addEventListener(eventType, handler)
		})

		// Handle connection events
		eventSource.onopen = () => {
			console.debug('SSE connection established')
			onOpen?.()
		}

		eventSource.onerror = (error) => {
			console.error('SSE connection error:', error)
			onError?.(error)
		}

		return () => {
			eventSource.close()
		}
	}, [url, withCredentials, onOpen, onError])

	return {
		close: () => {
			eventSourceRef.current?.close()
		},
		readyState: eventSourceRef.current?.readyState,
	}
}
