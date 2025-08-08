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
	TrendingUp,
	ExternalLink,
	AlertTriangle,
	Bell,
	Activity,
	Shield,
} from 'lucide-react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	ResponsiveContainer,
	AreaChart,
	Area,
	ReferenceArea,
} from 'recharts'

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

// Loading shimmer component
function LoadingShimmer() {
	return (
		<div className='animate-pulse space-y-4'>
			<div className='bg-muted rounded-md h-4 w-3/4'></div>
			<div className='bg-muted rounded-md h-3 w-1/2'></div>
			<div className='bg-muted rounded-md h-16 w-full'></div>
			<div className='flex justify-between'>
				<div className='bg-muted rounded-md h-3 w-16'></div>
				<div className='bg-muted rounded-md h-3 w-16'></div>
				<div className='bg-muted rounded-md h-3 w-16'></div>
			</div>
		</div>
	)
}

// Mini chart component for service cards
function ServiceMiniChart({ serviceId }: { serviceId: string }) {
	const [chartData, setChartData] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchMiniChartData = async () => {
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
			try {
				const response = await fetch(
					`${API_BASE_URL}/api/v1/uptime/${serviceId}?period=7d`,
				)
				if (response.ok) {
					const data = await response.json()
					// Last 7 days for mini chart
					const miniData =
						data.data
							?.slice(-7)
							.map((item: any, index: number) => ({
								day: index + 1,
								uptime: item.uptime || 100,
								date: item.date,
							})) || []
					setChartData(miniData)
				}
			} catch (error) {
				console.error('Mini chart data fetch error:', error)
				// Generate mock data for demo
				const mockData = Array.from({ length: 7 }, (_, i) => ({
					day: i + 1,
					uptime: 98 + Math.random() * 2,
					date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
						.toISOString()
						.split('T')[0],
				}))
				setChartData(mockData)
			} finally {
				setLoading(false)
			}
		}
		fetchMiniChartData()
	}, [serviceId])

	if (loading) {
		return <div className='h-12 bg-muted animate-pulse rounded'></div>
	}

	return (
		<div className='h-12 w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<LineChart data={chartData}>
					<Line
						type='monotone'
						dataKey='uptime'
						stroke='#10B981'
						strokeWidth={2}
						dot={false}
					/>
					<YAxis domain={[95, 100]} hide />
					<XAxis dataKey='day' hide />
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}

