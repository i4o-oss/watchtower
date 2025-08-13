import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/home.tsx'),
	route('login', 'routes/login.tsx'),
	route('register', 'routes/register.tsx'),
	route('forgot-password', 'routes/forgot-password.tsx'),
	route('admin', 'routes/admin.tsx', [
		index('routes/admin/index.tsx'),
		route('endpoints', 'routes/admin/endpoints.tsx'),
		route('endpoints/new', 'routes/admin/endpoints/new.tsx'),
		route('endpoints/:id', 'routes/admin/endpoints/[id].tsx'),
		route('endpoints/:id/edit', 'routes/admin/endpoints/[id].edit.tsx'),
		route('analytics', 'routes/admin/analytics.tsx'),
		route('analytics/logs', 'routes/admin/analytics/logs.tsx'),
		route('analytics/incidents', 'routes/admin/analytics/incidents.tsx'),
		route('incidents', 'routes/admin/incidents.tsx'),
		route('incidents/new', 'routes/admin/incidents/new.tsx'),
		route('incidents/:id', 'routes/admin/incidents/[id].tsx'),
		route('notifications', 'routes/admin/notifications.tsx'),
		route(
			'notifications/channels',
			'routes/admin/notifications/channels.tsx',
		),
	]),
] satisfies RouteConfig
