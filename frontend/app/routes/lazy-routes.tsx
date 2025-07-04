import {
	createLazyComponent,
	AdminDashboardSkeleton,
	FormSkeleton,
	LazyLoadingFallback,
} from '~/lib/lazy'

// Lazy load admin routes since they're not needed on the public status page
export const LazyAdminIndex = createLazyComponent(
	() => import('./admin/index'),
	<AdminDashboardSkeleton />,
)

export const LazyAdminEndpoints = createLazyComponent(
	() => import('./admin/endpoints'),
	<AdminDashboardSkeleton />,
)

export const LazyAdminEndpointNew = createLazyComponent(
	() => import('./admin/endpoints/new'),
	<FormSkeleton />,
)

export const LazyAdminEndpointDetail = createLazyComponent(
	() => import('./admin/endpoints/[id]'),
	<LazyLoadingFallback message='Loading Endpoint Details...' />,
)

export const LazyAdminEndpointEdit = createLazyComponent(
	() => import('./admin/endpoints/[id].edit'),
	<FormSkeleton />,
)

export const LazyAdminMonitoring = createLazyComponent(
	() => import('./admin/monitoring'),
	<AdminDashboardSkeleton />,
)

export const LazyAdminIncidents = createLazyComponent(
	() => import('./admin/incidents'),
	<AdminDashboardSkeleton />,
)

export const LazyAdminIncidentNew = createLazyComponent(
	() => import('./admin/incidents/new'),
	<FormSkeleton />,
)

export const LazyAdminIncidentDetail = createLazyComponent(
	() => import('./admin/incidents/[id]'),
	<LazyLoadingFallback message='Loading Incident Details...' />,
)

// Auth routes can also be lazy loaded since they're not on the critical path
export const LazyLogin = createLazyComponent(
	() => import('./login'),
	<FormSkeleton />,
)

export const LazyRegister = createLazyComponent(
	() => import('./register'),
	<FormSkeleton />,
)

export const LazyDashboard = createLazyComponent(
	() => import('./dashboard'),
	<AdminDashboardSkeleton />,
)
