/**
 * Performance monitoring utilities for frontend
 */

// Web Vitals tracking
export interface PerformanceMetrics {
	fcp?: number // First Contentful Paint
	lcp?: number // Largest Contentful Paint
	fid?: number // First Input Delay
	cls?: number // Cumulative Layout Shift
	ttfb?: number // Time to First Byte
	loadTime?: number
	domContentLoaded?: number
}

/**
 * Collect Core Web Vitals and performance metrics
 */
export function collectPerformanceMetrics(): Promise<PerformanceMetrics> {
	return new Promise((resolve) => {
		const metrics: PerformanceMetrics = {}

		// Collect basic performance timing
		if ('performance' in window && 'timing' in performance) {
			const timing = performance.timing
			metrics.loadTime = timing.loadEventEnd - timing.navigationStart
			metrics.domContentLoaded =
				timing.domContentLoadedEventEnd - timing.navigationStart
			metrics.ttfb = timing.responseStart - timing.navigationStart
		}

		// Collect Paint metrics
		if ('performance' in window && 'getEntriesByType' in performance) {
			const paintEntries = performance.getEntriesByType('paint')
			paintEntries.forEach((entry) => {
				if (entry.name === 'first-contentful-paint') {
					metrics.fcp = entry.startTime
				}
			})
		}

		// Use Web Vitals if available
		if (typeof window !== 'undefined') {
			// Try to import web-vitals dynamically if available
			import('web-vitals')
				.then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
					getCLS((metric) => {
						metrics.cls = metric.value
					})
					getFID((metric) => {
						metrics.fid = metric.value
					})
					getFCP((metric) => {
						metrics.fcp = metric.value
					})
					getLCP((metric) => {
						metrics.lcp = metric.value
					})
					getTTFB((metric) => {
						metrics.ttfb = metric.value
					})

					setTimeout(() => resolve(metrics), 1000)
				})
				.catch(() => {
					// Fallback if web-vitals is not available
					resolve(metrics)
				})
		} else {
			resolve(metrics)
		}
	})
}

/**
 * Monitor bundle loading performance
 */
export function trackBundlePerformance() {
	if (typeof window === 'undefined') return

	// Track resource loading times
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			if (entry.entryType === 'resource' && entry.name.includes('.js')) {
				const resourceTiming = entry as PerformanceResourceTiming
				console.log('Bundle loaded:', {
					name: entry.name.split('/').pop(),
					duration: resourceTiming.duration,
					transferSize: resourceTiming.transferSize,
					encodedBodySize: resourceTiming.encodedBodySize,
				})
			}
		}
	})

	observer.observe({ entryTypes: ['resource'] })

	// Clean up after 30 seconds
	setTimeout(() => observer.disconnect(), 30000)
}

/**
 * Measure component render performance
 */
export function measureRenderTime(componentName: string, startTime: number) {
	if (typeof window === 'undefined') return

	const endTime = performance.now()
	const renderTime = endTime - startTime

	if (renderTime > 16) {
		// Log if render takes longer than one frame
		console.log(
			`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`,
		)
	}
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage() {
	if (typeof window === 'undefined' || !('memory' in performance)) {
		return null
	}

	const memory = (performance as any).memory
	return {
		usedJSHeapSize: memory.usedJSHeapSize,
		totalJSHeapSize: memory.totalJSHeapSize,
		jsHeapSizeLimit: memory.jsHeapSizeLimit,
	}
}

/**
 * Send performance metrics to backend
 */
export async function reportPerformanceMetrics(
	metrics: PerformanceMetrics & {
		route?: string
		userAgent?: string
	},
) {
	try {
		await fetch('/api/v1/performance-metrics', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...metrics,
				route: window.location.pathname,
				userAgent: navigator.userAgent,
				timestamp: Date.now(),
			}),
		})
	} catch (error) {
		console.log('Failed to report performance metrics:', error)
	}
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
	if (typeof window === 'undefined') return

	// Track bundle performance
	trackBundlePerformance()

	// Collect metrics after page load
	window.addEventListener('load', async () => {
		const metrics = await collectPerformanceMetrics()
		const memory = getMemoryUsage()

		console.log('Performance Metrics:', { ...metrics, memory })

		// Report to backend in production
		if (process.env.NODE_ENV === 'production') {
			reportPerformanceMetrics(metrics)
		}
	})
}
