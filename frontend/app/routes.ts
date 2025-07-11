import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/home.tsx'),
	route('login', 'routes/login.tsx'),
	route('register', 'routes/register.tsx'),
	route('dashboard', 'routes/dashboard.tsx'),
	route('admin', 'routes/admin/index.tsx'),
	route('admin/endpoints', 'routes/admin/endpoints.tsx'),
	route('admin/endpoints/new', 'routes/admin/endpoints/new.tsx'),
	route('admin/endpoints/:id', 'routes/admin/endpoints/[id].tsx'),
	route('admin/endpoints/:id/edit', 'routes/admin/endpoints/[id].edit.tsx'),
	route('admin/monitoring', 'routes/admin/monitoring.tsx'),
	route('admin/incidents', 'routes/admin/incidents.tsx'),
	route('admin/incidents/new', 'routes/admin/incidents/new.tsx'),
	route('admin/incidents/:id', 'routes/admin/incidents/[id].tsx'),
	route('admin/notifications', 'routes/admin/notifications.tsx'),
	route(
		'admin/notifications/channels',
		'routes/admin/notifications/channels.tsx',
	),
] satisfies RouteConfig
