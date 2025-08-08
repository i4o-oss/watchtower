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
	AlertTriangle,
	Clock,
	TrendingUp,
	TrendingDown,
	Target,
	BarChart3,
	PieChart,
	Activity,
	Calendar,
	Users,
	Zap,
	ArrowRight,
	ExternalLink,
} from 'lucide-react'
import type { Route } from './+types/incidents'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Incident Analytics - Analytics - Admin - Watchtower' },
		{
			name: 'description',
			content: 'MTTR metrics and incident pattern analysis',
		},
	]
}

interface Incident {
	id: string
	title: string
	description: string
	status: 'open' | 'investigating' | 'monitoring' | 'resolved'
	severity: 'low' | 'medium' | 'high' | 'critical'
	created_at: string
	updated_at: string
	resolved_at?: string
	endpoint_ids?: string[]
}

interface IncidentAnalytics {
	mttr: {
		overall: number
		bySeverity: Record<string, number>
		trend: 'up' | 'down' | 'stable'
		byTimePeriod: Array<{
			period: string
			mttr: number
			count: number
		}>
	}
	frequency: {
		totalIncidents: number
		activeIncidents: number
		resolvedIncidents: number
		byEndpoint: Array<{
			endpointId: string
			endpointName: string
			count: number
			severity: Record<string, number>
		}>
		bySeverity: Record<string, number>
		byMonth: Array<{
			month: string
			count: number
			resolved: number
			avgMttr: number
		}>
	}
	patterns: {
		mostAffectedEndpoints: Array<{
			endpointId: string
			endpointName: string
			incidentCount: number
			avgSeverity: number
			lastIncident: string
		}>
		commonFailurePatterns: Array<{
			pattern: string
			count: number
			description: string
			examples: string[]
		}>
		timePatterns: {
			byHour: Record<string, number>
			byDayOfWeek: Record<string, number>
			peakHours: string[]
			quietHours: string[]
		}
	}
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const url = new URL(request.url)
	const timeRange = url.searchParams.get('timeRange') || '30'

