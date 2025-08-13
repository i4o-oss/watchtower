import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import {
	TrendingUp,
	TrendingDown,
	Activity,
	AlertTriangle,
	Clock,
	Globe,
	ArrowUpRight,
	ArrowDownRight,
	Minus,
} from 'lucide-react'
import type { Route } from './+types/analytics'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Analytics Overview - Admin - Watchtower' },
		{
			name: 'description',
			content: 'System health and performance analytics dashboard',
		},
	]
}

interface AnalyticsData {
	kpis: {
		overallUptime: number
		uptimeTrend: 'up' | 'down' | 'stable'
		activeEndpoints: number
		endpointsByStatus: {
			healthy: number
			degraded: number
			down: number
		}
		activeIncidents: number
		incidentsBySeverity: {
			critical: number
			high: number
			medium: number
			low: number
		}
		averageResponseTime: number
		responseTimeTrend: 'up' | 'down' | 'stable'
	}
	chartData: {
		responseTimeHistory: Array<{
			timestamp: string
			avgResponseTime: number
			p95ResponseTime: number
			p99ResponseTime: number
		}>
		statusHeatmap: Array<{
			endpointId: string
			endpointName: string
			hourlyStatus: Array<{
				hour: string
				status: 'up' | 'down' | 'degraded'
				uptime: number
			}>
		}>
		endpointPerformance: Array<{
			endpointId: string
			endpointName: string
			avgResponseTime: number
			errorRate: number
			uptime: number
		}>
	}
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const url = new URL(request.url)
	const timeRange = url.searchParams.get('timeRange') || '24'

