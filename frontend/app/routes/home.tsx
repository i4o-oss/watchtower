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

export default function Home() {
	return <StatusPage />
}
