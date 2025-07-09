import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import type { Route } from './+types/index'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Admin Dashboard - Watchtower' },
		{ name: 'description', content: 'Watchtower admin dashboard' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	// Fetch dashboard data
	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const [endpointsRes, logsRes, incidentsRes] = await Promise.all([
			fetch(`${API_BASE_URL}/api/v1/admin/endpoints?limit=5`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(`${API_BASE_URL}/api/v1/admin/monitoring-logs?limit=10`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(
				`${API_BASE_URL}/api/v1/admin/incidents?status=open&limit=5`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			),
		])

		const [endpoints, logs, incidents] = await Promise.all([
			endpointsRes.ok ? endpointsRes.json() : { endpoints: [], total: 0 },
			logsRes.ok ? logsRes.json() : { logs: [], total: 0 },
			incidentsRes.ok ? incidentsRes.json() : { incidents: [], total: 0 },
		])

		return { endpoints, logs, incidents }
	} catch (error) {
		console.error('Error loading dashboard data:', error)
		return {
			endpoints: { endpoints: [], total: 0 },
			logs: { logs: [], total: 0 },
			incidents: { incidents: [], total: 0 },
		}
	}
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
	const [endpoints, setEndpoints] = useState(loaderData.endpoints)
	const [logs, setLogs] = useState(loaderData.logs)
	const [incidents, setIncidents] = useState(loaderData.incidents)

	// Real-time updates via Server-Sent Events
	useSSE({
		endpoint_created: (event) => {
			try {
				const newEndpoint = JSON.parse(event.data)
				setEndpoints((prev: any) => ({
					...prev,
					endpoints: [...prev.endpoints, newEndpoint],
					total: prev.total + 1,
				}))
			} catch (error) {
				console.error('Error parsing endpoint_created event:', error)
			}
		},
		endpoint_updated: (event) => {
			try {
				const updatedEndpoint = JSON.parse(event.data)
				setEndpoints((prev: any) => ({
					...prev,
					endpoints: prev.endpoints.map((ep: any) =>
						ep.id === updatedEndpoint.id ? updatedEndpoint : ep,
					),
				}))
			} catch (error) {
				console.error('Error parsing endpoint_updated event:', error)
			}
		},
		endpoint_deleted: (event) => {
			try {
				const deletedEndpoint = JSON.parse(event.data)
				setEndpoints((prev: any) => ({
					...prev,
					endpoints: prev.endpoints.filter(
						(ep: any) => ep.id !== deletedEndpoint.id,
					),
					total: prev.total - 1,
				}))
			} catch (error) {
				console.error('Error parsing endpoint_deleted event:', error)
			}
		},
		status_update: (event) => {
			try {
				// Refresh logs when we get monitoring updates
				refreshMonitoringLogs()
			} catch (error) {
				console.error('Error parsing status_update event:', error)
			}
		},
	})

	// Function to refresh monitoring logs
	const refreshMonitoringLogs = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?limit=10`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)
			if (response.ok) {
				const newLogs = await response.json()
				setLogs(newLogs)
			}
		} catch (error) {
			console.error('Error refreshing monitoring logs:', error)
		}
	}

	const activeEndpoints = endpoints.endpoints.filter(
		(e: any) => e.enabled,
	).length
	const recentFailures = logs.logs.filter((l: any) => !l.success).length
	const openIncidents = incidents.total

	return (
		<div>
			<div className='mb-8'>
				<h1 className='text-3xl font-bold'>Admin Dashboard</h1>
				<p className='text-muted-foreground'>
					Monitor and manage your endpoints, incidents, and logs
				</p>
			</div>

			{/* Quick Stats */}
			<div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium'>
							Total Endpoints
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{endpoints.total}
						</div>
						<p className='text-xs text-muted-foreground'>
							{activeEndpoints} active
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium'>
							Recent Failures
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-destructive'>
							{recentFailures}
						</div>
						<p className='text-xs text-muted-foreground'>
							Last 24 hours
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium'>
							Open Incidents
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-orange-600'>
							{openIncidents}
						</div>
						<p className='text-xs text-muted-foreground'>
							Require attention
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium'>
							System Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex items-center gap-2'>
							<Badge
								variant={
									openIncidents === 0
										? 'default'
										: 'destructive'
								}
							>
								{openIncidents === 0 ? 'Operational' : 'Issues'}
							</Badge>
						</div>
						<p className='text-xs text-muted-foreground'>
							Overall health
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Sections */}
			<div className='grid gap-6 xl:grid-cols-2 mb-8'>
				{/* Recent Endpoints */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle>Recent Endpoints</CardTitle>
							<CardDescription>
								Your monitoring endpoints
							</CardDescription>
						</div>
						<Link to='/admin/endpoints'>
							<Button variant='outline' size='sm'>
								View All
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{endpoints.endpoints.length === 0 ? (
							<div className='text-center py-8 text-muted-foreground'>
								<p>No endpoints configured yet</p>
								<Link to='/admin/endpoints/new'>
									<Button className='mt-2' size='sm'>
										Create First Endpoint
									</Button>
								</Link>
							</div>
						) : (
							<div className='space-y-3'>
								{endpoints.endpoints
									.slice(0, 5)
									.map((endpoint: any) => (
										<div
											key={endpoint.id}
											className='flex items-center justify-between p-3 border rounded-lg'
										>
											<div>
												<h4 className='font-medium'>
													{endpoint.name}
												</h4>
												<p className='text-sm text-muted-foreground'>
													{endpoint.url}
												</p>
											</div>
											<div className='flex items-center gap-2'>
												<Badge
													variant={
														endpoint.enabled
															? 'default'
															: 'secondary'
													}
												>
													{endpoint.enabled
														? 'Active'
														: 'Disabled'}
												</Badge>
												<Link
													to={`/admin/endpoints/${endpoint.id}`}
												>
													<Button
														variant='ghost'
														size='sm'
													>
														View
													</Button>
												</Link>
											</div>
										</div>
									))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Incidents */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle>Open Incidents</CardTitle>
							<CardDescription>
								Current issues requiring attention
							</CardDescription>
						</div>
						<Link to='/admin/incidents'>
							<Button variant='outline' size='sm'>
								View All
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{incidents.incidents.length === 0 ? (
							<div className='text-center py-8 text-muted-foreground'>
								<p>No open incidents</p>
								<p className='text-sm'>
									All systems operational
								</p>
							</div>
						) : (
							<div className='space-y-3'>
								{incidents.incidents
									.slice(0, 5)
									.map((incident: any) => (
										<div
											key={incident.id}
											className='flex items-center justify-between p-3 border rounded-lg'
										>
											<div>
												<h4 className='font-medium'>
													{incident.title}
												</h4>
												<p className='text-sm text-muted-foreground'>
													{new Date(
														incident.created_at,
													).toLocaleDateString()}
												</p>
											</div>
											<div className='flex items-center gap-2'>
												<Badge
													variant={
														incident.severity ===
														'high'
															? 'destructive'
															: incident.severity ===
																	'medium'
																? 'default'
																: 'secondary'
													}
												>
													{incident.severity}
												</Badge>
												<Link
													to={`/admin/incidents/${incident.id}`}
												>
													<Button
														variant='ghost'
														size='sm'
													>
														View
													</Button>
												</Link>
											</div>
										</div>
									))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>
						Common administrative tasks
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex flex-wrap gap-3'>
						<Link to='/admin/endpoints/new'>
							<Button>Add New Endpoint</Button>
						</Link>
						<Link to='/admin/incidents/new'>
							<Button variant='outline'>Create Incident</Button>
						</Link>
						<Link to='/admin/monitoring'>
							<Button variant='outline'>
								View Monitoring Logs
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
