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
}: { serviceId: string; serviceName: string }) {
	const [uptimeData, setUptimeData] = useState<UptimeDataPoint[]>([])
	const [loading, setLoading] = useState(false)
	const [selectedDay, setSelectedDay] = useState<UptimeDataPoint | null>(null)

	useEffect(() => {
		const fetchUptimeData = async () => {
			setLoading(true)
			try {
				const response = await fetch(`/api/v1/uptime/${serviceId}`)
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
				<h4 className='font-medium'>90-Day Uptime History</h4>
				<span className='text-sm text-muted-foreground'>
					{uptimeData.length} days
				</span>
			</div>

			<div className='grid grid-cols-30 gap-1 h-8'>
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
							title={`${day.date}: ${day.uptime.toFixed(1)}% uptime`}
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
export function StatusPage() {
	const [status, setStatus] = useState<StatusResponse | null>(null)
	const [incidents, setIncidents] = useState<IncidentsResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

	// Fetch status data
	const fetchStatus = async () => {
		try {
			const [statusRes, incidentsRes] = await Promise.all([
				fetch('/api/v1/status'),
				fetch('/api/v1/incidents'),
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

	// Initial fetch
	useEffect(() => {
		fetchStatus()
	}, [])

	// Auto-refresh every 30 seconds
	useEffect(() => {
		const interval = setInterval(fetchStatus, 30000)
		return () => clearInterval(interval)
	}, [])

	// WebSocket for real-time updates
	useEffect(() => {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
		const ws = new WebSocket(
			`${protocol}//${window.location.host}/api/v1/ws`,
		)

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data)
				if (message.type === 'status_update') {
					// Refresh status when we get real-time updates
					fetchStatus()
				}
			} catch (error) {
				console.error('WebSocket message error:', error)
			}
		}

		ws.onerror = (error) => {
			console.error('WebSocket error:', error)
		}

		return () => {
			ws.close()
		}
	}, [])

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
			<div className='border-b'>
				<div className='container mx-auto px-4 py-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold'>
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
			</div>

			<div className='container mx-auto px-4 py-8 space-y-8'>
				{/* Overall Status */}
				<Card>
					<CardHeader>
						<CardTitle>Overall Status</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							<div className='text-center'>
								<div className='text-2xl font-bold'>
									{status.overall.uptime_today.toFixed(1)}%
								</div>
								<div className='text-sm text-muted-foreground'>
									Today
								</div>
							</div>
							<div className='text-center'>
								<div className='text-2xl font-bold'>
									{status.overall.uptime_30_day.toFixed(1)}%
								</div>
								<div className='text-sm text-muted-foreground'>
									30 Days
								</div>
							</div>
							<div className='text-center'>
								<div className='text-2xl font-bold'>
									{status.overall.uptime_90_day.toFixed(1)}%
								</div>
								<div className='text-sm text-muted-foreground'>
									90 Days
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

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
				<div className='space-y-4'>
					<h2 className='text-2xl font-bold'>Services</h2>
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
				</div>

				{/* Footer */}
				<div className='text-center py-8 text-sm text-muted-foreground'>
					<p>
						Powered by Watchtower • Status updates every 30 seconds
					</p>
				</div>
			</div>
		</div>
	)
}
