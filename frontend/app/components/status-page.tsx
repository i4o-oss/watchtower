import { useEffect, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'
import { useSSE } from '~/hooks/useSSE'
import {
	AlertCircle,
	CheckCircle,
	Clock,
	XCircle,
	RefreshCw,
} from 'lucide-react'

// Types for API responses
interface ServiceStatus {
	id: string
	name: string
	status: 'operational' | 'degraded' | 'outage'
	uptime_today: number
	uptime_30_day: number
	uptime_90_day: number
	last_check: string
	response_time_ms?: number
}

interface OverallStatus {
	status: 'operational' | 'degraded' | 'outage'
	uptime_today: number
	uptime_30_day: number
	uptime_90_day: number
}

interface StatusResponse {
	services: ServiceStatus[]
	overall: OverallStatus
	last_updated: string
}

interface UptimeDataPoint {
	date: string
	uptime: number
	status: string
}

interface UptimeResponse {
	endpoint_id: string
	endpoint_name: string
	data: UptimeDataPoint[]
	period: string
}

interface IncidentSummary {
	id: string
	title: string
	description: string
	status: string
	severity: string
	start_time: string
	end_time?: string
	affected_services: string[]
}

interface IncidentsResponse {
	incidents: IncidentSummary[]
	last_updated: string
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
	const variants = {
		operational: {
			color: 'bg-green-500',
			text: 'Operational',
			icon: CheckCircle,
		},
		degraded: {
			color: 'bg-yellow-500',
			text: 'Degraded',
			icon: AlertCircle,
		},
		outage: { color: 'bg-red-500', text: 'Outage', icon: XCircle },
		unknown: { color: 'bg-gray-500', text: 'Unknown', icon: Clock },
	}

	const variant =
		variants[status as keyof typeof variants] || variants.unknown
	const Icon = variant.icon

	return (
		<Badge
			variant='outline'
			className={cn(
				'border-2',
				`border-${variant.color.split('-')[1]}-500`,
			)}
		>
			<Icon
				className={cn(
					'w-3 h-3 mr-1',
					variant.color.replace('bg-', 'text-'),
				)}
			/>
			{variant.text}
		</Badge>
	)
}

// Uptime graph component
function UptimeGraph({
	serviceId,
	serviceName,
}: {
	serviceId: string
	serviceName: string
}) {
	const [uptimeData, setUptimeData] = useState<UptimeDataPoint[]>([])
	const [loading, setLoading] = useState(false)
	const [selectedDay, setSelectedDay] = useState<UptimeDataPoint | null>(null)

	useEffect(() => {
		const fetchUptimeData = async () => {
			setLoading(true)
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
			try {
				const response = await fetch(
					`${API_BASE_URL}/api/v1/uptime/${serviceId}`,
				)
				if (response.ok) {
					const data: UptimeResponse = await response.json()
					setUptimeData(data.data)
				}
			} catch (error) {
				console.error('Failed to fetch uptime data:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchUptimeData()
	}, [serviceId])

	if (loading) {
		return (
			<div className='h-20 flex items-center justify-center'>
				<RefreshCw className='w-4 h-4 animate-spin' />
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h4 className='font-medium' id={`uptime-title-${serviceId}`}>
					90-Day Uptime History
				</h4>
				<span className='text-sm text-muted-foreground'>
					{uptimeData.length} days
				</span>
			</div>

			<div
				className='grid grid-cols-[repeat(30,1fr)] sm:grid-cols-[repeat(45,1fr)] lg:grid-cols-[repeat(90,1fr)] gap-1 h-8'
				role='grid'
				aria-labelledby={`uptime-title-${serviceId}`}
				aria-description='Interactive uptime graph showing daily status over 90 days'
			>
				{uptimeData.slice(-90).map((day, index) => {
					const getColor = (uptime: number) => {
						if (uptime >= 99) return 'bg-green-500'
						if (uptime >= 95) return 'bg-yellow-500'
						return 'bg-red-500'
					}

					return (
						<button
							key={day.date}
							className={cn(
								'h-8 w-full rounded-sm transition-all hover:scale-110 cursor-pointer',
								getColor(day.uptime),
								'border border-white/20',
							)}
							onClick={() => setSelectedDay(day)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									setSelectedDay(day)
								}
							}}
							title={`${day.date}: ${day.uptime.toFixed(1)}% uptime`}
							aria-label={`${day.date}: ${day.uptime.toFixed(1)}% uptime, ${
								day.status
							} status`}
						/>
					)
				})}
			</div>

			<div className='flex justify-between text-xs text-muted-foreground'>
				<span>90 days ago</span>
				<span>Today</span>
			</div>

			{selectedDay && (
				<Card className='mt-4'>
					<CardHeader>
						<CardTitle className='text-sm'>
							{new Date(selectedDay.date).toLocaleDateString(
								'en-US',
								{
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								},
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2'>
						<div className='flex items-center justify-between'>
							<span className='text-sm'>Uptime:</span>
							<span className='font-medium'>
								{selectedDay.uptime.toFixed(2)}%
							</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='text-sm'>Status:</span>
							<StatusBadge status={selectedDay.status} />
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

// Main status page component
export function StatusPage({
	initialData,
}: {
	initialData?: {
		status: StatusResponse | null
		incidents: IncidentsResponse | null
	}
}) {
	const [status, setStatus] = useState<StatusResponse | null>(
		initialData?.status || null,
	)
	const [incidents, setIncidents] = useState<IncidentsResponse | null>(
		initialData?.incidents || null,
	)
	const [loading, setLoading] = useState(!initialData?.status)
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

	// Fetch status data
	const fetchStatus = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
		try {
			const [statusRes, incidentsRes] = await Promise.all([
				fetch(`${API_BASE_URL}/api/v1/status`),
				fetch(`${API_BASE_URL}/api/v1/incidents`),
			])

			if (statusRes.ok) {
				const statusData = await statusRes.json()
				setStatus(statusData)
			}

			if (incidentsRes.ok) {
				const incidentsData = await incidentsRes.json()
				setIncidents(incidentsData)
			}

			setLastRefresh(new Date())
		} catch (error) {
			console.error('Failed to fetch status:', error)
		} finally {
			setLoading(false)
		}
	}

	// Initial fetch (only if no initial data)
	useEffect(() => {
		if (!initialData?.status) {
			fetchStatus()
		}
	}, [initialData?.status])

	// Auto-refresh every 5 minutes (since SSE provides real-time updates)
	useEffect(() => {
		const interval = setInterval(fetchStatus, 300000) // 5 minutes
		return () => clearInterval(interval)
	}, [])

	// Server-Sent Events for real-time updates
	useSSE(
		{
			status_update: (event) => {
				try {
					// Update status directly from SSE data
					const statusUpdate = JSON.parse(event.data)
					setStatus((prev) => {
						if (!prev) return prev

						// Update the specific service in the status
						return {
							...prev,
							services: prev.services.map((service) =>
								service.id === statusUpdate.endpoint_id
									? {
											...service,
											status: statusUpdate.status,
											response_time_ms:
												statusUpdate.response_time_ms,
											last_check: statusUpdate.timestamp,
										}
									: service,
							),
						}
					})
					setLastRefresh(new Date())
				} catch (error) {
					console.error('SSE message parsing error:', error)
					// Fallback to full refresh on error
					fetchStatus()
				}
			},
			endpoint_created: () => {
				try {
					// Refresh status when endpoints are created
					fetchStatus()
				} catch (error) {
					console.error(
						'Error handling endpoint_created event:',
						error,
					)
				}
			},
			endpoint_updated: () => {
				try {
					// Refresh status when endpoints are updated
					fetchStatus()
				} catch (error) {
					console.error(
						'Error handling endpoint_updated event:',
						error,
					)
				}
			},
			endpoint_deleted: () => {
				try {
					// Refresh status when endpoints are deleted
					fetchStatus()
				} catch (error) {
					console.error(
						'Error handling endpoint_deleted event:',
						error,
					)
				}
			},
			ping: () => {
				// Keep-alive ping from server
				console.debug('SSE ping received')
			},
			incident_created: (event) => {
				try {
					// Parse the incident data and update local state
					const newIncident = JSON.parse(event.data)

					// Only add incident if it should be visible on status page (open or investigating)
					if (
						newIncident.status === 'open' ||
						newIncident.status === 'investigating'
					) {
						setIncidents((prev) => {
							if (!prev) return prev
							return {
								...prev,
								incidents: [
									...prev.incidents,
									{
										id: newIncident.id,
										title: newIncident.title,
										description: newIncident.description,
										status: newIncident.status,
										severity: newIncident.severity,
										start_time: newIncident.start_time,
										end_time: newIncident.end_time,
										affected_services: [],
									},
								],
							}
						})
					}
				} catch (error) {
					console.error(
						'Error handling incident_created event:',
						error,
					)
					// Fallback to full refresh
					fetchStatus()
				}
			},
			incident_updated: (event) => {
				try {
					// Parse the incident data and update local state
					const updatedIncident = JSON.parse(event.data)
					setIncidents((prev) => {
						if (!prev) return prev

						// If incident is now resolved, remove it from the list
						if (updatedIncident.status === 'resolved') {
							return {
								...prev,
								incidents: prev.incidents.filter(
									(incident) =>
										incident.id !== updatedIncident.id,
								),
							}
						}

						// If incident exists, update it
						const existingIncidentIndex = prev.incidents.findIndex(
							(incident) => incident.id === updatedIncident.id,
						)

						if (existingIncidentIndex !== -1) {
							// Update existing incident
							return {
								...prev,
								incidents: prev.incidents.map((incident) =>
									incident.id === updatedIncident.id
										? {
												...incident,
												title: updatedIncident.title,
												description:
													updatedIncident.description,
												status: updatedIncident.status,
												severity:
													updatedIncident.severity,
												end_time:
													updatedIncident.end_time,
											}
										: incident,
								),
							}
						} else {
							// Add new incident if it should be visible (open or investigating)
							if (
								updatedIncident.status === 'open' ||
								updatedIncident.status === 'investigating'
							) {
								return {
									...prev,
									incidents: [
										...prev.incidents,
										{
											id: updatedIncident.id,
											title: updatedIncident.title,
											description:
												updatedIncident.description,
											status: updatedIncident.status,
											severity: updatedIncident.severity,
											start_time:
												updatedIncident.start_time,
											end_time: updatedIncident.end_time,
											affected_services: [],
										},
									],
								}
							}
							return prev
						}
					})
				} catch (error) {
					console.error(
						'Error handling incident_updated event:',
						error,
					)
					// Fallback to full refresh
					fetchStatus()
				}
			},
			incident_deleted: (event) => {
				try {
					// Parse the incident data and remove from local state
					const deletedIncident = JSON.parse(event.data)
					setIncidents((prev) => {
						if (!prev) return prev
						return {
							...prev,
							incidents: prev.incidents.filter(
								(incident) =>
									incident.id !== deletedIncident.id,
							),
						}
					})
				} catch (error) {
					console.error(
						'Error handling incident_deleted event:',
						error,
					)
					// Fallback to full refresh
					fetchStatus()
				}
			},
		},
		{
			url: `${import.meta.env.VITE_API_BASE_URL}/api/v1/events`,
			withCredentials: true,
		},
	)

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<RefreshCw className='w-8 h-8 animate-spin mx-auto mb-4' />
					<p className='text-muted-foreground'>Loading status...</p>
				</div>
			</div>
		)
	}

	if (!status) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<XCircle className='w-8 h-8 text-red-500 mx-auto mb-4' />
					<p className='text-muted-foreground'>
						Failed to load status
					</p>
					<Button onClick={fetchStatus} className='mt-4'>
						Retry
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			{/* Header */}
			<header className='border-b' role='banner'>
				<div className='container mx-auto px-4 py-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold' id='main-title'>
								Watchtower Status
							</h1>
							<p className='text-muted-foreground mt-1'>
								Real-time service status and uptime monitoring
							</p>
						</div>
						<div className='text-right'>
							<div className='flex items-center gap-2 mb-1'>
								<StatusBadge status={status.overall.status} />
							</div>
							<p className='text-sm text-muted-foreground'>
								Last updated:{' '}
								{new Date(lastRefresh).toLocaleTimeString()}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className='container mx-auto px-4 py-8 space-y-8' role='main'>
				{/* Overall Status */}
				<section aria-labelledby='overall-status-title'>
					<Card>
						<CardHeader>
							<CardTitle id='overall-status-title'>
								Overall Status
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								<div className='text-center'>
									<div className='text-2xl font-bold'>
										{status.overall.uptime_today.toFixed(1)}
										%
									</div>
									<div className='text-sm text-muted-foreground'>
										Today
									</div>
								</div>
								<div className='text-center'>
									<div className='text-2xl font-bold'>
										{status.overall.uptime_30_day.toFixed(
											1,
										)}
										%
									</div>
									<div className='text-sm text-muted-foreground'>
										30 Days
									</div>
								</div>
								<div className='text-center'>
									<div className='text-2xl font-bold'>
										{status.overall.uptime_90_day.toFixed(
											1,
										)}
										%
									</div>
									<div className='text-sm text-muted-foreground'>
										90 Days
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* Active Incidents */}
				{incidents && incidents.incidents.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<AlertCircle className='w-5 h-5 text-orange-500' />
								Active Incidents
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							{incidents.incidents.map((incident) => (
								<div
									key={incident.id}
									className='border rounded-lg p-4'
								>
									<div className='flex items-start justify-between mb-2'>
										<h4 className='font-medium'>
											{incident.title}
										</h4>
										<Badge
											variant={
												incident.severity === 'high'
													? 'destructive'
													: 'secondary'
											}
										>
											{incident.severity}
										</Badge>
									</div>
									<p className='text-sm text-muted-foreground mb-2'>
										{incident.description}
									</p>
									<div className='flex items-center gap-4 text-xs text-muted-foreground'>
										<span>
											Started:{' '}
											{new Date(
												incident.start_time,
											).toLocaleString()}
										</span>
										<span>Status: {incident.status}</span>
										{incident.affected_services.length >
											0 && (
											<span>
												Affects:{' '}
												{incident.affected_services.join(
													', ',
												)}
											</span>
										)}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Services Status */}
				<section aria-labelledby='services-title'>
					<h2 className='text-2xl font-bold' id='services-title'>
						Services
					</h2>
					{status.services.map((service) => (
						<Card key={service.id}>
							<CardHeader>
								<div className='flex items-center justify-between'>
									<CardTitle className='text-lg'>
										{service.name}
									</CardTitle>
									<div className='flex items-center gap-4'>
										{service.response_time_ms && (
											<span className='text-sm text-muted-foreground'>
												{service.response_time_ms}ms
											</span>
										)}
										<StatusBadge status={service.status} />
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
									<div className='space-y-4'>
										<div className='grid grid-cols-3 gap-4 text-center'>
											<div>
												<div className='text-lg font-semibold'>
													{service.uptime_today.toFixed(
														1,
													)}
													%
												</div>
												<div className='text-xs text-muted-foreground'>
													Today
												</div>
											</div>
											<div>
												<div className='text-lg font-semibold'>
													{service.uptime_30_day.toFixed(
														1,
													)}
													%
												</div>
												<div className='text-xs text-muted-foreground'>
													30 Days
												</div>
											</div>
											<div>
												<div className='text-lg font-semibold'>
													{service.uptime_90_day.toFixed(
														1,
													)}
													%
												</div>
												<div className='text-xs text-muted-foreground'>
													90 Days
												</div>
											</div>
										</div>
										<div className='text-xs text-muted-foreground'>
											Last checked:{' '}
											{new Date(
												service.last_check,
											).toLocaleString()}
										</div>
									</div>
									<div>
										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant='outline'
													className='w-full'
												>
													View 90-Day History
												</Button>
											</DialogTrigger>
											<DialogContent className='max-w-4xl'>
												<DialogHeader>
													<DialogTitle>
														{service.name} - Uptime
														History
													</DialogTitle>
													<DialogDescription>
														Click on any day to see
														detailed information
													</DialogDescription>
												</DialogHeader>
												<ScrollArea className='h-96'>
													<UptimeGraph
														serviceId={service.id}
														serviceName={
															service.name
														}
													/>
												</ScrollArea>
											</DialogContent>
										</Dialog>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</section>

				{/* Footer */}
				<footer
					className='text-center py-8 text-sm text-muted-foreground'
					role='contentinfo'
				>
					<p>Powered by Watchtower • Real-time status updates</p>
				</footer>
			</main>
		</div>
	)
}