	try {
		const [logsRes, endpointsRes, incidentsRes] = await Promise.all([
			fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=1000`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			),
			fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(`${API_BASE_URL}/api/v1/admin/incidents`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
		])

		const logs = logsRes.ok ? await logsRes.json() : { logs: [] }
		const endpoints = endpointsRes.ok
			? await endpointsRes.json()
			: { endpoints: [] }
		const incidents = incidentsRes.ok
			? await incidentsRes.json()
			: { incidents: [] }

		return { logs, endpoints, incidents, timeRange }
	} catch (error) {
		console.error('Error loading analytics data:', error)
		return {
			logs: { logs: [] },
			endpoints: { endpoints: [] },
			incidents: { incidents: [] },
			timeRange,
		}
	}
}

export default function AdminAnalytics({ loaderData }: Route.ComponentProps) {
	const {
		logs: initialLogs,
		endpoints,
		incidents,
		timeRange: initialTimeRange,
	} = loaderData
	const [logs, setLogs] = useState(initialLogs.logs)
	const [searchParams, setSearchParams] = useSearchParams()
	const timeRange = searchParams.get('timeRange') || initialTimeRange || '24'

	const updateTimeRange = (value: string) => {
		const newParams = new URLSearchParams(searchParams)
		if (value === '24') {
			newParams.delete('timeRange')
		} else {
			newParams.set('timeRange', value)
		}
		setSearchParams(newParams, { replace: true })
	}

	// Calculate analytics data
	const analyticsData: AnalyticsData = useMemo(() => {
		const now = new Date()
		const timeRangeHours = Number.parseInt(timeRange)
		const timeRangeMs = timeRangeHours * 60 * 60 * 1000
		const startTime = new Date(now.getTime() - timeRangeMs)

		// Filter logs within time range
		const recentLogs = logs.filter(
			(log: any) => new Date(log.timestamp) >= startTime,
		)

		// Create endpoint lookup
		const endpointMap = endpoints.endpoints.reduce(
			(acc: any, endpoint: any) => {
				acc[endpoint.id] = endpoint
				return acc
			},
			{},
		)

		// Calculate KPIs
		const totalChecks = recentLogs.length
		const successfulChecks = recentLogs.filter(
			(log: any) => log.success,
		).length
		const overallUptime =
			totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100

		// Calculate response time average
		const responseTimes = recentLogs
			.filter((log: any) => log.success && log.response_time_ms)
			.map((log: any) => log.response_time_ms)
		const averageResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((a: number, b: number) => a + b, 0) /
					responseTimes.length
				: 0

		// Get active incidents
		const activeIncidents = incidents.incidents.filter(
			(incident: any) => incident.status !== 'resolved',
		)

		// Group incidents by severity
		const incidentsBySeverity = activeIncidents.reduce(
			(acc: any, incident: any) => {
				const severity = incident.severity || 'medium'
				acc[severity] = (acc[severity] || 0) + 1
				return acc
			},
			{ critical: 0, high: 0, medium: 0, low: 0 },
		)

		// Endpoint status analysis
		const endpointStatus = endpoints.endpoints.map((endpoint: any) => {
			const endpointLogs = recentLogs.filter(
				(log: any) => log.endpoint_id === endpoint.id,
			)
			const successfulLogs = endpointLogs.filter(
				(log: any) => log.success,
			)
			const uptime =
				endpointLogs.length > 0
					? (successfulLogs.length / endpointLogs.length) * 100
					: 100

			let status = 'healthy'
			if (uptime < 50) status = 'down'
			else if (uptime < 95) status = 'degraded'

			return { ...endpoint, uptime, status }
		})

		const endpointsByStatus = endpointStatus.reduce(
			(acc: any, endpoint: any) => {
				acc[endpoint.status] = (acc[endpoint.status] || 0) + 1
				return acc
			},
			{ healthy: 0, degraded: 0, down: 0 },
		)

		// Response time history (hourly buckets)
		const responseTimeHistory = []
		const hours = Math.min(timeRangeHours, 24) // Limit to 24 hours for hourly buckets
		for (let i = hours - 1; i >= 0; i--) {
			const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000)
			const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000)

			const hourLogs = recentLogs.filter((log: any) => {
				const logTime = new Date(log.timestamp)
				return (
					logTime >= hourStart &&
					logTime < hourEnd &&
					log.success &&
					log.response_time_ms
				)
			})

			const hourResponseTimes = hourLogs
				.map((log: any) => log.response_time_ms)
				.sort((a: number, b: number) => a - b)
			const avgResponseTime =
				hourResponseTimes.length > 0
					? hourResponseTimes.reduce(
							(a: number, b: number) => a + b,
							0,
						) / hourResponseTimes.length
					: 0

			const p95Index = Math.floor(hourResponseTimes.length * 0.95)
			const p99Index = Math.floor(hourResponseTimes.length * 0.99)

			responseTimeHistory.push({
				timestamp: hourStart.toISOString(),
				avgResponseTime: Math.round(avgResponseTime),
				p95ResponseTime: hourResponseTimes[p95Index] || 0,
				p99ResponseTime: hourResponseTimes[p99Index] || 0,
			})
		}

		// Status heatmap (last 24 hours)
		const statusHeatmap = endpoints.endpoints
			.slice(0, 10)
			.map((endpoint: any) => {
				const hourlyStatus = []
				for (let i = 23; i >= 0; i--) {
					const hourStart = new Date(
						now.getTime() - (i + 1) * 60 * 60 * 1000,
					)
					const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000)

					const hourLogs = recentLogs.filter((log: any) => {
						const logTime = new Date(log.timestamp)
						return (
							logTime >= hourStart &&
							logTime < hourEnd &&
							log.endpoint_id === endpoint.id
						)
					})

					const successfulLogs = hourLogs.filter(
						(log: any) => log.success,
					)
					const uptime =
						hourLogs.length > 0
							? (successfulLogs.length / hourLogs.length) * 100
							: 100

					let status = 'up'
					if (uptime < 50) status = 'down'
					else if (uptime < 95) status = 'degraded'

					hourlyStatus.push({
						hour:
							hourStart.getHours().toString().padStart(2, '0') +
							':00',
						status: status as 'up' | 'down' | 'degraded',
						uptime: Math.round(uptime),
					})
				}

				return {
					endpointId: endpoint.id,
					endpointName: endpoint.name,
					hourlyStatus,
				}
			})

		// Endpoint performance summary
		const endpointPerformance = endpoints.endpoints
			.map((endpoint: any) => {
				const endpointLogs = recentLogs.filter(
					(log: any) => log.endpoint_id === endpoint.id,
				)
				const successfulLogs = endpointLogs.filter(
					(log: any) => log.success,
				)
				const failedLogs = endpointLogs.filter(
					(log: any) => !log.success,
				)

				const uptime =
					endpointLogs.length > 0
						? (successfulLogs.length / endpointLogs.length) * 100
						: 100
				const errorRate =
					endpointLogs.length > 0
						? (failedLogs.length / endpointLogs.length) * 100
						: 0

				const responseTimes = successfulLogs
					.filter((log: any) => log.response_time_ms)
					.map((log: any) => log.response_time_ms)
				const avgResponseTime =
					responseTimes.length > 0
						? responseTimes.reduce(
								(a: number, b: number) => a + b,
								0,
							) / responseTimes.length
						: 0

				return {
					endpointId: endpoint.id,
					endpointName: endpoint.name,
					avgResponseTime: Math.round(avgResponseTime),
					errorRate: Math.round(errorRate * 100) / 100,
					uptime: Math.round(uptime * 100) / 100,
				}
			})
			.sort((a, b) => b.uptime - a.uptime)

		return {
			kpis: {
				overallUptime: Math.round(overallUptime * 100) / 100,
				uptimeTrend: 'stable', // TODO: Calculate trend
				activeEndpoints: endpoints.endpoints.length,
				endpointsByStatus,
				activeIncidents: activeIncidents.length,
				incidentsBySeverity,
				averageResponseTime: Math.round(averageResponseTime),
				responseTimeTrend: 'stable', // TODO: Calculate trend
			},
			chartData: {
				responseTimeHistory,
				statusHeatmap,
				endpointPerformance,
			},
		}
	}, [logs, endpoints, incidents, timeRange])

	const refreshData = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=1000`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				const newLogs = await response.json()
				setLogs(newLogs.logs)
			}
		} catch (error) {
			console.error('Error refreshing analytics data:', error)
		}
	}