	try {
		const [incidentsRes, endpointsRes, logsRes] = await Promise.all([
			fetch(`${API_BASE_URL}/api/v1/admin/incidents`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			// Get recent logs for pattern analysis
			fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${parseInt(timeRange) * 24}&limit=500`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			),
		])

		const incidents = incidentsRes.ok
			? await incidentsRes.json()
			: { incidents: [] }
		const endpoints = endpointsRes.ok
			? await endpointsRes.json()
			: { endpoints: [] }
		const logs = logsRes.ok ? await logsRes.json() : { logs: [] }

		return { incidents, endpoints, logs, timeRange }
	} catch (error) {
		console.error('Error loading incident analytics data:', error)
		return {
			incidents: { incidents: [] },
			endpoints: { endpoints: [] },
			logs: { logs: [] },
			timeRange,
		}
	}
}

export default function IncidentAnalytics({
	loaderData,
}: Route.ComponentProps) {
	const {
		incidents: initialIncidents,
		endpoints,
		logs,
		timeRange: initialTimeRange,
	} = loaderData
	const [incidents, setIncidents] = useState(initialIncidents.incidents)
	const [searchParams, setSearchParams] = useSearchParams()
	const timeRange = searchParams.get('timeRange') || initialTimeRange || '30'

	const updateTimeRange = (value: string) => {
		const newParams = new URLSearchParams(searchParams)
		if (value === '30') {
			newParams.delete('timeRange')
		} else {
			newParams.set('timeRange', value)
		}
		setSearchParams(newParams, { replace: true })
	}

	// Create endpoint lookup map
	const endpointMap = useMemo(
		() =>
			endpoints.endpoints.reduce((acc: any, endpoint: any) => {
				acc[endpoint.id] = endpoint
				return acc
			}, {}),
		[endpoints.endpoints],
	)

	// Calculate comprehensive incident analytics
	const analytics: IncidentAnalytics = useMemo(() => {
		const now = new Date()
		const timeRangeDays = parseInt(timeRange)
		const timeRangeMs = timeRangeDays * 24 * 60 * 60 * 1000
		const startTime = new Date(now.getTime() - timeRangeMs)

		// Filter incidents within time range
		const recentIncidents = incidents.filter(
			(incident: Incident) => new Date(incident.created_at) >= startTime,
		)

		const resolvedIncidents = recentIncidents.filter(
			(incident: Incident) =>
				incident.status === 'resolved' && incident.resolved_at,
		)

		const activeIncidents = recentIncidents.filter(
			(incident: Incident) => incident.status !== 'resolved',
		)

		// Calculate MTTR (Mean Time To Recovery)
		const mttrCalculations = resolvedIncidents.map((incident: Incident) => {
			const createdAt = new Date(incident.created_at).getTime()
			const resolvedAt = new Date(incident.resolved_at!).getTime()
			const mttr = (resolvedAt - createdAt) / (1000 * 60) // in minutes
			return { ...incident, mttr }
		})

		const overallMttr =
			mttrCalculations.length > 0
				? mttrCalculations.reduce((sum, inc) => sum + inc.mttr, 0) /
					mttrCalculations.length
				: 0

		// MTTR by severity
		const mttrBySeverity = ['critical', 'high', 'medium', 'low'].reduce(
			(acc, severity) => {
				const severityIncidents = mttrCalculations.filter(
					(inc) => inc.severity === severity,
				)
				acc[severity] =
					severityIncidents.length > 0
						? severityIncidents.reduce(
								(sum, inc) => sum + inc.mttr,
								0,
							) / severityIncidents.length
						: 0
				return acc
			},
			{} as Record<string, number>,
		)

		// MTTR by time period (weekly buckets)
		const mttrByTimePeriod = []
		const weeksToShow = Math.min(Math.ceil(timeRangeDays / 7), 8)

		for (let i = weeksToShow - 1; i >= 0; i--) {
			const weekStart = new Date(
				now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
			)
			const weekEnd = new Date(
				now.getTime() - i * 7 * 24 * 60 * 60 * 1000,
			)

			const weekIncidents = mttrCalculations.filter((inc) => {
				const createdAt = new Date(inc.created_at)
				return createdAt >= weekStart && createdAt < weekEnd
			})

			const weekMttr =
				weekIncidents.length > 0
					? weekIncidents.reduce((sum, inc) => sum + inc.mttr, 0) /
						weekIncidents.length
					: 0

			mttrByTimePeriod.push({
				period: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
				mttr: Math.round(weekMttr),
				count: weekIncidents.length,
			})
		}

		// Frequency analysis
		const severityCount = recentIncidents.reduce(
			(acc, incident) => {
				acc[incident.severity] = (acc[incident.severity] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)

		// Incidents by endpoint
		const endpointIncidents = recentIncidents.reduce((acc, incident) => {
			if (incident.endpoint_ids && incident.endpoint_ids.length > 0) {
				incident.endpoint_ids.forEach((endpointId) => {
					if (!acc[endpointId]) {
						acc[endpointId] = {
							endpointId,
							endpointName:
								endpointMap[endpointId]?.name || 'Unknown',
							incidents: [],
							severityCount: {
								critical: 0,
								high: 0,
								medium: 0,
								low: 0,
							},
						}
					}
					acc[endpointId].incidents.push(incident)
					acc[endpointId].severityCount[incident.severity]++
				})
			}
			return acc
		}, {} as any)

		const endpointFrequency = Object.values(endpointIncidents)
			.map((data: any) => ({
				endpointId: data.endpointId,
				endpointName: data.endpointName,
				count: data.incidents.length,
				severity: data.severityCount,
			}))
			.sort((a: any, b: any) => b.count - a.count)

		// Monthly trends
		const monthlyData = []
		const monthsToShow = Math.min(timeRangeDays / 30, 12)

		for (let i = Math.ceil(monthsToShow) - 1; i >= 0; i--) {
			const monthStart = new Date(
				now.getFullYear(),
				now.getMonth() - i,
				1,
			)
			const monthEnd = new Date(
				now.getFullYear(),
				now.getMonth() - i + 1,
				0,
			)

			const monthIncidents = incidents.filter((incident: Incident) => {
				const createdAt = new Date(incident.created_at)
				return createdAt >= monthStart && createdAt <= monthEnd
			})

			const monthResolved = monthIncidents.filter(
				(inc) => inc.status === 'resolved' && inc.resolved_at,
			)
			const monthMttrCalcs = monthResolved.map((incident) => {
				const createdAt = new Date(incident.created_at).getTime()
				const resolvedAt = new Date(incident.resolved_at!).getTime()
				return (resolvedAt - createdAt) / (1000 * 60) // in minutes
			})

			const monthAvgMttr =
				monthMttrCalcs.length > 0
					? monthMttrCalcs.reduce((sum, mttr) => sum + mttr, 0) /
						monthMttrCalcs.length
					: 0

			monthlyData.push({
				month: monthStart.toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric',
				}),
				count: monthIncidents.length,
				resolved: monthResolved.length,
				avgMttr: Math.round(monthAvgMttr),
			})
		}

		// Pattern recognition
		const mostAffectedEndpoints = Object.values(endpointIncidents)
			.map((data: any) => {
				const avgSeverity =
					['low', 'medium', 'high', 'critical'].reduce(
						(acc, sev, index) => {
							return acc + data.severityCount[sev] * (index + 1)
						},
						0,
					) / Math.max(data.incidents.length, 1)

				const lastIncident = data.incidents.sort(
					(a: Incident, b: Incident) =>
						new Date(b.created_at).getTime() -
						new Date(a.created_at).getTime(),
				)[0]

				return {
					endpointId: data.endpointId,
					endpointName: data.endpointName,
					incidentCount: data.incidents.length,
					avgSeverity: Math.round(avgSeverity * 10) / 10,
					lastIncident: lastIncident ? lastIncident.created_at : '',
				}
			})
			.sort((a: any, b: any) => b.incidentCount - a.incidentCount)
			.slice(0, 10)

		// Analyze common failure patterns from logs and incidents
		const errorLogs = logs.logs.filter(
			(log: any) => !log.success && log.error,
		)
		const errorPatterns = errorLogs.reduce((acc: any, log: any) => {
			// Simple pattern matching - could be enhanced with ML
			let pattern = 'Unknown Error'
			const error = log.error.toLowerCase()

			if (error.includes('timeout') || error.includes('timed out')) {
				pattern = 'Timeout Error'
			} else if (
				error.includes('connection') ||
				error.includes('connect')
			) {
				pattern = 'Connection Error'
			} else if (error.includes('dns') || error.includes('resolve')) {
				pattern = 'DNS Resolution Error'
			} else if (error.includes('ssl') || error.includes('certificate')) {
				pattern = 'SSL/Certificate Error'
			} else if (
				error.includes('500') ||
				error.includes('internal server')
			) {
				pattern = 'Internal Server Error'
			} else if (error.includes('404') || error.includes('not found')) {
				pattern = 'Resource Not Found'
			} else if (error.includes('403') || error.includes('forbidden')) {
				pattern = 'Access Forbidden'
			} else if (
				error.includes('401') ||
				error.includes('unauthorized')
			) {
				pattern = 'Authentication Error'
			}

			if (!acc[pattern]) {
				acc[pattern] = { count: 0, examples: [] }
			}
			acc[pattern].count++
			if (acc[pattern].examples.length < 3) {
				acc[pattern].examples.push(log.error)
			}
			return acc
		}, {})

		const commonFailurePatterns = Object.entries(errorPatterns)
			.map(([pattern, data]: [string, any]) => ({
				pattern,
				count: data.count,
				description: getPatternDescription(pattern),
				examples: data.examples,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8)

		// Time pattern analysis
		const hourlyPatterns = recentIncidents.reduce(
			(acc, incident) => {
				const hour = new Date(incident.created_at).getHours()
				acc[hour] = (acc[hour] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)

		const dayOfWeekPatterns = recentIncidents.reduce(
			(acc, incident) => {
				const dayNames = [
					'Sunday',
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday',
				]
				const day = dayNames[new Date(incident.created_at).getDay()]
				acc[day] = (acc[day] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)

		// Find peak and quiet hours
		const hourEntries = Object.entries(hourlyPatterns).sort(
			([, a], [, b]) => (b as number) - (a as number),
		)
		const peakHours = hourEntries.slice(0, 3).map(([hour]) => `${hour}:00`)
		const quietHours = hourEntries.slice(-3).map(([hour]) => `${hour}:00`)

		return {
			mttr: {
				overall: Math.round(overallMttr),
				bySeverity: Object.entries(mttrBySeverity).reduce(
					(acc, [key, value]) => ({
						...acc,
						[key]: Math.round(value),
					}),
					{},
				),
				trend: 'stable' as const, // TODO: Calculate actual trend
				byTimePeriod: mttrByTimePeriod,
			},
			frequency: {
				totalIncidents: recentIncidents.length,
				activeIncidents: activeIncidents.length,
				resolvedIncidents: resolvedIncidents.length,
				byEndpoint: endpointFrequency,
				bySeverity: severityCount,
				byMonth: monthlyData,
			},
			patterns: {
				mostAffectedEndpoints: mostAffectedEndpoints as any[],
				commonFailurePatterns,
				timePatterns: {
					byHour: hourlyPatterns,
					byDayOfWeek: dayOfWeekPatterns,
					peakHours,
					quietHours,
				},
			},
		}
	}, [incidents, endpoints, logs, timeRange, endpointMap])

	const refreshData = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				const newIncidents = await response.json()
				setIncidents(newIncidents.incidents)
			}
		} catch (error) {
			console.error('Error refreshing incident data:', error)
		}
	}

	useEffect(() => {
		refreshData()
	}, [timeRange])

	// Real-time updates via SSE
	useSSE({
		incident_update: () => {
			setTimeout(refreshData, 1000)
		},
	})

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case 'critical':
				return 'text-red-600 bg-red-50 border-red-200'
			case 'high':
				return 'text-orange-600 bg-orange-50 border-orange-200'
			case 'medium':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200'
			case 'low':
				return 'text-blue-600 bg-blue-50 border-blue-200'
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200'
		}
	}

	const formatDuration = (minutes: number) => {
		if (minutes < 60) return `${minutes}m`
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60
		if (hours < 24) return `${hours}h ${remainingMinutes}m`
		const days = Math.floor(hours / 24)
		const remainingHours = hours % 24
		return `${days}d ${remainingHours}h`
	}

	function getPatternDescription(pattern: string): string {
		const descriptions: Record<string, string> = {
			'Timeout Error': 'Requests taking too long to complete',
			'Connection Error': 'Failed to establish connection to endpoint',
			'DNS Resolution Error': 'Unable to resolve domain name',
			'SSL/Certificate Error': 'SSL certificate validation failures',
			'Internal Server Error': 'Server-side errors (5xx status codes)',
			'Resource Not Found': 'Requested resources not available (404)',
			'Access Forbidden': 'Permission denied errors (403)',
			'Authentication Error': 'Authentication failures (401)',
			'Unknown Error': 'Unclassified error patterns',
		}
		return descriptions[pattern] || 'Error pattern analysis'
	}

	return (
		<div className='min-h-screen bg-gradient-to-br from-white to-slate-50'>
			{/* Header */}
			<div className='border-b bg-white/50 backdrop-blur-sm'>
				<div className='container mx-auto px-6 py-6'>
					<div className='flex justify-between items-center'>
						<div>
							<div className='flex items-center gap-2'>
								<Link
									to='/admin/analytics'
									className='text-slate-600 hover:text-slate-900'
								>
									Analytics
								</Link>
								<span className='text-slate-400'>/</span>
								<h1 className='text-3xl font-bold text-slate-900'>
									Incident Analytics
								</h1>
							</div>
							<p className='text-slate-600 mt-1'>
								MTTR metrics and pattern recognition analysis
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
									<SelectItem value='7'>Last Week</SelectItem>
									<SelectItem value='30'>
										Last 30 Days
									</SelectItem>
									<SelectItem value='90'>
										Last 3 Months
									</SelectItem>
									<SelectItem value='180'>
										Last 6 Months
									</SelectItem>
									<SelectItem value='365'>
										Last Year
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
				{/* MTTR Overview */}
				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Mean Time to Recovery
									</p>
									<p className='text-3xl font-bold text-slate-900 mt-2'>
										{formatDuration(analytics.mttr.overall)}
									</p>
									<p className='text-xs text-slate-500 mt-1'>
										Average across all incidents
									</p>
								</div>
								<div className='p-3 bg-blue-100 rounded-full'>
									<Target className='h-6 w-6 text-blue-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Total Incidents
									</p>
									<p className='text-3xl font-bold text-slate-900 mt-2'>
										{analytics.frequency.totalIncidents}
									</p>
									<p className='text-xs text-slate-500 mt-1'>
										{analytics.frequency.resolvedIncidents}{' '}
										resolved,{' '}
										{analytics.frequency.activeIncidents}{' '}
										active
									</p>
								</div>
								<div className='p-3 bg-orange-100 rounded-full'>
									<AlertTriangle className='h-6 w-6 text-orange-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Critical MTTR
									</p>
									<p className='text-3xl font-bold text-red-600 mt-2'>
										{analytics.mttr.bySeverity.critical > 0
											? formatDuration(
													analytics.mttr.bySeverity
														.critical,
												)
											: 'N/A'}
									</p>
									<p className='text-xs text-slate-500 mt-1'>
										High-priority incidents
									</p>
								</div>
								<div className='p-3 bg-red-100 rounded-full'>
									<Zap className='h-6 w-6 text-red-600' />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm font-medium text-slate-600'>
										Resolution Rate
									</p>
									<p className='text-3xl font-bold text-green-600 mt-2'>
										{analytics.frequency.totalIncidents > 0
											? Math.round(
													(analytics.frequency
														.resolvedIncidents /
														analytics.frequency
															.totalIncidents) *
														100,
												)
											: 100}
										%
									</p>
									<p className='text-xs text-slate-500 mt-1'>
										Incidents resolved
									</p>
								</div>
								<div className='p-3 bg-green-100 rounded-full'>
									<Activity className='h-6 w-6 text-green-600' />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Tabs for different analysis views */}
				<Tabs defaultValue='mttr' className='w-full'>
					<TabsList className='grid w-full grid-cols-3'>
						<TabsTrigger value='mttr'>MTTR Analysis</TabsTrigger>
						<TabsTrigger value='frequency'>
							Frequency Analysis
						</TabsTrigger>
						<TabsTrigger value='patterns'>
							Pattern Recognition
						</TabsTrigger>
					</TabsList>

					<TabsContent value='mttr' className='space-y-6'>
						{/* MTTR by Severity */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<Clock className='h-5 w-5' />
									MTTR by Severity Level
								</CardTitle>
								<CardDescription>
									Mean time to recovery breakdown by incident
									severity
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
									{Object.entries(
										analytics.mttr.bySeverity,
									).map(([severity, mttr]) => (
										<div
											key={severity}
											className='space-y-2'
										>
											<div className='flex items-center justify-between'>
												<Badge
													variant='outline'
													className={getSeverityColor(
														severity,
													)}
												>
													{severity
														.charAt(0)
														.toUpperCase() +
														severity.slice(1)}
												</Badge>
												<span className='text-sm text-slate-600'>
													{analytics.frequency
														.bySeverity[severity] ||
														0}{' '}
													incidents
												</span>
											</div>
											<div className='text-2xl font-bold text-slate-900'>
												{mttr > 0
													? formatDuration(mttr)
													: 'N/A'}
											</div>
											{mttr > 0 && (
												<div className='w-full bg-slate-200 rounded-full h-2'>
													<div
														className={`h-2 rounded-full ${
															severity ===
															'critical'
																? 'bg-red-500'
																: severity ===
																		'high'
																	? 'bg-orange-500'
																	: severity ===
																			'medium'
																		? 'bg-yellow-500'
																		: 'bg-blue-500'
														}`}
														style={{
															width: `${Math.min((mttr / Math.max(...Object.values(analytics.mttr.bySeverity))) * 100, 100)}%`,
														}}
													/>
												</div>
											)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* MTTR Trend */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle>MTTR Trend Over Time</CardTitle>
								<CardDescription>
									Weekly MTTR performance and incident volume
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{analytics.mttr.byTimePeriod.map(
										(period, index) => (
											<div
												key={index}
												className='flex items-center justify-between p-4 bg-white/50 rounded-lg border'
											>
												<div className='flex items-center gap-4'>
													<div>
														<p className='font-medium text-slate-900'>
															{period.period}
														</p>
														<p className='text-sm text-slate-600'>
															{period.count}{' '}
															incidents
														</p>
													</div>
												</div>
												<div className='text-right'>
													<p className='text-xl font-bold text-slate-900'>
														{period.mttr > 0
															? formatDuration(
																	period.mttr,
																)
															: 'N/A'}
													</p>
													<p className='text-xs text-slate-500'>
														Average MTTR
													</p>
												</div>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='frequency' className='space-y-6'>
						{/* Monthly Trends */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<Calendar className='h-5 w-5' />
									Monthly Incident Trends
								</CardTitle>
								<CardDescription>
									Incident volume and resolution metrics by
									month
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{analytics.frequency.byMonth.map(
										(month, index) => (
											<div
												key={index}
												className='flex items-center justify-between p-4 bg-white/50 rounded-lg border'
											>
												<div>
													<p className='font-medium text-slate-900'>
														{month.month}
													</p>
													<div className='flex gap-4 mt-1 text-sm'>
														<span className='text-slate-600'>
															{month.count} total
														</span>
														<span className='text-green-600'>
															{month.resolved}{' '}
															resolved
														</span>
														<span className='text-slate-600'>
															Avg MTTR:{' '}
															{month.avgMttr > 0
																? formatDuration(
																		month.avgMttr,
																	)
																: 'N/A'}
														</span>
													</div>
												</div>
												<div className='text-right'>
													<div className='w-24 bg-slate-200 rounded-full h-2 mb-1'>
														<div
															className='h-2 bg-blue-500 rounded-full'
															style={{
																width: `${month.count > 0 ? (month.resolved / month.count) * 100 : 0}%`,
															}}
														/>
													</div>
													<p className='text-xs text-slate-500'>
														{month.count > 0
															? Math.round(
																	(month.resolved /
																		month.count) *
																		100,
																)
															: 0}
														% resolved
													</p>
												</div>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>

						{/* Incidents by Endpoint */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<BarChart3 className='h-5 w-5' />
									Incidents by Endpoint
								</CardTitle>
								<CardDescription>
									Most affected endpoints and severity
									breakdown
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{analytics.frequency.byEndpoint
										.slice(0, 8)
										.map((endpoint, index) => (
											<div
												key={endpoint.endpointId}
												className='flex items-center justify-between p-4 bg-white/50 rounded-lg border'
											>
												<div className='flex-1'>
													<div className='flex items-center gap-2'>
														<span className='text-sm font-medium text-slate-900'>
															#{index + 1}
														</span>
														<p className='font-medium text-slate-900'>
															{
																endpoint.endpointName
															}
														</p>
														<Badge
															variant='outline'
															className='bg-slate-100'
														>
															{endpoint.count}{' '}
															incidents
														</Badge>
													</div>
													<div className='flex gap-2 mt-2'>
														{Object.entries(
															endpoint.severity,
														).map(
															([
																severity,
																count,
															]) =>
																count > 0 && (
																	<Badge
																		key={
																			severity
																		}
																		variant='outline'
																		className={`text-xs ${getSeverityColor(severity)}`}
																	>
																		{count}{' '}
																		{
																			severity
																		}
																	</Badge>
																),
														)}
													</div>
												</div>
												<div className='flex items-center gap-2'>
													<Link
														to={`/admin/endpoints/${endpoint.endpointId}`}
														className='text-sm text-blue-600 hover:underline flex items-center gap-1'
													>
														<ExternalLink className='h-3 w-3' />
														View
													</Link>
												</div>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='patterns' className='space-y-6'>
						{/* Common Failure Patterns */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<PieChart className='h-5 w-5' />
									Common Failure Patterns
								</CardTitle>
								<CardDescription>
									Automated pattern recognition from error
									logs and incidents
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='grid gap-4 md:grid-cols-2'>
									{analytics.patterns.commonFailurePatterns.map(
										(pattern, index) => (
											<div
												key={index}
												className='p-4 bg-white/50 rounded-lg border space-y-3'
											>
												<div className='flex items-center justify-between'>
													<h4 className='font-medium text-slate-900'>
														{pattern.pattern}
													</h4>
													<Badge
														variant='outline'
														className='bg-red-50 text-red-700 border-red-200'
													>
														{pattern.count}
													</Badge>
												</div>
												<p className='text-sm text-slate-600'>
													{pattern.description}
												</p>
												{pattern.examples.length >
													0 && (
													<div>
														<p className='text-xs font-medium text-slate-700 mb-1'>
															Examples:
														</p>
														<div className='text-xs text-slate-500 space-y-1'>
															{pattern.examples
																.slice(0, 2)
																.map(
																	(
																		example,
																		i,
																	) => (
																		<p
																			key={
																				i
																			}
																			className='truncate bg-slate-100 px-2 py-1 rounded'
																		>
																			{
																				example
																			}
																		</p>
																	),
																)}
														</div>
													</div>
												)}
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>

						{/* Most Affected Endpoints */}
						<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<Users className='h-5 w-5' />
									Most Affected Endpoints
								</CardTitle>
								<CardDescription>
									Endpoints with highest incident frequency
									and severity
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{analytics.patterns.mostAffectedEndpoints.map(
										(endpoint, index) => (
											<div
												key={endpoint.endpointId}
												className='flex items-center justify-between p-4 bg-white/50 rounded-lg border'
											>
												<div className='flex-1'>
													<div className='flex items-center gap-3'>
														<span className='text-sm font-medium text-slate-700'>
															#{index + 1}
														</span>
														<div>
															<p className='font-medium text-slate-900'>
																{
																	endpoint.endpointName
																}
															</p>
															<p className='text-sm text-slate-600'>
																{
																	endpoint.incidentCount
																}{' '}
																incidents, avg
																severity:{' '}
																{
																	endpoint.avgSeverity
																}
																/4
															</p>
														</div>
													</div>
													{endpoint.lastIncident && (
														<p className='text-xs text-slate-500 mt-1'>
															Last incident:{' '}
															{new Date(
																endpoint.lastIncident,
															).toLocaleDateString()}
														</p>
													)}
												</div>
												<div className='flex items-center gap-2'>
													<div
														className={`h-3 w-3 rounded-full ${
															endpoint.avgSeverity >=
															3.5
																? 'bg-red-500'
																: endpoint.avgSeverity >=
																		2.5
																	? 'bg-orange-500'
																	: endpoint.avgSeverity >=
																			1.5
																		? 'bg-yellow-500'
																		: 'bg-green-500'
														}`}
													/>
													<Link
														to={`/admin/endpoints/${endpoint.endpointId}`}
														className='text-sm text-blue-600 hover:underline flex items-center gap-1'
													>
														<ExternalLink className='h-3 w-3' />
														Details
													</Link>
												</div>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>

						{/* Time Patterns */}
						<div className='grid gap-6 md:grid-cols-2'>
							<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
								<CardHeader>
									<CardTitle className='text-sm'>
										Peak Incident Hours
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='space-y-2'>
										{analytics.patterns.timePatterns.peakHours.map(
											(hour, index) => (
												<div
													key={index}
													className='flex items-center justify-between'
												>
													<span className='text-sm text-slate-700'>
														{hour}
													</span>
													<Badge
														variant='outline'
														className='bg-red-50 text-red-700 border-red-200'
													>
														{analytics.patterns
															.timePatterns
															.byHour[
															hour.split(':')[0]
														] || 0}
													</Badge>
												</div>
											),
										)}
									</div>
								</CardContent>
							</Card>

							<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
								<CardHeader>
									<CardTitle className='text-sm'>
										Day of Week Patterns
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='space-y-2'>
										{Object.entries(
											analytics.patterns.timePatterns
												.byDayOfWeek,
										)
											.sort(
												([, a], [, b]) =>
													(b as number) -
													(a as number),
											)
											.map(([day, count]) => (
												<div
													key={day}
													className='flex items-center justify-between'
												>
													<span className='text-sm text-slate-700'>
														{day}
													</span>
													<Badge
														variant='outline'
														className='bg-blue-50 text-blue-700 border-blue-200'
													>
														{count}
													</Badge>
												</div>
											))}
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>

				{/* Quick Actions */}
				<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
					<CardHeader>
						<CardTitle>Analysis Actions</CardTitle>
						<CardDescription>
							Navigate to detailed views and create reports
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='flex flex-wrap gap-3'>
							<Link to='/admin/incidents'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<AlertTriangle className='h-4 w-4 mr-2' />
									View All Incidents
								</Button>
							</Link>
							<Link to='/admin/analytics/logs?showErrors=true'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<Activity className='h-4 w-4 mr-2' />
									Error Log Analysis
								</Button>
							</Link>
							<Link to='/admin/analytics'>
								<Button
									variant='outline'
									className='bg-white/50'
								>
									<BarChart3 className='h-4 w-4 mr-2' />
									System Overview
								</Button>
							</Link>
							<Link to='/admin/incidents/new'>
								<Button className='bg-slate-900 text-white hover:bg-slate-800'>
									<AlertTriangle className='h-4 w-4 mr-2' />
									Create New Incident
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
