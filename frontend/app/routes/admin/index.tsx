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
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { ActionBar } from '~/components/action-bar'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import {
	Globe,
	AlertTriangle,
	BarChart3,
	Plus,
	GlobeIcon,
	AlertTriangleIcon,
	CircleXIcon,
} from 'lucide-react'
import type { Route } from './+types/index'
import { Separator } from '~/components/ui/separator'

export function meta() {
	return [
		{ title: 'Dashboard - Watchtower' },
		{ name: 'description', content: 'Watchtower dashboard' },
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
	useSSE(
		{
			endpoint_created: (event) => {
				try {
					const newEndpoint = JSON.parse(event.data)
					setEndpoints((prev: any) => ({
						...prev,
						endpoints: [...prev.endpoints, newEndpoint],
						total: prev.total + 1,
					}))
				} catch (error) {
					console.error(
						'Error parsing endpoint_created event:',
						error,
					)
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
					console.error(
						'Error parsing endpoint_updated event:',
						error,
					)
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
					console.error(
						'Error parsing endpoint_deleted event:',
						error,
					)
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
			incident_created: (event) => {
				try {
					const newIncident = JSON.parse(event.data)
					setIncidents((prev: any) => ({
						...prev,
						incidents: [...prev.incidents, newIncident],
						total: prev.total + 1,
					}))
				} catch (error) {
					console.error(
						'Error parsing incident_created event:',
						error,
					)
				}
			},
			incident_updated: (event) => {
				try {
					const updatedIncident = JSON.parse(event.data)
					setIncidents((prev: any) => {
						// If incident is now resolved, remove it from the list
						if (updatedIncident.status === 'resolved') {
							return {
								...prev,
								incidents: prev.incidents.filter(
									(incident: any) =>
										incident.id !== updatedIncident.id,
								),
								total: prev.total - 1,
							}
						}

						// Check if incident exists in current list
						const existingIncidentIndex = prev.incidents.findIndex(
							(incident: any) =>
								incident.id === updatedIncident.id,
						)

						if (existingIncidentIndex !== -1) {
							// Update existing incident
							return {
								...prev,
								incidents: prev.incidents.map(
									(incident: any) =>
										incident.id === updatedIncident.id
											? updatedIncident
											: incident,
								),
							}
						}
						// Add new incident if it should be visible (open or investigating)
						if (
							updatedIncident.status === 'open' ||
							updatedIncident.status === 'investigating'
						) {
							return {
								...prev,
								incidents: [...prev.incidents, updatedIncident],
								total: prev.total + 1,
							}
						}
						return prev
					})
				} catch (error) {
					console.error(
						'Error parsing incident_updated event:',
						error,
					)
				}
			},
			incident_deleted: (event) => {
				try {
					const deletedIncident = JSON.parse(event.data)
					setIncidents((prev: any) => ({
						...prev,
						incidents: prev.incidents.filter(
							(incident: any) =>
								incident.id !== deletedIncident.id,
						),
						total: prev.total - 1,
					}))
				} catch (error) {
					console.error(
						'Error parsing incident_deleted event:',
						error,
					)
				}
			},
		},
		{
			url: `${import.meta.env.VITE_API_BASE_URL}/api/v1/events`,
			withCredentials: true,
		},
	)

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
	const openIncidents = incidents.incidents.filter(
		(incident: any) =>
			incident.status === 'open' || incident.status === 'investigating',
	).length

	return (
		<main className='flex-1 flex flex-col xl:flex-row gap-6'>
			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
				<PageHeader
					title='Dashboard'
					description='Monitor and manage your endpoints, incidents, and logs'
				>
					<div className='flex flex-wrap items-center gap-2'>
						<Link to='/admin/endpoints/new'>
							<Button>
								<Plus className='h-4 w-4' />
								Add Endpoint
							</Button>
						</Link>
						<Link to='/admin/incidents/new'>
							<Button variant='outline'>
								<AlertTriangle className='h-4 w-4' />
								Create Incident
							</Button>
						</Link>
					</div>
				</PageHeader>

				{/* Main Sections */}
				<CardContent className='p-0 gap-0 flex flex-col'>
					{/* Recent Endpoints */}
					<Card className='rounded-none shadow-none border-none'>
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

					<Separator />

					{/* Recent Incidents */}
					<Card className='rounded-none shadow-none border-none'>
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
				</CardContent>
			</PageContent>

			{/* Quick Stats */}
			<aside className='w-88 rounded-xl space-y-4'>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<GlobeIcon className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									Total Endpoints
								</p>
								<p className='typography-h4'>
									{endpoints.total}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<CircleXIcon className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									Recent Failures (last 24 hours)
								</p>
								<p className='typography-h4'>
									{recentFailures}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<AlertTriangleIcon className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									Open Incidents
								</p>
								<p className='typography-h4'>{openIncidents}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<GlobeIcon className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									System Status
								</p>
								<Badge
									variant={
										openIncidents === 0
											? 'outline'
											: 'destructive'
									}
								>
									{openIncidents === 0
										? 'Operational'
										: 'Issues'}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			</aside>
		</main>
	)
}
