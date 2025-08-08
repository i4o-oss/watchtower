import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import { LazyMonitoringCharts } from '~/components/lazy-monitoring-charts'
import {
	ArrowLeft,
	Edit3,
	Trash2,
	Play,
	Pause,
	RefreshCw,
	TrendingUp,
	Activity,
	Clock,
	CheckCircle2,
	XCircle,
	AlertTriangle,
} from 'lucide-react'
import type { Route } from './+types/[id]'

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: `Endpoint Details - Admin - Watchtower` },
		{
			name: 'description',
			content: 'View endpoint details and monitoring logs',
		},
	]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const { id } = params

	try {
		const [endpointRes, logsRes] = await Promise.all([
			fetch(`${API_BASE_URL}/api/v1/admin/endpoints/${id}`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${id}/logs?limit=50`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			),
		])

		if (!endpointRes.ok) {
			throw new Response('Endpoint not found', { status: 404 })
		}

		const endpoint = await endpointRes.json()
		const logs = logsRes.ok ? await logsRes.json() : { logs: [] }

		return { endpoint, logs }
	} catch (error) {
		throw new Response('Error loading endpoint', { status: 500 })
	}
}

export default function EndpointDetail({
	loaderData,
	params,
}: Route.ComponentProps) {
	const { endpoint, logs: initialLogs } = loaderData
	const navigate = useNavigate()
	const [isDeleting, setIsDeleting] = useState(false)
	const [logs, setLogs] = useState(initialLogs)

	// Throttle refresh calls to prevent rate limiting
	const refreshThrottleRef = useRef<NodeJS.Timeout | null>(null)

	const refreshLogs = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${params.id}/logs?limit=50`,
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
			console.error('Error refreshing logs:', error)
		}
	}

	// Real-time updates via Server-Sent Events
	useSSE({
		status_update: (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data)
				// Only refresh if this status update is for our specific endpoint
				if (data.endpoint_id === params.id) {
					// Throttle refresh calls to prevent rate limiting
					if (refreshThrottleRef.current) {
						clearTimeout(refreshThrottleRef.current)
					}

					refreshThrottleRef.current = setTimeout(() => {
						refreshLogs()
					}, 1000) // Wait 1 second before refreshing
				}
			} catch (error) {
				console.error('Error parsing status_update event:', error)
			}
		},
	})

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (refreshThrottleRef.current) {
				clearTimeout(refreshThrottleRef.current)
			}
		}
	}, [])

	const handleDelete = async () => {
		setIsDeleting(true)
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${params.id}`,
				{
					method: 'DELETE',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				navigate('/admin/endpoints')
			} else {
				console.error('Failed to delete endpoint')
			}
		} catch (error) {
			console.error('Error deleting endpoint:', error)
		} finally {
			setIsDeleting(false)
		}
	}

	const toggleEndpoint = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${params.id}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled: !endpoint.enabled }),
				},
			)

			if (response.ok) {
				window.location.reload()
			}
		} catch (error) {
			console.error('Error toggling endpoint:', error)
		}
	}

	const getStatusBadge = (success: boolean) => {
		return (
			<Badge variant={success ? 'default' : 'destructive'}>
				{success ? 'Success' : 'Failed'}
			</Badge>
		)
	}

	// Calculate endpoint health metrics
	const calculateHealthMetrics = () => {
		if (!logs.logs || logs.logs.length === 0) {
			return {
				successRate: 0,
				avgResponseTime: 0,
				totalChecks: 0,
				lastCheck: null,
				status: 'unknown' as const,
			}
		}

		const successfulLogs = logs.logs.filter((log: any) => log.success)
		const successRate = Math.round(
			(successfulLogs.length / logs.logs.length) * 100,
		)
		const responseTimes = logs.logs
			.filter((log: any) => log.response_time_ms)
			.map((log: any) => log.response_time_ms)
		const avgResponseTime =
			responseTimes.length > 0
				? Math.round(
						responseTimes.reduce(
							(a: number, b: number) => a + b,
							0,
						) / responseTimes.length,
					)
				: 0
		const lastCheck = logs.logs[0]?.timestamp
			? new Date(logs.logs[0].timestamp)
			: null

		let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown'
		if (successRate >= 95) status = 'healthy'
		else if (successRate >= 80) status = 'warning'
		else status = 'critical'

		return {
			successRate,
			avgResponseTime,
			totalChecks: logs.logs.length,
			lastCheck,
			status,
		}
	}

	const healthMetrics = calculateHealthMetrics()

	return (
		<div className='space-y-8'>
			{/* Header */}
			<div className='space-y-6'>
				<div className='flex items-center gap-3'>
					<Link to='/admin/endpoints'>
						<Button variant='ghost' size='sm' className='gap-2'>
							<ArrowLeft className='h-4 w-4' />
							Back to Endpoints
						</Button>
					</Link>
				</div>

				<div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
					<div className='space-y-2'>
						<div className='flex items-center gap-3'>
							<h1 className='text-4xl font-bold tracking-tight'>
								{endpoint.name}
							</h1>
							<Badge
								variant={
									endpoint.enabled ? 'default' : 'secondary'
								}
								className='gap-1.5 text-sm py-1.5 px-3'
							>
								{endpoint.enabled ? (
									<CheckCircle2 className='h-4 w-4' />
								) : (
									<XCircle className='h-4 w-4' />
								)}
								{endpoint.enabled ? 'Active' : 'Disabled'}
							</Badge>
						</div>
						<p className='text-xl text-muted-foreground'>
							Health overview and monitoring details
						</p>
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='lg'
							onClick={refreshLogs}
							className='gap-2'
						>
							<RefreshCw className='h-4 w-4' />
							Refresh
						</Button>
						<Button
							variant='outline'
							size='lg'
							onClick={toggleEndpoint}
							className='gap-2'
						>
							{endpoint.enabled ? (
								<>
									<Pause className='h-4 w-4' />
									Disable
								</>
							) : (
								<>
									<Play className='h-4 w-4' />
									Enable
								</>
							)}
						</Button>
						<Link to={`/admin/endpoints/${params.id}/edit`}>
							<Button
								variant='outline'
								size='lg'
								className='gap-2'
							>
								<Edit3 className='h-4 w-4' />
								Edit
							</Button>
						</Link>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant='destructive'
									size='lg'
									className='gap-2'
								>
									<Trash2 className='h-4 w-4' />
									Delete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Delete Endpoint
									</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete "
										{endpoint.name}"? This action cannot be
										undone and will also delete all
										associated monitoring logs and
										incidents.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDelete}
										disabled={isDeleting}
										className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
									>
										{isDeleting
											? 'Deleting...'
											: 'Delete Permanently'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</div>

			{/* Health Status Card */}
			<Card className='border-0 shadow-lg'>
				<CardContent className='p-8'>
					<div className='flex items-center justify-between mb-8'>
						<div className='flex items-center gap-4'>
							<div className='flex items-center justify-center w-16 h-16 rounded-full bg-primary/10'>
								{healthMetrics.status === 'healthy' && (
									<CheckCircle2 className='h-8 w-8 text-green-500' />
								)}
								{healthMetrics.status === 'warning' && (
									<AlertTriangle className='h-8 w-8 text-yellow-500' />
								)}
								{healthMetrics.status === 'critical' && (
									<XCircle className='h-8 w-8 text-red-500' />
								)}
								{healthMetrics.status === 'unknown' && (
									<Activity className='h-8 w-8 text-muted-foreground' />
								)}
							</div>
							<div>
								<h2 className='text-3xl font-bold capitalize'>
									{healthMetrics.status === 'unknown'
										? 'No Data'
										: healthMetrics.status}
								</h2>
								<p className='text-muted-foreground'>
									{healthMetrics.lastCheck
										? `Last checked ${healthMetrics.lastCheck.toLocaleString()}`
										: 'No checks performed yet'}
								</p>
							</div>
						</div>
						<div className='text-sm text-muted-foreground'>
							Based on {healthMetrics.totalChecks} recent checks
						</div>
					</div>

					{/* Key Metrics Grid */}
					<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						<div className='text-center p-6 rounded-xl bg-muted/30'>
							<TrendingUp className='h-6 w-6 mx-auto mb-3 text-muted-foreground' />
							<div className='text-3xl font-bold mb-1'>
								{healthMetrics.successRate}%
							</div>
							<div className='text-sm font-medium text-muted-foreground'>
								Success Rate
							</div>
						</div>
						<div className='text-center p-6 rounded-xl bg-muted/30'>
							<Clock className='h-6 w-6 mx-auto mb-3 text-muted-foreground' />
							<div className='text-3xl font-bold mb-1'>
								{healthMetrics.avgResponseTime}ms
							</div>
							<div className='text-sm font-medium text-muted-foreground'>
								Avg Response Time
							</div>
						</div>
						<div className='text-center p-6 rounded-xl bg-muted/30'>
							<Activity className='h-6 w-6 mx-auto mb-3 text-muted-foreground' />
							<div className='text-3xl font-bold mb-1'>
								{healthMetrics.totalChecks}
							</div>
							<div className='text-sm font-medium text-muted-foreground'>
								Total Checks
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className='grid gap-8 xl:grid-cols-3'>
				{/* Main Content */}
				<div className='xl:col-span-2 space-y-8'>
					{/* Monitoring Charts */}
					{logs.logs && logs.logs.length > 0 && (
						<Card className='border-0 shadow-sm'>
							<CardHeader>
								<CardTitle>Performance Metrics</CardTitle>
								<CardDescription>
									Response time and success rate trends
								</CardDescription>
							</CardHeader>
							<CardContent>
								<LazyMonitoringCharts
									logs={logs.logs.map((log: any) => ({
										timestamp: log.timestamp,
										success: log.success,
										response_time_ms: log.response_time_ms,
										status_code: log.status_code,
										endpoint_name: endpoint.name,
										endpoint_id: endpoint.id,
									}))}
									endpoints={[endpoint]}
									timeRange='24'
								/>
							</CardContent>
						</Card>
					)}

					<Card className='border-0 shadow-sm'>
						<CardHeader>
							<CardTitle>Configuration Details</CardTitle>
							<CardDescription>
								Endpoint monitoring settings
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<h4 className='font-medium mb-2'>URL</h4>
								<p className='font-mono text-sm bg-muted px-3 py-2 rounded'>
									{endpoint.url}
								</p>
							</div>

							{endpoint.description && (
								<div>
									<h4 className='font-medium mb-2'>
										Description
									</h4>
									<p className='text-muted-foreground'>
										{endpoint.description}
									</p>
								</div>
							)}

							<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Method
									</h4>
									<p className='font-mono'>
										{endpoint.method}
									</p>
								</div>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Expected Status
									</h4>
									<p>{endpoint.expected_status_code}</p>
								</div>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Timeout
									</h4>
									<p>{endpoint.timeout_seconds}s</p>
								</div>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Interval
									</h4>
									<p>{endpoint.check_interval_seconds}s</p>
								</div>
							</div>

							{endpoint.headers &&
								Object.keys(endpoint.headers).length > 0 && (
									<div>
										<h4 className='font-medium mb-2'>
											Headers
										</h4>
										<div className='bg-muted p-3 rounded font-mono text-sm'>
											<pre>
												{JSON.stringify(
													endpoint.headers,
													null,
													2,
												)}
											</pre>
										</div>
									</div>
								)}

							{endpoint.body && (
								<div>
									<h4 className='font-medium mb-2'>
										Request Body
									</h4>
									<div className='bg-muted p-3 rounded font-mono text-sm'>
										<pre>{endpoint.body}</pre>
									</div>
								</div>
							)}

							<div className='grid grid-cols-2 gap-4 text-sm'>
								<div>
									<h4 className='font-medium text-muted-foreground'>
										Created
									</h4>
									<p>
										{new Date(
											endpoint.created_at,
										).toLocaleString()}
									</p>
								</div>
								<div>
									<h4 className='font-medium text-muted-foreground'>
										Last Updated
									</h4>
									<p>
										{new Date(
											endpoint.updated_at,
										).toLocaleString()}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Recent Monitoring Logs */}
					<Card>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div>
									<CardTitle>
										Recent Monitoring Logs
									</CardTitle>
									<CardDescription>
										Latest monitoring results for this
										endpoint
									</CardDescription>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={refreshLogs}
								>
									Refresh
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{logs.logs.length === 0 ? (
								<p className='text-center text-muted-foreground py-8'>
									No monitoring logs yet
								</p>
							) : (
								<div className='space-y-3'>
									{logs.logs.map((log: any) => (
										<div
											key={log.id}
											className='flex items-center justify-between p-3 border rounded'
										>
											<div className='flex items-center gap-3'>
												{getStatusBadge(log.success)}
												<div>
													<p className='text-sm font-medium'>
														{new Date(
															log.timestamp,
														).toLocaleString()}
													</p>
													{!log.success &&
														log.error && (
															<p className='text-sm text-destructive'>
																{log.error}
															</p>
														)}
												</div>
											</div>
											<div className='text-right text-sm text-muted-foreground'>
												{log.status_code && (
													<p>
														Status:{' '}
														{log.status_code}
													</p>
												)}
												{log.response_time_ms && (
													<p>
														{log.response_time_ms}
														ms
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Recent Activity Sidebar */}
				<div className='space-y-8'>
					<Card className='border-0 shadow-sm'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Activity className='h-5 w-5' />
								Recent Activity
							</CardTitle>
							<CardDescription>
								Latest monitoring results
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							{logs.logs.length === 0 ? (
								<p className='text-center text-muted-foreground py-8'>
									No monitoring data yet
								</p>
							) : (
								logs.logs
									.slice(0, 10)
									.map((log: any, index: number) => (
										<div
											key={log.id || index}
											className='flex items-center gap-3 p-3 rounded-lg bg-muted/30'
										>
											<div className='flex-shrink-0'>
												{log.success ? (
													<div className='w-2 h-2 rounded-full bg-green-500' />
												) : (
													<div className='w-2 h-2 rounded-full bg-red-500' />
												)}
											</div>
											<div className='flex-1 min-w-0'>
												<div className='flex items-center justify-between'>
													<span className='text-sm font-medium'>
														{log.success
															? 'Success'
															: 'Failed'}
													</span>
													{log.response_time_ms && (
														<span className='text-xs text-muted-foreground'>
															{
																log.response_time_ms
															}
															ms
														</span>
													)}
												</div>
												<p className='text-xs text-muted-foreground truncate'>
													{new Date(
														log.timestamp,
													).toLocaleString()}
												</p>
												{!log.success && log.error && (
													<p className='text-xs text-destructive mt-1 truncate'>
														{log.error}
													</p>
												)}
											</div>
										</div>
									))
							)}
						</CardContent>
					</Card>

					<Card className='border-0 shadow-sm'>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3'>
							<Button
								variant='outline'
								className='w-full gap-2'
								onClick={refreshLogs}
							>
								<RefreshCw className='h-4 w-4' />
								Refresh Data
							</Button>
							<Link to='/admin/monitoring' className='block'>
								<Button
									variant='outline'
									className='w-full gap-2'
								>
									<Activity className='h-4 w-4' />
									View All Logs
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
