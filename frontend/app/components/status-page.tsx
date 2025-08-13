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
	ChevronRight,
	Wifi,
	WifiOff,
	Zap,
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
	BarChart,
	Bar,
	Tooltip,
	CartesianGrid,
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
			<div className='bg-muted rounded-md h-4 w-3/4' />
			<div className='bg-muted rounded-md h-3 w-1/2' />
			<div className='bg-muted rounded-md h-16 w-full' />
			<div className='flex justify-between'>
				<div className='bg-muted rounded-md h-3 w-16' />
				<div className='bg-muted rounded-md h-3 w-16' />
				<div className='bg-muted rounded-md h-3 w-16' />
			</div>
		</div>
	)
}

// Railway-style uptime bar component
function UptimeHistoryBar({
	serviceId,
	days = 90,
}: {
	serviceId: string
	days?: number
}) {
	const [historyData, setHistoryData] = useState<any[]>([])
	const [incidents, setIncidents] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchHistoryData = async () => {
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
			try {
				const [uptimeResponse, incidentsResponse] = await Promise.all([
					fetch(
						`${API_BASE_URL}/api/v1/uptime/${serviceId}?period=${days}d`,
					),
					fetch(
						`${API_BASE_URL}/api/v1/incidents?service=${serviceId}`,
					),
				])

				let dayData: any[] = []
				let incidentData: any[] = []

				if (uptimeResponse.ok) {
					const data = await uptimeResponse.json()
					dayData =
						data.data?.map((item: any) => ({
							date: item.date,
							status:
								item.status ||
								(item.uptime >= 99.9
									? 'operational'
									: item.uptime >= 95
										? 'degraded'
										: 'outage'),
							uptime: item.uptime || 100,
						})) || []
				}

				if (incidentsResponse.ok) {
					const incData = await incidentsResponse.json()
					incidentData = incData.incidents || []
				}

				// Generate mock data if API fails
				if (dayData.length === 0) {
					dayData = Array.from({ length: days }, (_, i) => {
						const random = Math.random()
						const date = new Date(
							Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000,
						)
							.toISOString()
							.split('T')[0]
						return {
							date,
							status:
								random > 0.98
									? 'outage'
									: random > 0.95
										? 'degraded'
										: 'operational',
							uptime:
								random > 0.98
									? 0
									: random > 0.95
										? 95 + Math.random() * 4
										: 99 + Math.random(),
							hasIncident: random > 0.97,
						}
					})
				}

				setHistoryData(dayData)
				setIncidents(incidentData)
			} catch (error) {
				console.error('Failed to fetch uptime data:', error)
				// Fallback mock data
				const mockData = Array.from({ length: days }, (_, i) => {
					const random = Math.random()
					return {
						date: new Date(
							Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000,
						)
							.toISOString()
							.split('T')[0],
						status:
							random > 0.98
								? 'outage'
								: random > 0.95
									? 'degraded'
									: 'operational',
						uptime:
							random > 0.98
								? 0
								: random > 0.95
									? 95 + Math.random() * 4
									: 99 + Math.random(),
						hasIncident: random > 0.97,
					}
				})
				setHistoryData(mockData)
			} finally {
				setLoading(false)
			}
		}
		fetchHistoryData()
	}, [serviceId, days])

	if (loading) {
		return (
			<div className='flex justify-between items-center'>
				<div className='h-12 bg-neutral-100 rounded flex-1 animate-pulse' />
			</div>
		)
	}

	return (
		<div className='flex items-center justify-between'>
			<span className='text-xs text-neutral-500 w-20'>90 DAYS AGO</span>
			<div className='flex-1 mx-4 flex space-x-0.5'>
				{historyData.map((day, index) => {
					const getBarColor = () => {
						switch (day.status) {
							case 'operational':
								return 'bg-emerald-500'
							case 'degraded':
								return 'bg-amber-500'
							case 'outage':
								return 'bg-red-500'
							default:
								return 'bg-emerald-500'
						}
					}

					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<div key={index} className='relative group'>
							{/* Main status bar */}
							<div
								className={cn(
									'w-1 h-8 rounded-sm transition-all cursor-pointer',
									getBarColor(),
								)}
							/>

							{/* Incident marker */}
							{day.hasIncident && (
								<div className='absolute -top-1 left-1/2 transform -translate-x-1/2'>
									<div className='w-2 h-2 bg-amber-400 rounded-full border border-white' />
								</div>
							)}

							{/* Tooltip */}
							<div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
								<div className='font-medium'>{day.date}</div>
								<div>{day.uptime.toFixed(2)}% uptime</div>
								{day.hasIncident && (
									<div className='text-amber-400'>
										• Incident reported
									</div>
								)}
							</div>
						</div>
					)
				})}
			</div>
			<span className='text-xs text-neutral-500 w-12 text-right'>
				TODAY
			</span>
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
		return <div className='h-12 bg-muted animate-pulse rounded' />
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
				<div className='flex space-x-1 bg-neutral-100 rounded-lg p-1'>
					{(['30d', '90d', '1y'] as const).map((period) => (
						<Button
							key={period}
							onClick={() => setSelectedPeriod(period)}
							className={cn(
								'px-3 py-1 text-sm font-medium rounded-md transition-colors',
								period === selectedPeriod
									? 'bg-white text-neutral-900 shadow-sm'
									: 'text-neutral-600 hover:text-neutral-900',
							)}
						>
							{period === '30d'
								? '30 days'
								: period === '90d'
									? '90 days'
									: '1 year'}
						</Button>
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
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
	const [selectedIncident, setSelectedIncident] =
		useState<IncidentSummary | null>(null)

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
						}
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
										start_time: updatedIncident.start_time,
										end_time: updatedIncident.end_time,
										affected_services: [],
									},
								],
							}
						}
						return prev
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

	// Loading State
	if (loading) {
		return (
			<div className='min-h-screen bg-neutral-50'>
				{/* Navigation Bar */}
				<nav className='bg-white border-b border-neutral-200'>
					<div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8'>
						<div className='flex h-16 justify-between items-center'>
							<div className='flex items-center space-x-3'>
								<div className='w-8 h-8 bg-black rounded flex items-center justify-center'>
									<Zap className='h-5 w-5 text-white' />
								</div>
								<span className='text-xl font-semibold text-neutral-900'>
									Watchtower Status
								</span>
							</div>
						</div>
					</div>
				</nav>

				{/* Loading Content */}
				<div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12'>
					<div className='animate-pulse'>
						<div className='h-8 bg-neutral-200 rounded w-1/4 mb-8' />
						<div className='space-y-4'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									key={i}
									className='bg-white rounded-lg p-6 border border-neutral-200'
								>
									<div className='flex items-center justify-between'>
										<div className='space-y-2'>
											<div className='h-4 bg-neutral-200 rounded w-32' />
											<div className='h-3 bg-neutral-100 rounded w-20' />
										</div>
										<div className='h-8 bg-neutral-200 rounded w-16' />
									</div>
								</div>
							))}
						</div>
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
		<div className='min-h-screen bg-neutral-50'>
			{/* Navigation Bar */}
			<nav className='bg-white border-b border-neutral-200 sticky top-0 z-50'>
				<div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8'>
					<div className='flex h-16 justify-between items-center'>
						<div className='flex items-center space-x-3'>
							<div className='w-8 h-8 bg-black rounded flex items-center justify-center'>
								<Zap className='h-5 w-5 text-white' />
							</div>
							<span className='text-xl font-semibold text-neutral-900'>
								Watchtower Status
							</span>
						</div>
						<div className='flex items-center space-x-6'>
							<Button
								className='cursor-pointer'
								size='sm'
								variant='ghost'
							>
								<Bell className='h-4 w-4' />
								<span>Subscribe</span>
							</Button>
						</div>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12'>
				{/* System Status Header */}
				<div className='mb-12'>
					{systemStatus === 'operational' && (
						<div className='flex items-center space-x-3'>
							<div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center'>
								<CheckCircle className='h-7 w-7 text-green-600' />
							</div>
							<div>
								<h1 className='text-3xl font-bold text-neutral-900'>
									All systems operational
								</h1>
								<p className='text-neutral-600 mt-1'>
									All services are running normally
								</p>
							</div>
						</div>
					)}

					{systemStatus === 'degradation' && (
						<div className='flex items-center space-x-3'>
							<div className='w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center'>
								<AlertTriangle className='h-7 w-7 text-amber-600' />
							</div>
							<div>
								<h1 className='text-3xl font-bold text-neutral-900'>
									Partial service disruption
								</h1>
								<p className='text-neutral-600 mt-1'>
									Some services are experiencing issues
								</p>
							</div>
						</div>
					)}

					{systemStatus === 'outage' && (
						<div className='flex items-center space-x-3'>
							<div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
								<XCircle className='h-7 w-7 text-red-600' />
							</div>
							<div>
								<h1 className='text-3xl font-bold text-neutral-900'>
									Major service outage
								</h1>
								<p className='text-neutral-600 mt-1'>
									We are working to restore service
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Current Status Section */}
				<div className='mb-8'>
					<div className='flex items-center justify-between mb-6'>
						<h2 className='text-lg font-semibold text-neutral-900'>
							Current status
						</h2>
						<div className='flex items-center space-x-2 text-sm text-neutral-500'>
							<Clock className='h-4 w-4' />
							<span>
								Last updated{' '}
								{new Date(lastRefresh).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</div>
					</div>

					{/* Active Incidents */}
					{incidents && incidents.incidents.length > 0 && (
						<div className='mb-6'>
							<div className='bg-amber-50 border border-amber-200 rounded-lg p-4'>
								<div className='flex items-start space-x-3'>
									<AlertTriangle className='h-5 w-5 text-amber-600 mt-0.5' />
									<div className='flex-1'>
										<h3 className='font-semibold text-amber-900 mb-2'>
											Active Incidents
										</h3>
										<div className='space-y-2'>
											{incidents.incidents.map(
												(incident) => (
													<Button
														key={incident.id}
														onClick={() =>
															setSelectedIncident(
																incident,
															)
														}
														className='text-left w-full group hover:bg-amber-100 rounded p-2 transition-colors'
													>
														<div className='flex items-center justify-between'>
															<span className='font-medium text-amber-900'>
																{incident.title}
															</span>
															<ChevronRight className='h-4 w-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity' />
														</div>
														<p className='text-sm text-amber-700 mt-1'>
															{incident
																.description
																.length > 100
																? `${incident.description.substring(0, 100)}...`
																: incident.description}
														</p>
													</Button>
												),
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Services with Railway-style bars */}
					<div className='space-y-4'>
						{status.services.map((service) => {
							const getStatusIcon = (status: string) => {
								switch (status) {
									case 'operational':
										return (
											<CheckCircle className='h-5 w-5 text-emerald-600' />
										)
									case 'degraded':
										return (
											<AlertTriangle className='h-5 w-5 text-amber-600' />
										)
									case 'outage':
										return (
											<XCircle className='h-5 w-5 text-red-600' />
										)
									default:
										return (
											<AlertCircle className='h-5 w-5 text-neutral-400' />
										)
								}
							}

							return (
								<div
									key={service.id}
									className='bg-white border border-neutral-200 rounded-lg p-4'
								>
									{/* Service header */}
									<div className='flex items-center justify-between mb-4'>
										<div className='flex items-center space-x-3'>
											{getStatusIcon(service.status)}
											<div>
												<h3 className='font-semibold text-neutral-900'>
													{service.name}
												</h3>
												<p className='text-sm text-neutral-500 capitalize'>
													{service.status}
												</p>
											</div>
										</div>
										<div className='text-right'>
											<div className='text-lg font-semibold text-neutral-900'>
												{service.uptime_90_day.toFixed(
													2,
												)}
												%
											</div>
											<div className='text-sm text-neutral-500'>
												uptime
											</div>
										</div>
									</div>

									{/* Railway-style uptime bar */}
									<UptimeHistoryBar
										serviceId={service.id}
										days={90}
									/>
								</div>
							)
						})}
					</div>
				</div>

				{/* Incident History Section */}
				<div className='mt-12'>
					<h2 className='text-lg font-semibold text-neutral-900 mb-6'>
						Incident History
					</h2>

					{incidents && incidents.incidents.length > 0 ? (
						<div className='space-y-4'>
							{incidents.incidents.slice(0, 5).map((incident) => (
								<div
									key={incident.id}
									className='bg-white border border-neutral-200 rounded-lg p-4'
								>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<div className='flex items-center space-x-2 mb-2'>
												<Badge
													variant={
														incident.status ===
														'resolved'
															? 'secondary'
															: 'destructive'
													}
													className='text-xs'
												>
													{incident.status}
												</Badge>
												<span className='text-sm text-neutral-500'>
													{new Date(
														incident.start_time,
													).toLocaleDateString()}
												</span>
											</div>
											<h4 className='font-semibold text-neutral-900 mb-2'>
												{incident.title}
											</h4>
											<p className='text-neutral-600 text-sm'>
												{incident.description}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className='bg-white border border-neutral-200 rounded-lg p-8 text-center'>
							<CheckCircle className='h-8 w-8 text-emerald-500 mx-auto mb-3' />
							<h3 className='font-semibold text-neutral-900 mb-2'>
								No incidents reported
							</h3>
							<p className='text-neutral-500 text-sm'>
								All systems have been operating normally.
							</p>
						</div>
					)}
				</div>

				{/* Incident Detail Modal */}
				<Dialog
					open={!!selectedIncident}
					onOpenChange={() => setSelectedIncident(null)}
				>
					<DialogContent className='max-w-2xl'>
						<DialogHeader>
							<DialogTitle className='text-xl font-semibold text-neutral-900'>
								Incident Details
							</DialogTitle>
						</DialogHeader>
						{selectedIncident && (
							<div className='space-y-4'>
								<div>
									<h3 className='font-semibold text-neutral-900 mb-2'>
										{selectedIncident.title}
									</h3>
									<div className='flex items-center space-x-2 mb-3'>
										<Badge
											className={cn(
												'capitalize',
												selectedIncident.severity ===
													'critical' &&
													'bg-red-100 text-red-700 border-red-200',
												selectedIncident.severity ===
													'high' &&
													'bg-orange-100 text-orange-700 border-orange-200',
												selectedIncident.severity ===
													'medium' &&
													'bg-amber-100 text-amber-700 border-amber-200',
												selectedIncident.severity ===
													'low' &&
													'bg-blue-100 text-blue-700 border-blue-200',
											)}
											variant='outline'
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
									<p className='text-neutral-600'>
										{selectedIncident.description}
									</p>
								</div>

								<Separator />

								<div>
									<h4 className='font-medium text-neutral-900 mb-2'>
										Timeline
									</h4>
									<div className='space-y-2 text-sm'>
										<div className='flex items-center space-x-2'>
											<Clock className='h-4 w-4 text-neutral-400' />
											<span className='text-neutral-600'>
												Started:{' '}
												{new Date(
													selectedIncident.start_time,
												).toLocaleString()}
											</span>
										</div>
										{selectedIncident.end_time && (
											<div className='flex items-center space-x-2'>
												<CheckCircle className='h-4 w-4 text-green-500' />
												<span className='text-neutral-600'>
													Resolved:{' '}
													{new Date(
														selectedIncident.end_time,
													).toLocaleString()}
												</span>
											</div>
										)}
									</div>
								</div>

								{selectedIncident.affected_services.length >
									0 && (
									<>
										<Separator />
										<div>
											<h4 className='font-medium text-neutral-900 mb-2'>
												Affected Services
											</h4>
											<div className='flex flex-wrap gap-2'>
												{selectedIncident.affected_services.map(
													(serviceName, index) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
														<Badge
															key={index}
															variant='secondary'
														>
															{serviceName}
														</Badge>
													),
												)}
											</div>
										</div>
									</>
								)}
							</div>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
