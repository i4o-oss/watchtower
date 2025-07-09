import type { Route } from './+types/home'
import { StatusPage } from '~/components/status-page'

// biome-ignore lint: lint/correctness/noEmptyPattern
export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Watchtower Status' },
		{
			name: 'description',
			content: 'Real-time service status and uptime monitoring',
		},
	]
}

export async function clientLoader() {
	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const [statusRes, incidentsRes] = await Promise.all([
			fetch(`${API_BASE_URL}/api/v1/status`),
			fetch(`${API_BASE_URL}/api/v1/incidents`),
		])

		const [status, incidents] = await Promise.all([
			statusRes.ok ? statusRes.json() : null,
			incidentsRes.ok ? incidentsRes.json() : null,
		])

		return { status, incidents }
	} catch (error) {
		console.error('Error loading status data:', error)
		return { status: null, incidents: null }
	}
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <StatusPage initialData={loaderData} />
}