// Uptime graph component for modal
function UptimeGraph({
	serviceId,
	serviceName,
}: {
	serviceId: string
	serviceName: string
}) {
	const [uptimeData, setUptimeData] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>(
		'90d',
	)

	useEffect(() => {
		const fetchUptimeData = async () => {
			setLoading(true)
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
			try {
				const response = await fetch(
					`${API_BASE_URL}/api/v1/uptime/${serviceId}?period=${selectedPeriod}`,
				)
				if (response.ok) {
					const data = await response.json()
					// Transform data for Recharts
					const chartData =
						data.data?.map((item: any, index: number) => ({
							day: index + 1,
							uptime: item.uptime || 100,
							date: item.date,
							status: item.status || 'operational',
							incidents: item.incidents_count || 0,
						})) || []
					setUptimeData(chartData)
				} else {
					// Generate mock data
					const days =
						selectedPeriod === '30d'
							? 30
							: selectedPeriod === '90d'
								? 90
								: 365
					const mockData = Array.from({ length: days }, (_, i) => ({
						day: i + 1,
						uptime: 97 + Math.random() * 3,
						date: new Date(
							Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000,
						)
							.toISOString()
							.split('T')[0],
						status:
							Math.random() > 0.95 ? 'degraded' : 'operational',
						incidents: Math.random() > 0.9 ? 1 : 0,
					}))
					setUptimeData(mockData)
				}
			} catch (error) {
				console.error('Failed to fetch uptime data:', error)
				// Generate fallback mock data
				const days =
					selectedPeriod === '30d'
						? 30
						: selectedPeriod === '90d'
							? 90
							: 365
				const mockData = Array.from({ length: days }, (_, i) => ({
					day: i + 1,
					uptime: 97 + Math.random() * 3,
					date: new Date(
						Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000,
					)
						.toISOString()
						.split('T')[0],
					status: Math.random() > 0.95 ? 'degraded' : 'operational',
					incidents: Math.random() > 0.9 ? 1 : 0,
				}))
				setUptimeData(mockData)
			} finally {
				setLoading(false)
			}
		}

		fetchUptimeData()
	}, [serviceId, selectedPeriod])

	if (loading) {
		return (
			<div className='h-64 flex items-center justify-center'>
				<RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='flex justify-between items-center'>
				<div className='flex space-x-2'>
					{(['30d', '90d', '1y'] as const).map((period) => (
						<button
							key={period}
							onClick={() => setSelectedPeriod(period)}
							className={cn(
								'px-3 py-1 text-sm font-medium rounded-md transition-colors',
								period === selectedPeriod
									? 'bg-foreground text-background'
									: 'text-muted-foreground hover:text-accent-foreground hover:bg-accent',
							)}
						>
							{period === '30d'
								? '30 days'
								: period === '90d'
									? '90 days'
									: '1 year'}
						</button>
					))}
				</div>
			</div>

			{/* Interactive Recharts Visualization */}
			<div className='h-64'>
				<ResponsiveContainer width='100%' height='100%'>
					<AreaChart data={uptimeData}>
						<XAxis
							dataKey='day'
							tick={{ fontSize: 12 }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							domain={[95, 100]}
							tick={{ fontSize: 12 }}
							axisLine={false}
							tickLine={false}
							label={{
								value: 'Uptime %',
								angle: -90,
								position: 'insideLeft',
							}}
						/>
						<Area
							type='monotone'
							dataKey='uptime'
							stroke='#10B981'
							fill='#6EE7B7'
							fillOpacity={0.3}
							strokeWidth={2}
						/>
						{/* Incident markers */}
						{uptimeData
							.filter((d) => d.incidents > 0)
							.map((incident, i) => (
								<ReferenceArea
									key={i}
									x1={incident.day - 0.5}
									x2={incident.day + 0.5}
									y1={95}
									y2={100}
									fill='#DC2626'
									fillOpacity={0.2}
								/>
							))}
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div className='text-xs text-muted-foreground text-center'>
				Showing uptime percentage over the last{' '}
				{selectedPeriod === '30d'
					? '30 days'
					: selectedPeriod === '90d'
						? '90 days'
						: 'year'}
				. Red areas indicate incidents.
			</div>
		</div>
	)
}

// Main status page component with precise specifications
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
	const [selectedService, setSelectedService] =
		useState<ServiceStatus | null>(null)
	const [selectedIncident, setSelectedIncident] =
		useState<IncidentSummary | null>(null)
	const [timePeriod, setTimePeriod] = useState<'30d' | '90d' | '1y'>('90d')

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

	// Screen 1A: Loading State with centered logo and Accent Mint pulse animation
	if (loading) {
		return (
			<div className='min-h-screen bg-background'>
				{/* Navigation Bar */}
				<nav className='border-b border-border bg-background'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='flex h-16 justify-between items-center'>
							<div className='flex items-center'>
								<Shield className='h-8 w-8 text-foreground' />
								<span className='text-xl font-semibold text-foreground'>
									Watchtower
								</span>
							</div>
							<div className='flex items-center space-x-8'>
								<a
									href='#'
									className='text-sm font-medium text-foreground border-b-2 border-foreground pb-2'
								>
									Status
								</a>
								<Button
									variant='ghost'
									size='sm'
									className='text-muted-foreground hover:text-accent-foreground'
								>
									<Bell className='h-4 w-4' />
									Subscribe to Updates
								</Button>
							</div>
						</div>
					</div>
				</nav>

				{/* Centered Loading Logo */}
				<div className='flex items-center justify-center min-h-[calc(100vh-4rem)]'>
					<div className='text-center'>
						<div className='relative'>
							<Shield
								className='h-16 w-16 mx-auto text-muted-foreground animate-pulse'
								style={{
									animationDuration: '2s',
									color: '#6EE7B7', // Accent Mint
								}}
							/>
							<div
								className='absolute inset-0 rounded-full'
								style={{
									backgroundColor: '#6EE7B7',
									opacity: 0.2,
									animation:
										'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
								}}
							/>
						</div>
						<p className='mt-4 text-sm text-muted-foreground'>
							Loading system status...
						</p>
					</div>
				</div>

				{/* 3-column Services Grid with Shimmer Loading */}
				<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16'>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i} className='p-6'>
								<LoadingShimmer />
							</Card>
						))}
					</div>
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

	// Determine overall system status
	const getSystemStatus = () => {
		if (!status) return 'loading'
		const activeIncidents = incidents?.incidents || []
		const hasOutages = status.services.some((s) => s.status === 'outage')
		const hasDegraded = status.services.some((s) => s.status === 'degraded')

		if (
			hasOutages ||
			activeIncidents.some(
				(i) => i.severity === 'high' || i.severity === 'critical',
			)
		) {
			return 'outage'
		}
		if (hasDegraded || activeIncidents.length > 0) {
			return 'degradation'
		}
		return 'operational'
	}

	const systemStatus = getSystemStatus()

	return (
		<div className='min-h-screen bg-background'>
			{/* Navigation Bar */}
			<nav className='border-b border-border bg-background sticky top-0 z-50'>
				<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
					<div className='flex h-16 justify-between items-center'>
						<div className='flex items-center'>
							<Shield className='h-8 w-8 text-foreground' />
							<span className='text-xl font-semibold text-foreground'>
								Watchtower
							</span>
						</div>
						<div className='flex items-center space-x-8'>
							<a
								href='#'
								className='text-sm font-medium text-foreground border-b-2 border-foreground pb-2'
							>
								Status
							</a>
							<Button
								variant='ghost'
								size='sm'
								className='text-muted-foreground hover:text-accent-foreground'
							>
								<Bell className='h-4 w-4' />
								Subscribe to Updates
							</Button>
						</div>
					</div>
				</div>
			</nav>

			{/* System Status Banner - Screen 1B/1C/1D */}
			{systemStatus === 'operational' && (
				<div className='bg-green-50 border-b border-green-200'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
						<div className='flex items-center'>
							<CheckCircle className='h-6 w-6 text-green-600 mr-3' />
							<div>
								<h1
									className='text-2xl font-bold leading-tight text-foreground'
									style={{
										fontSize: '32px',
										lineHeight: '40px',
									}}
								>
									All Systems Operational
								</h1>
								<p className='text-green-700 text-base mt-1'>
									All services are running smoothly with no
									reported issues.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{systemStatus === 'degradation' && (
				<div className='bg-yellow-50 border-b border-yellow-200'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
						<div className='flex items-center'>
							<AlertTriangle className='h-6 w-6 text-yellow-600 mr-3' />
							<div>
								<h1
									className='text-2xl font-bold leading-tight text-foreground'
									style={{
										fontSize: '32px',
										lineHeight: '40px',
									}}
								>
									Service Degradation
								</h1>
								<p className='text-yellow-700 text-base mt-1'>
									Some services are experiencing performance
									issues. We're monitoring the situation.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{systemStatus === 'outage' && (
				<div className='bg-red-50 border-b border-red-200'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
						<div className='flex items-center'>
							<XCircle className='h-6 w-6 text-red-600 mr-3' />
							<div>
								<h1
									className='text-2xl font-bold leading-tight text-foreground'
									style={{
										fontSize: '32px',
										lineHeight: '40px',
									}}
								>
									Major Service Outage
								</h1>
								<p className='text-red-700 text-base mt-1'>
									We are experiencing significant service
									disruptions. Our team is working to resolve
									the issue.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			<main className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12'>
				{/* Time Period Selector */}
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h2
							className='text-2xl font-semibold text-foreground'
							style={{ fontSize: '24px', lineHeight: '32px' }}
						>
							Services
						</h2>
						<p className='text-muted-foreground mt-1'>
							Current status and uptime for all monitored services
						</p>
					</div>
					<div className='flex items-center space-x-2'>
						<span className='text-sm text-muted-foreground'>
							Show data for:
						</span>
						<div className='flex rounded-md border border-border'>
							{(['30d', '90d', '1y'] as const).map((period) => (
								<button
									key={period}
									onClick={() => setTimePeriod(period)}
									className={cn(
										'px-3 py-1 text-sm font-medium transition-colors',
										period === timePeriod
											? 'bg-foreground text-background'
											: 'text-muted-foreground hover:text-accent-foreground hover:bg-muted/50',
										period === '30d' && 'rounded-l-md',
										period === '1y' && 'rounded-r-md',
									)}
								>
									{period === '30d'
										? '30 days'
										: period === '90d'
											? '90 days'
											: '1 year'}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Active Incidents */}
				{incidents && incidents.incidents.length > 0 && (
					<div className='mb-8 bg-red-50 border border-red-200 rounded-lg p-6'>
						<div className='flex items-center mb-4'>
							<AlertTriangle className='h-5 w-5 text-red-600' />
							<h3 className='text-lg font-semibold text-red-800'>
								Active Incidents
							</h3>
						</div>
						<div className='space-y-4'>
							{incidents.incidents.map((incident) => (
								<div
									key={incident.id}
									onClick={() =>
										setSelectedIncident(incident)
									}
									className='bg-background rounded-md p-4 border border-red-300 cursor-pointer hover:bg-red-25 transition-colors'
								>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<h4 className='font-medium text-foreground'>
												{incident.title}
											</h4>
											<p className='text-sm text-muted-foreground mt-1'>
												{incident.description.length >
												100
													? `${incident.description.substring(0, 100)}...`
													: incident.description}
											</p>
											<p className='text-xs text-muted-foreground mt-2'>
												Started{' '}
												{new Date(
													incident.start_time,
												).toLocaleString()}
											</p>
										</div>
										<div className='flex flex-col items-end space-y-2'>
											<Badge
												className={cn(
													'capitalize',
													incident.severity ===
														'critical' &&
														'bg-red-600 text-white',
													incident.severity ===
														'high' &&
														'bg-red-500 text-white',
													incident.severity ===
														'medium' &&
														'bg-yellow-500 text-white',
													incident.severity ===
														'low' &&
														'bg-blue-500 text-white',
												)}
											>
												{incident.severity}
											</Badge>
											<Badge
												variant='outline'
												className='text-xs'
											>
												{incident.status}
											</Badge>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 3-Column Services Grid */}
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{status.services.map((service) => {
						const getStatusColor = (status: string) => {
							switch (status) {
								case 'operational':
									return {
										bg: 'bg-green-50',
										border: 'border-green-200',
										dot: 'bg-green-500',
									}
								case 'degraded':
									return {
										bg: 'bg-yellow-50',
										border: 'border-yellow-200',
										dot: 'bg-yellow-500',
									}
								case 'outage':
									return {
										bg: 'bg-red-50',
										border: 'border-red-200',
										dot: 'bg-red-500',
									}
								default:
									return {
										bg: 'bg-muted/50',
										border: 'border-border',
										dot: 'bg-muted-foreground',
									}
							}
						}
						const colors = getStatusColor(service.status)

						return (
							<Card
								key={service.id}
								className={cn(
									'cursor-pointer transition-all duration-200 hover:shadow-md',
									colors.bg,
									colors.border,
								)}
								onClick={() => setSelectedService(service)}
							>
								<CardContent className='p-6'>
									{/* Service Header */}
									<div className='flex items-start justify-between mb-4'>
										<div className='flex items-center space-x-3'>
											<div
												className={cn(
													'w-3 h-3 rounded-full',
													colors.dot,
												)}
											/>
											<div>
												<h3 className='font-semibold text-foreground text-base'>
													{service.name}
												</h3>
												<p className='text-sm text-muted-foreground capitalize'>
													{service.status}
												</p>
											</div>
										</div>
										<div className='text-right'>
											<div className='text-sm font-medium text-foreground'>
												{service[
													timePeriod === '30d'
														? 'uptime_30_day'
														: timePeriod === '1y'
															? 'uptime_90_day'
															: 'uptime_90_day'
												].toFixed(1)}
												%
											</div>
											<div className='text-xs text-muted-foreground'>
												{timePeriod === '30d'
													? '30d'
													: timePeriod === '1y'
														? '1y'
														: '90d'}{' '}
												uptime
											</div>
										</div>
									</div>

									{/* Mini Chart */}
									<div className='mb-4'>
										<ServiceMiniChart
											serviceId={service.id}
										/>
									</div>

									{/* Metrics */}
									<div className='flex justify-between items-center text-sm text-muted-foreground'>
										<div className='flex items-center space-x-1'>
											<Activity className='w-3 h-3' />
											<span>
												{service.response_time_ms || 0}
												ms
											</span>
										</div>
										<div className='text-xs'>
											Last check:{' '}
											{new Date(
												service.last_check,
											).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>

				{/* Service Detail Modal - Screen 2 */}
				<Dialog
					open={!!selectedService}
					onOpenChange={() => setSelectedService(null)}
				>
					<DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
						<DialogHeader>
							<DialogTitle className='text-xl font-semibold text-foreground'>
								{selectedService?.name} Service Details
							</DialogTitle>
							<DialogDescription className='text-muted-foreground'>
								Detailed uptime metrics and performance data
							</DialogDescription>
						</DialogHeader>
						{selectedService && (
							<div className='space-y-6'>
								{/* Service Overview */}
								<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
									<div className='bg-muted/50 rounded-lg p-4'>
										<div className='text-sm text-muted-foreground'>
											Current Status
										</div>
										<div className='text-lg font-semibold capitalize text-foreground'>
											{selectedService.status}
										</div>
									</div>
									<div className='bg-muted/50 rounded-lg p-4'>
										<div className='text-sm text-muted-foreground'>
											Response Time
										</div>
										<div className='text-lg font-semibold text-foreground'>
											{selectedService.response_time_ms ||
												0}
											ms
										</div>
									</div>
									<div className='bg-muted/50 rounded-lg p-4'>
										<div className='text-sm text-muted-foreground'>
											90-Day Uptime
										</div>
										<div className='text-lg font-semibold text-foreground'>
											{selectedService.uptime_90_day.toFixed(
												2,
											)}
											%
										</div>
									</div>
								</div>

								{/* Interactive Uptime Chart */}
								<div className='bg-background border border-border rounded-lg p-6'>
									<h4 className='text-lg font-semibold text-foreground mb-4'>
										Uptime History
									</h4>
									<UptimeGraph
										serviceId={selectedService.id}
										serviceName={selectedService.name}
									/>
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>

				{/* Incident Detail Modal - Screen 3 */}
				<Dialog
					open={!!selectedIncident}
					onOpenChange={() => setSelectedIncident(null)}
				>
					<DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
						<DialogHeader>
							<DialogTitle className='text-xl font-semibold text-foreground'>
								{selectedIncident?.title}
							</DialogTitle>
							<DialogDescription className='text-muted-foreground'>
								Incident #{selectedIncident?.id.slice(0, 8)} •{' '}
								{selectedIncident?.severity} severity
							</DialogDescription>
						</DialogHeader>
						{selectedIncident && (
							<div className='space-y-6'>
								{/* Incident Overview */}
								<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
									<div className='flex items-center justify-between mb-2'>
										<Badge
											className={cn(
												'capitalize',
												selectedIncident.severity ===
													'critical' &&
													'bg-red-600 text-white',
												selectedIncident.severity ===
													'high' &&
													'bg-red-500 text-white',
												selectedIncident.severity ===
													'medium' &&
													'bg-yellow-500 text-white',
												selectedIncident.severity ===
													'low' &&
													'bg-blue-500 text-white',
											)}
										>
											{selectedIncident.severity} severity
										</Badge>
										<Badge
											variant='outline'
											className='capitalize'
										>
											{selectedIncident.status}
										</Badge>
									</div>
									<p className='text-red-800 text-sm'>
										{selectedIncident.description}
									</p>
									<div className='mt-3 text-xs text-red-700'>
										Started:{' '}
										{new Date(
											selectedIncident.start_time,
										).toLocaleString()}
										{selectedIncident.end_time && (
											<>
												{' '}
												• Resolved:{' '}
												{new Date(
													selectedIncident.end_time,
												).toLocaleString()}
											</>
										)}
									</div>
								</div>

								{/* Affected Services */}
								{selectedIncident.affected_services.length >
									0 && (
									<div>
										<h4 className='font-semibold text-foreground mb-2'>
											Affected Services
										</h4>
										<div className='flex flex-wrap gap-2'>
											{selectedIncident.affected_services.map(
												(serviceName, index) => (
													<Badge
														key={index}
														variant='outline'
													>
														{serviceName}
													</Badge>
												),
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</DialogContent>
				</Dialog>
			</main>
		</div>
	)
}
