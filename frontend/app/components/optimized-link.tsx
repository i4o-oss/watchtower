import { Link, type LinkProps } from 'react-router'
import { preloadRoute } from '~/lib/lazy'

interface OptimizedLinkProps extends LinkProps {
	preload?: () => Promise<any>
	preloadDelay?: number
}

/**
 * Enhanced Link component with route preloading on hover
 */
export function OptimizedLink({
	preload,
	preloadDelay = 100,
	onMouseEnter,
	children,
	...linkProps
}: OptimizedLinkProps) {
	const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
		// Call any existing onMouseEnter handler
		onMouseEnter?.(event)

		// Preload the route if specified
		if (preload) {
			setTimeout(() => {
				preloadRoute(preload)
			}, preloadDelay)
		}
	}

	return (
		<Link {...linkProps} onMouseEnter={handleMouseEnter}>
			{children}
		</Link>
	)
}

// Preload functions for different route groups
export const adminPreloaders = {
	dashboard: () => import('~/routes/admin/index'),
	endpoints: () => import('~/routes/admin/endpoints'),
	monitoring: () => import('~/routes/admin/monitoring'),
	incidents: () => import('~/routes/admin/incidents'),
}

export const authPreloaders = {
	login: () => import('~/routes/login'),
	register: () => import('~/routes/register'),
	dashboard: () => import('~/routes/dashboard'),
}
