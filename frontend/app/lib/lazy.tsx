import { lazy, Suspense, type ComponentType } from 'react'
import { Skeleton } from '~/components/ui/skeleton'

/**
 * Wrapper for React.lazy() with error boundary and loading state
 */
export function createLazyComponent<T extends ComponentType<any>>(
	importFn: () => Promise<{ default: T }>,
	fallback?: React.ReactNode,
) {
	const LazyComponent = lazy(importFn)

	return function LazyWrapper(props: React.ComponentProps<T>) {
		return (
			<Suspense fallback={fallback || <LazyLoadingFallback />}>
				<LazyComponent {...props} />
			</Suspense>
		)
	}
}

/**
 * Enhanced skeleton loading for lazy components
 */
export function LazyLoadingFallback({
	message = 'Loading...',
	height = '200px',
	showMessage = true,
}: {
	message?: string
	height?: string
	showMessage?: boolean
}) {
	return (
		<div
			className='flex flex-col space-y-4 w-full'
			style={{ minHeight: height }}
		>
			<div className='space-y-2'>
				<Skeleton className='h-4 w-3/4' />
				<Skeleton className='h-4 w-1/2' />
			</div>
			<Skeleton className='h-32 w-full' />
			<div className='space-y-2'>
				<Skeleton className='h-4 w-2/3' />
				<Skeleton className='h-4 w-1/3' />
			</div>
			{showMessage && (
				<div className='flex items-center justify-center pt-4'>
					<p className='text-sm text-muted-foreground'>{message}</p>
				</div>
			)}
		</div>
	)
}

/**
 * Skeleton for JSON Editor
 */
export function JsonEditorSkeleton() {
	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<Skeleton className='h-6 w-32' />
				<div className='flex space-x-2'>
					<Skeleton className='h-8 w-16' />
					<Skeleton className='h-8 w-20' />
				</div>
			</div>
			<Skeleton className='h-64 w-full rounded-md' />
			<div className='flex space-x-2'>
				<Skeleton className='h-4 w-4 rounded-full' />
				<Skeleton className='h-4 w-24' />
			</div>
		</div>
	)
}

/**
 * Button loading skeleton for form submissions
 */
export function ButtonLoadingSkeleton() {
	return <Skeleton className='w-4 h-4 rounded-full animate-pulse' />
}