	useEffect(() => {
		refreshData()
	}, [timeRange])

	// Real-time updates via SSE
	useSSE({
		status_update: () => {
			setTimeout(refreshData, 1000)
		},
	})

	const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
		switch (trend) {
			case 'up':
				return <ArrowUpRight className='h-4 w-4 text-green-600' />
			case 'down':
				return <ArrowDownRight className='h-4 w-4 text-red-600' />
			default:
				return <Minus className='h-4 w-4 text-muted-foreground' />
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'up':
			case 'healthy':
				return 'bg-green-500'
			case 'degraded':
				return 'bg-yellow-500'
			case 'down':
				return 'bg-red-500'
			default:
				return 'bg-muted'
		}
	}

	return (
		<div className='min-h-screen bg-gradient-to-br from-white to-slate-50'>
			{/* Header */}
			<div className='border-b bg-white/50 backdrop-blur-sm'>
				<div className='container mx-auto px-6 py-6'>
					<div className='flex justify-between items-center'>
						<div>
							<h1 className='text-3xl font-bold text-slate-900'>
								Analytics Dashboard
							</h1>
							<p className='text-slate-600 mt-1'>
								System health and performance monitoring
							</p>
						</div>
						<div className='flex items-center gap-4'>
							<Select
								value={timeRange}
								onValueChange={updateTimeRange}
							>
								<SelectTrigger className='w-48'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='1'>Last Hour</SelectItem>
									<SelectItem value='6'>
										Last 6 Hours
									</SelectItem>
									<SelectItem value='24'>
										Last 24 Hours
									</SelectItem>
									<SelectItem value='168'>
										Last Week
									</SelectItem>
									<SelectItem value='720'>
										Last 30 Days
									</SelectItem>
								</SelectContent>
							</Select>
							<Button onClick={refreshData} variant='outline'>
								Refresh
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className='container mx-auto px-6 py-8 space-y-8'>
				{/* KPI Cards */}
				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Overall Uptime
									</p>
									<div className='flex items-center gap-2 mt-2'>
										<p className='text-3xl font-bold text-slate-900'>
											{analyticsData.kpis.overallUptime}%
										</p>
										{getTrendIcon(
											analyticsData.kpis.uptimeTrend,
										)}
									</div>
								</div>
								<div className='p-3 bg-green-100 rounded-full'>
									<Activity className='h-6 w-6 text-green-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Active Endpoints
									</p>
									<p className='text-3xl font-bold text-slate-900 mt-2'>
										{analyticsData.kpis.activeEndpoints}
									</p>
									<div className='flex gap-2 mt-2'>
										<Badge
											variant='outline'
											className='text-xs bg-green-50 text-green-700 border-green-200'
										>
											{
												analyticsData.kpis
													.endpointsByStatus.healthy
											}{' '}
											Healthy
										</Badge>
										{analyticsData.kpis.endpointsByStatus
											.degraded > 0 && (
											<Badge
												variant='outline'
												className='text-xs bg-yellow-50 text-yellow-700 border-yellow-200'
											>
												{
													analyticsData.kpis
														.endpointsByStatus
														.degraded
												}{' '}
												Degraded
											</Badge>
										)}
										{analyticsData.kpis.endpointsByStatus
											.down > 0 && (
											<Badge
												variant='outline'
												className='text-xs bg-red-50 text-red-700 border-red-200'
											>
												{
													analyticsData.kpis
														.endpointsByStatus.down
												}{' '}
												Down
											</Badge>
										)}
									</div>
								</div>
								<div className='p-3 bg-blue-100 rounded-full'>
									<Globe className='h-6 w-6 text-blue-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Active Incidents
									</p>
									<p className='text-3xl font-bold text-slate-900 mt-2'>
										{analyticsData.kpis.activeIncidents}
									</p>
									{analyticsData.kpis.activeIncidents > 0 && (
										<div className='flex gap-2 mt-2'>
											{analyticsData.kpis
												.incidentsBySeverity.critical >
												0 && (
												<Badge
													variant='destructive'
													className='text-xs'
												>
													{
														analyticsData.kpis
															.incidentsBySeverity
															.critical
													}{' '}
													Critical
												</Badge>
											)}
											{analyticsData.kpis
												.incidentsBySeverity.high >
												0 && (
												<Badge
													variant='secondary'
													className='text-xs bg-orange-100 text-orange-700'
												>
													{
														analyticsData.kpis
															.incidentsBySeverity
															.high
													}{' '}
													High
												</Badge>
											)}
										</div>
									)}
								</div>
								<div className='p-3 bg-red-100 rounded-full'>
									<AlertTriangle className='h-6 w-6 text-red-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Avg Response Time
									</p>
									<div className='flex items-center gap-2 mt-2'>
										<p className='text-3xl font-bold text-slate-900'>
											{
												analyticsData.kpis
													.averageResponseTime
											}
											ms
										</p>
										{getTrendIcon(
											analyticsData.kpis
												.responseTimeTrend,
										)}
									</div>
								</div>
								<div className='p-3 bg-purple-100 rounded-full'>
									<Clock className='h-6 w-6 text-purple-600' />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Tabs for different views */}
				<Tabs defaultValue='overview' className='w-full'>
					<TabsList className='grid w-full grid-cols-2'>
						<TabsTrigger value='overview'>
							System Health Dashboard
						</TabsTrigger>
						<TabsTrigger value='performance'>
							Performance Deep Dive
						</TabsTrigger>
					</TabsList>

					<TabsContent value='overview' className='space-y-6'>
						{/* Status Heatmap */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle>Service Health Over Time</CardTitle>
								<CardDescription>
									24-hour status heatmap showing uptime for
									each endpoint
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{analyticsData.chartData.statusHeatmap.map(
										(endpoint) => (
											<div
												key={endpoint.endpointId}
												className='space-y-2'
											>
												<div className='flex items-center justify-between'>
													<span className='text-sm font-medium text-slate-700'>
														{endpoint.endpointName}
													</span>
													<span className='text-xs text-slate-500'>
														Last 24 hours
													</span>
												</div>
												<div className='flex gap-1'>
													{endpoint.hourlyStatus.map(
														(hour, index) => (
															<div
																key={index}
																className={`h-3 w-3 rounded-sm ${getStatusColor(hour.status)}`}
																title={`${hour.hour}: ${hour.uptime}% uptime`}
															/>
														),
													)}
												</div>
											</div>
										),
									)}
								</div>
								<div className='flex items-center gap-4 mt-6 text-xs text-slate-600'>
									<div className='flex items-center gap-2'>
										<div className='h-3 w-3 bg-green-500 rounded-sm' />
										<span>Healthy</span>
									</div>
									<div className='flex items-center gap-2'>
										<div className='h-3 w-3 bg-yellow-500 rounded-sm' />
										<span>Degraded</span>
									</div>
									<div className='flex items-center gap-2'>
										<div className='h-3 w-3 bg-red-500 rounded-sm' />
										<span>Down</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Endpoint Performance Table */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle>
									Endpoint Performance Summary
								</CardTitle>
								<CardDescription>
									Key metrics for all monitored endpoints
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{analyticsData.chartData.endpointPerformance.map(
										(endpoint) => (
											<div
												key={endpoint.endpointId}
												className='flex items-center justify-between p-4 bg-white/50 rounded-lg border'
											>
												<div>
													<p className='font-medium text-slate-900'>
														{endpoint.endpointName}
													</p>
													<div className='flex gap-4 mt-1 text-sm text-slate-600'>
														<span>
															Uptime:{' '}
															{endpoint.uptime}%
														</span>
														<span>
															Avg Response:{' '}
															{
																endpoint.avgResponseTime
															}
															ms
														</span>
														<span>
															Error Rate:{' '}
															{endpoint.errorRate}
															%
														</span>
													</div>
												</div>
												<div className='flex items-center gap-2'>
													<div
														className={`h-3 w-3 rounded-full ${
															endpoint.uptime >=
															99
																? 'bg-green-500'
																: endpoint.uptime >=
																		95
																	? 'bg-yellow-500'
																	: 'bg-red-500'
														}`}
													/>
													<Link
														to={`/admin/endpoints/${endpoint.endpointId}`}
														className='text-sm text-blue-600 hover:underline'
													>
														View Details
													</Link>
												</div>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='performance' className='space-y-6'>
						{/* Response Time Chart Placeholder */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle>Response Time Trends</CardTitle>
								<CardDescription>
									Average, 95th, and 99th percentile response
									times
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='h-80 flex items-center justify-center text-slate-500'>
									<div className='text-center'>
										<TrendingUp className='h-12 w-12 mx-auto mb-4' />
										<p>
											Interactive charts will be
											implemented next
										</p>
										<p className='text-sm mt-1'>
											Using Recharts for visualization
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Correlation Views Placeholder */}
						<div className='grid gap-6 md:grid-cols-2'>
							<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
								<CardHeader>
									<CardTitle>
										Response Time vs Error Rate
									</CardTitle>
									<CardDescription>
										Correlation analysis between performance
										and reliability
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='h-64 flex items-center justify-center text-slate-500'>
										<div className='text-center'>
											<Activity className='h-8 w-8 mx-auto mb-2' />
											<p className='text-sm'>
												Correlation chart coming soon
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
								<CardHeader>
									<CardTitle>
										Geographic Performance
									</CardTitle>
									<CardDescription>
										Performance metrics by geographic region
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='h-64 flex items-center justify-center text-slate-500'>
										<div className='text-center'>
											<Globe className='h-8 w-8 mx-auto mb-2' />
											<p className='text-sm'>
												Geographic analysis coming soon
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>

				{/* Quick Actions */}
				<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>
							Navigate to detailed analysis and management tools
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='flex flex-wrap gap-3'>
							<Link to='/admin/analytics/logs'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<Activity className='h-4 w-4' />
									Log Analysis
								</Button>
							</Link>
							<Link to='/admin/analytics/incidents'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<AlertTriangle className='h-4 w-4' />
									Incident Analytics
								</Button>
							</Link>
							<Link to='/admin/endpoints'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<Globe className='h-4 w-4' />
									Manage Endpoints
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
