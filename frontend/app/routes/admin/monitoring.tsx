import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import { LazyMonitoringCharts as MonitoringCharts } from '~/components/lazy-monitoring-charts'
import {
	Search,
	RefreshCw,
	TrendingUp,
	TrendingDown,
	Activity,
} from 'lucide-react'
import type { Route } from './+types/monitoring'
import { Separator } from '~/components/ui/separator'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Monitoring Logs - Admin - Watchtower' },
		{ name: 'description', content: 'View and filter monitoring logs' },
	]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	// Get timeRange from URL params for initial load
	const url = new URL(request.url)
	const timeRange = url.searchParams.get('timeRange') || '24'

	try {
		const [logsRes, endpointsRes] = await Promise.all([
			fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=100`,
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
		])

		const logs = logsRes.ok ? await logsRes.json() : { logs: [], total: 0 }
		const endpoints = endpointsRes.ok
			? await endpointsRes.json()
			: { endpoints: [] }

		return { logs, endpoints }
	} catch (error) {
		console.error('Error loading monitoring data:', error)
		return {
			logs: { logs: [], total: 0 },
			endpoints: { endpoints: [] },
		}
	}
}

export default function AdminMonitoring({ loaderData }: Route.ComponentProps) {
	const { logs: initialLogs, endpoints } = loaderData
	const [logs, setLogs] = useState(initialLogs.logs)
	const [filteredLogs, setFilteredLogs] = useState(initialLogs.logs)
	const [searchParams, setSearchParams] = useSearchParams()

	// Get filter values from URL params
	const searchTerm = searchParams.get('search') || ''
	const statusFilter = searchParams.get('status') || 'all'
	const endpointFilter = searchParams.get('endpoint') || 'all'
	const timeRange = searchParams.get('timeRange') || '24'

	// Helper function to update URL params
	const updateFilter = (key: string, value: string) => {
		const newParams = new URLSearchParams(searchParams)
		if (
			value === '' ||
			value === 'all' ||
			(key === 'timeRange' && value === '24')
		) {
			newParams.delete(key)
		} else {
			newParams.set(key, value)
		}
		setSearchParams(newParams, { replace: true })
	}

	// Create endpoint lookup map (memoized to prevent infinite re-renders)
	const endpointMap = useMemo(
		() =>
			endpoints.endpoints.reduce((acc: any, endpoint: any) => {
				acc[endpoint.id] = endpoint
				return acc
			}, {}),
		[endpoints.endpoints],
	)

	useEffect(() => {
		let filtered = logs

		// Filter by search term (endpoint name or URL)
		if (searchTerm) {
			filtered = filtered.filter((log: any) => {
				const endpoint = endpointMap[log.endpoint_id]
				if (!endpoint) return false
				return (
					endpoint.name
						.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					endpoint.url
						.toLowerCase()
						.includes(searchTerm.toLowerCase())
				)
			})
		}

		// Filter by status
		if (statusFilter !== 'all') {
			const isSuccess = statusFilter === 'success'
			filtered = filtered.filter((log: any) => log.success === isSuccess)
		}

		// Filter by endpoint
		if (endpointFilter !== 'all') {
			filtered = filtered.filter(
				(log: any) => log.endpoint_id === endpointFilter,
			)
		}

		setFilteredLogs(filtered)
	}, [logs, searchTerm, statusFilter, endpointFilter, endpointMap])

	const refreshLogs = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=100`,
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
			console.error('Error refreshing logs:', error)
		}
	}

	useEffect(() => {
		refreshLogs()
	}, [timeRange])

	// Throttle SSE refresh calls to prevent rate limiting
	const refreshThrottleRef = useRef<NodeJS.Timeout | null>(null)

	// Real-time updates via Server-Sent Events
	useSSE({
		status_update: () => {
			try {
				// Throttle refresh calls to prevent rate limiting
				if (refreshThrottleRef.current) {
					clearTimeout(refreshThrottleRef.current)
				}

				refreshThrottleRef.current = setTimeout(() => {
					refreshLogs()
				}, 2000) // Wait 2 seconds before refreshing
			} catch (error) {
				console.error('Error parsing status_update event:', error)
			}
		},
	})

	const getStatusBadge = (success: boolean) => {
		return (
			<Badge variant={success ? 'default' : 'destructive'}>
				{success ? 'Success' : 'Failed'}
			</Badge>
		)
	}

	const getStatusCodeBadge = (statusCode: number) => {
		let variant: 'default' | 'secondary' | 'destructive' = 'default'

		if (statusCode >= 400) {
			variant = 'destructive'
		} else if (statusCode >= 300) {
			variant = 'secondary'
		}

		return (
			<Badge variant={variant} className='font-mono text-xs'>
				{statusCode}
			</Badge>
		)
	}

	// Calculate stats
	const successRate =
		filteredLogs.length > 0
			? Math.round(
					(filteredLogs.filter((l: any) => l.success).length /
						filteredLogs.length) *
						100,
				)
			: 0
	const avgResponseTime =
		filteredLogs.filter((l: any) => l.response_time_ms).length > 0
			? Math.round(
					filteredLogs
						.filter((l: any) => l.response_time_ms)
						.reduce(
							(acc: number, l: any) => acc + l.response_time_ms,
							0,
						) /
						filteredLogs.filter((l: any) => l.response_time_ms)
							.length,
				)
			: 0
	const totalFailures = filteredLogs.filter((l: any) => !l.success).length

	return (
		<main className='flex-1 flex flex-col xl:flex-row gap-6'>
			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
				<PageHeader
					title='Monitoring Logs'
					description='View and analyze endpoint monitoring results'
				>
					<Button onClick={refreshLogs} size='sm'>
						<RefreshCw className='h-4 w-4' />
						Refresh
					</Button>
				</PageHeader>

				<CardContent className='p-6 gap-0 flex flex-col'>
					{/* Filters and Controls */}
					<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
						<div className='flex flex-1 items-center gap-4'>
							<div className='relative flex-1 max-w-sm'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search endpoints...'
									value={searchTerm}
									onChange={(e) =>
										updateFilter('search', e.target.value)
									}
									className='pl-10'
								/>
							</div>
							<Select
								value={statusFilter}
								onValueChange={(value) =>
									updateFilter('status', value)
								}
							>
								<SelectTrigger className='w-36'>
									<SelectValue placeholder='All Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Statuses
									</SelectItem>
									<SelectItem value='success'>
										Success Only
									</SelectItem>
									<SelectItem value='failed'>
										Failed Only
									</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={endpointFilter}
								onValueChange={(value) =>
									updateFilter('endpoint', value)
								}
							>
								<SelectTrigger className='w-40'>
									<SelectValue placeholder='All Endpoints' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Endpoints
									</SelectItem>
									{endpoints.endpoints.map(
										(endpoint: any) => (
											<SelectItem
												key={endpoint.id}
												value={endpoint.id}
											>
												{endpoint.name}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
							<Select
								value={timeRange}
								onValueChange={(value) =>
									updateFilter('timeRange', value)
								}
							>
								<SelectTrigger className='w-36'>
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
						</div>
						<div className='flex items-center gap-2'>
							<div className='text-sm text-muted-foreground'>
								{filteredLogs.length} of {logs.length} log(s)
							</div>
						</div>
					</div>

					<Separator className='mb-6' />

					{/* Logs List */}
					<Card className='rounded-none shadow-none border-none'>
						<CardHeader>
							<CardTitle>Monitoring Results</CardTitle>
							<CardDescription>
								Chronological list of endpoint monitoring checks
							</CardDescription>
						</CardHeader>
						<CardContent>
							{filteredLogs.length === 0 ? (
								<div className='text-center py-12'>
									<h3 className='text-lg font-medium text-muted-foreground mb-2'>
										No logs found
									</h3>
									<p className='text-muted-foreground'>
										Try adjusting your filters or check back
										later
									</p>
								</div>
							) : (
								<div className='space-y-2'>
									{filteredLogs.map((log: any) => {
										const endpoint =
											endpointMap[log.endpoint_id]

										return (
											<div
												key={log.id}
												className='border rounded-lg p-4'
											>
												<div className='flex items-start justify-between'>
													<div className='flex-1'>
														<div className='flex items-center gap-3 mb-2'>
															{getStatusBadge(
																log.success,
															)}
															{log.status_code &&
																getStatusCodeBadge(
																	log.status_code,
																)}
															<span className='text-sm font-medium'>
																{endpoint
																	? endpoint.name
																	: 'Unknown Endpoint'}
															</span>
															<span className='text-xs text-muted-foreground'>
																{new Date(
																	log.timestamp,
																).toLocaleString()}
															</span>
														</div>

														{endpoint && (
															<p className='text-sm text-muted-foreground mb-2 font-mono'>
																{
																	endpoint.method
																}{' '}
																{endpoint.url}
															</p>
														)}

														{!log.success &&
															log.error && (
																<p className='text-sm text-destructive bg-destructive/10 px-2 py-1 rounded'>
																	{log.error}
																</p>
															)}
													</div>

													<div className='text-right text-sm text-muted-foreground'>
														{log.response_time_ms && (
															<p>
																{
																	log.response_time_ms
																}
																ms
															</p>
														)}
														{endpoint && (
															<Link
																to={`/admin/endpoints/${endpoint.id}`}
																className='text-primary hover:underline'
															>
																View Endpoint
															</Link>
														)}
													</div>
												</div>
											</div>
										)
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Monitoring Charts */}
					{logs.length > 0 && (
						<div className='mt-8'>
							<MonitoringCharts
								logs={logs}
								endpoints={endpoints.endpoints}
								timeRange={timeRange}
							/>
						</div>
					)}
				</CardContent>
			</PageContent>

			{/* Quick Stats Sidebar */}
			{filteredLogs.length > 0 && (
				<aside className='w-88 rounded-xl space-y-4'>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<TrendingUp className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Success Rate
									</p>
									<p className='typography-h4'>
										{successRate}%
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<Activity className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Avg Response Time
									</p>
									<p className='typography-h4'>
										{avgResponseTime}ms
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<TrendingDown className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Total Failures
									</p>
									<p className='typography-h4 text-destructive'>
										{totalFailures}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex flex-col gap-2'>
								<p className='text-sm font-normal text-muted-foreground'>
									Time Range
								</p>
								<Badge variant='outline' className='w-fit'>
									{timeRange === '1' && 'Last Hour'}
									{timeRange === '6' && 'Last 6 Hours'}
									{timeRange === '24' && 'Last 24 Hours'}
									{timeRange === '168' && 'Last Week'}
									{timeRange === '720' && 'Last 30 Days'}
								</Badge>
								<p className='text-xs text-muted-foreground'>
									{
										filteredLogs.filter(
											(l: any) => l.success,
										).length
									}{' '}
									successful
								</p>
							</div>
						</CardContent>
					</Card>
				</aside>
			)}
		</main>
	)
}
