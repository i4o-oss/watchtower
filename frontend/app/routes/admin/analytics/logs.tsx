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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Switch } from '~/components/ui/switch'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import {
	Search,
	Filter,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Clock,
	Download,
	Play,
	Pause,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	AlertCircle,
} from 'lucide-react'
import type { Route } from './+types/logs'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Log Viewer - Analytics - Admin - Watchtower' },
		{
			name: 'description',
			content: 'Advanced log analysis and error investigation interface',
		},
	]
}

interface LogEntry {
	id: string
	timestamp: string
	endpoint_id: string
	success: boolean
	status_code?: number
	response_time_ms?: number
	error?: string
	response_body?: string
	headers?: Record<string, string>
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const url = new URL(request.url)
	const timeRange = url.searchParams.get('timeRange') || '24'
	const limit = url.searchParams.get('limit') || '500'

	try {
		const [logsRes, endpointsRes] = await Promise.all([
			fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=${limit}`,
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

		const logs = logsRes.ok ? await logsRes.json() : { logs: [] }
		const endpoints = endpointsRes.ok
			? await endpointsRes.json()
			: { endpoints: [] }

		return { logs, endpoints }
	} catch (error) {
		console.error('Error loading log data:', error)
		return {
			logs: { logs: [] },
			endpoints: { endpoints: [] },
		}
	}
}

export default function LogViewer({ loaderData }: Route.ComponentProps) {
	const { logs: initialLogs, endpoints } = loaderData
	const [logs, setLogs] = useState(initialLogs.logs)
	const [filteredLogs, setFilteredLogs] = useState(initialLogs.logs)
	const [searchParams, setSearchParams] = useSearchParams()
	const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
	const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
	const [realTimeEnabled, setRealTimeEnabled] = useState(false)
	const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	// Filter state from URL params
	const searchTerm = searchParams.get('search') || ''
	const statusFilter = searchParams.get('status') || 'all'
	const endpointFilter = searchParams.get('endpoint') || 'all'
	const timeRange = searchParams.get('timeRange') || '24'
	const showErrors = searchParams.get('showErrors') === 'true'

	// Helper function to update URL params
	const updateFilter = (key: string, value: string | boolean) => {
		const newParams = new URLSearchParams(searchParams)
		const stringValue = String(value)

		if (
			stringValue === '' ||
			stringValue === 'all' ||
			stringValue === 'false' ||
			(key === 'timeRange' && stringValue === '24')
		) {
			newParams.delete(key)
		} else {
			newParams.set(key, stringValue)
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

	// Filter logs based on current filters
	useEffect(() => {
		let filtered = [...logs]

		// Show only errors if error mode is enabled
		if (showErrors) {
			filtered = filtered.filter((log: LogEntry) => !log.success)
		}

		// Filter by search term
		if (searchTerm) {
			filtered = filtered.filter((log: LogEntry) => {
				const endpoint = endpointMap[log.endpoint_id]
				if (!endpoint) return false

				const searchLower = searchTerm.toLowerCase()
				return (
					endpoint.name.toLowerCase().includes(searchLower) ||
					endpoint.url.toLowerCase().includes(searchLower) ||
					log.error?.toLowerCase().includes(searchLower) ||
					log.status_code?.toString().includes(searchLower)
				)
			})
		}

		// Filter by status
		if (statusFilter !== 'all') {
			const isSuccess = statusFilter === 'success'
			filtered = filtered.filter(
				(log: LogEntry) => log.success === isSuccess,
			)
		}

		// Filter by endpoint
		if (endpointFilter !== 'all') {
			filtered = filtered.filter(
				(log: LogEntry) => log.endpoint_id === endpointFilter,
			)
		}

		// Sort by timestamp (most recent first)
		filtered.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() -
				new Date(a.timestamp).getTime(),
		)

		setFilteredLogs(filtered)
	}, [
		logs,
		searchTerm,
		statusFilter,
		endpointFilter,
		showErrors,
		endpointMap,
	])

	const refreshLogs = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}&limit=500`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				const newLogs = await response.json()
				const previousLength = logs.length
				setLogs(newLogs.logs)

				// Auto-scroll if new logs and auto-scroll is enabled
				if (
					isAutoScrollEnabled &&
					newLogs.logs.length > previousLength
				) {
					setTimeout(() => {
						scrollContainerRef.current?.scrollTo({
							top: 0,
							behavior: 'smooth',
						})
					}, 100)
				}
			}
		} catch (error) {
			console.error('Error refreshing logs:', error)
		}
	}

	useEffect(() => {
		refreshLogs()
	}, [timeRange])

	// Real-time updates via SSE
	useSSE({
		status_update: () => {
			if (realTimeEnabled) {
				setTimeout(refreshLogs, 1000)
			}
		},
	})

	const toggleExpanded = (logId: string) => {
		const newExpanded = new Set(expandedLogs)
		if (newExpanded.has(logId)) {
			newExpanded.delete(logId)
		} else {
			newExpanded.add(logId)
		}
		setExpandedLogs(newExpanded)
	}

	const getStatusIcon = (success: boolean) => {
		return success ? (
			<CheckCircle className='h-4 w-4 text-green-600' />
		) : (
			<XCircle className='h-4 w-4 text-red-600' />
		)
	}

	const getStatusBadge = (success: boolean, statusCode?: number) => {
		if (success) {
			return (
				<Badge
					variant='outline'
					className='bg-green-50 text-green-700 border-green-200'
				>
					Success
				</Badge>
			)
		} else {
			return (
				<Badge
					variant='outline'
					className='bg-red-50 text-red-700 border-red-200'
				>
					{statusCode ? `Error ${statusCode}` : 'Failed'}
				</Badge>
			)
		}
	}

	const getStatusCodeColor = (statusCode: number) => {
		if (statusCode >= 500) return 'text-red-600 bg-red-50'
		if (statusCode >= 400) return 'text-orange-600 bg-orange-50'
		if (statusCode >= 300) return 'text-yellow-600 bg-yellow-50'
		return 'text-green-600 bg-green-50'
	}

	const exportLogs = () => {
		const dataStr = JSON.stringify(filteredLogs, null, 2)
		const dataBlob = new Blob([dataStr], { type: 'application/json' })
		const url = URL.createObjectURL(dataBlob)
		const link = document.createElement('a')
		link.href = url
		link.download = `watchtower-logs-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	const createIncidentFromError = (log: LogEntry) => {
		const endpoint = endpointMap[log.endpoint_id]
		if (!endpoint) return

		const title = `${endpoint.name} - ${log.error || 'Service Failure'}`
		const description = `Automated incident created from monitoring log.\n\nEndpoint: ${endpoint.name}\nURL: ${endpoint.url}\nError: ${log.error || 'Unknown error'}\nStatus Code: ${log.status_code || 'N/A'}\nTimestamp: ${log.timestamp}`

		// Navigate to incident creation with pre-filled data
		const params = new URLSearchParams({
			title,
			description,
			severity:
				log.status_code && log.status_code >= 500 ? 'high' : 'medium',
			endpoint_id: log.endpoint_id,
		})

		window.open(`/admin/incidents/new?${params.toString()}`, '_blank')
	}

	const errorStats = useMemo(() => {
		const errors = filteredLogs.filter((log) => !log.success)
		const errorsByEndpoint = errors.reduce((acc: any, log) => {
			const endpoint = endpointMap[log.endpoint_id]
			if (endpoint) {
				const key = endpoint.name
				acc[key] = (acc[key] || 0) + 1
			}
			return acc
		}, {})

		const errorsByStatusCode = errors.reduce((acc: any, log) => {
			const code = log.status_code || 'Unknown'
			acc[code] = (acc[code] || 0) + 1
			return acc
		}, {})

		return {
			errorsByEndpoint,
			errorsByStatusCode,
			totalErrors: errors.length,
		}
	}, [filteredLogs, endpointMap])

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
									Log Viewer
								</h1>
							</div>
							<p className='text-slate-600 mt-1'>
								Advanced log analysis and error investigation
							</p>
						</div>
						<div className='flex items-center gap-4'>
							<div className='flex items-center gap-2'>
								<Switch
									checked={realTimeEnabled}
									onCheckedChange={setRealTimeEnabled}
									id='real-time'
								/>
								<label
									htmlFor='real-time'
									className='text-sm text-slate-700'
								>
									{realTimeEnabled ? (
										<Play className='h-4 w-4' />
									) : (
										<Pause className='h-4 w-4' />
									)}
									Real-time
								</label>
							</div>
							<Button
								onClick={exportLogs}
								variant='outline'
								size='sm'
							>
								<Download className='h-4 w-4' />
								Export
							</Button>
							<Button onClick={refreshLogs} variant='outline'>
								Refresh
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className='container mx-auto px-6 py-8 space-y-6'>
				{/* Filters */}
				<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
					<CardContent className='pt-6'>
						<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
							<div className='relative'>
								<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4' />
								<Input
									placeholder='Search logs...'
									value={searchTerm}
									onChange={(e) =>
										updateFilter('search', e.target.value)
									}
									className='pl-10 bg-white/50'
								/>
							</div>

							<Select
								value={statusFilter}
								onValueChange={(value) =>
									updateFilter('status', value)
								}
							>
								<SelectTrigger className='bg-white/50'>
									<SelectValue placeholder='All statuses' />
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
								<SelectTrigger className='bg-white/50'>
									<SelectValue placeholder='All endpoints' />
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
								<SelectTrigger className='bg-white/50'>
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
								</SelectContent>
							</Select>

							<div className='flex items-center space-x-2'>
								<Switch
									checked={showErrors}
									onCheckedChange={(checked) =>
										updateFilter('showErrors', checked)
									}
									id='show-errors'
								/>
								<label
									htmlFor='show-errors'
									className='text-sm text-slate-700'
								>
									Errors Only
								</label>
							</div>

							<div className='text-sm text-slate-600 flex items-center'>
								Showing {filteredLogs.length} of {logs.length}{' '}
								logs
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Error Investigation Mode */}
				{showErrors && (
					<Card className='border-0 shadow-md bg-red-50/50 backdrop-blur-sm border-red-200'>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<AlertTriangle className='h-5 w-5 text-red-600' />
								<CardTitle className='text-red-900'>
									Error Investigation Mode
								</CardTitle>
							</div>
							<CardDescription className='text-red-700'>
								Analyzing {errorStats.totalErrors} error entries
								for patterns and root causes
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='grid gap-4 md:grid-cols-2'>
								<div>
									<h4 className='font-medium text-red-900 mb-2'>
										Errors by Endpoint
									</h4>
									<div className='space-y-1'>
										{Object.entries(
											errorStats.errorsByEndpoint,
										)
											.sort(
												([, a], [, b]) =>
													(b as number) -
													(a as number),
											)
											.slice(0, 5)
											.map(([endpoint, count]) => (
												<div
													key={endpoint}
													className='flex justify-between items-center text-sm'
												>
													<span className='text-red-800'>
														{endpoint}
													</span>
													<Badge
														variant='outline'
														className='bg-red-100 text-red-700 border-red-300'
													>
														{count}
													</Badge>
												</div>
											))}
									</div>
								</div>
								<div>
									<h4 className='font-medium text-red-900 mb-2'>
										Errors by Status Code
									</h4>
									<div className='space-y-1'>
										{Object.entries(
											errorStats.errorsByStatusCode,
										)
											.sort(
												([, a], [, b]) =>
													(b as number) -
													(a as number),
											)
											.map(([code, count]) => (
												<div
													key={code}
													className='flex justify-between items-center text-sm'
												>
													<span className='text-red-800'>
														{code}
													</span>
													<Badge
														variant='outline'
														className='bg-red-100 text-red-700 border-red-300'
													>
														{count}
													</Badge>
												</div>
											))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Log Entries */}
				<Card className='border-0 shadow-md bg-white/70 backdrop-blur-sm'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Filter className='h-5 w-5' />
							Log Entries
						</CardTitle>
						<CardDescription>
							Detailed monitoring logs with expandable error
							details
						</CardDescription>
					</CardHeader>
					<CardContent>
						{filteredLogs.length === 0 ? (
							<div className='text-center py-12'>
								<AlertCircle className='h-12 w-12 text-slate-400 mx-auto mb-4' />
								<h3 className='text-lg font-medium text-slate-600 mb-2'>
									No logs found
								</h3>
								<p className='text-slate-500'>
									Try adjusting your filters or check back
									later
								</p>
							</div>
						) : (
							<div
								ref={scrollContainerRef}
								className='space-y-2 max-h-[800px] overflow-y-auto'
							>
								{filteredLogs.map((log: LogEntry) => {
									const endpoint =
										endpointMap[log.endpoint_id]
									const isExpanded = expandedLogs.has(log.id)

									return (
										<div
											key={log.id}
											className={`border rounded-lg transition-all duration-200 ${
												!log.success
													? 'border-red-200 bg-red-50/30'
													: 'border-slate-200 bg-white/50'
											}`}
										>
											<div className='p-4'>
												<div className='flex items-start justify-between'>
													<div className='flex-1'>
														<div className='flex items-center gap-3 mb-2'>
															{getStatusIcon(
																log.success,
															)}
															{getStatusBadge(
																log.success,
																log.status_code,
															)}
															{log.status_code && (
																<Badge
																	variant='outline'
																	className={`font-mono text-xs ${getStatusCodeColor(log.status_code)}`}
																>
																	{
																		log.status_code
																	}
																</Badge>
															)}
															<span className='font-medium text-slate-900'>
																{endpoint
																	? endpoint.name
																	: 'Unknown Endpoint'}
															</span>
															<span className='text-xs text-slate-500'>
																{new Date(
																	log.timestamp,
																).toLocaleString()}
															</span>
														</div>

														{endpoint && (
															<p className='text-sm text-slate-600 mb-2 font-mono'>
																{
																	endpoint.method
																}{' '}
																{endpoint.url}
															</p>
														)}

														{!log.success &&
															log.error && (
																<p className='text-sm text-red-700 bg-red-100/50 px-3 py-2 rounded-md mb-2'>
																	{log.error}
																</p>
															)}
													</div>

													<div className='flex items-center gap-2'>
														{log.response_time_ms && (
															<div className='text-right text-sm text-slate-600'>
																<Clock className='h-3 w-3 inline mr-1' />
																{
																	log.response_time_ms
																}
																ms
															</div>
														)}

														{!log.success && (
															<Button
																size='sm'
																variant='outline'
																onClick={() =>
																	createIncidentFromError(
																		log,
																	)
																}
																className='bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
															>
																<AlertTriangle className='h-3 w-3 mr-1' />
																Create Incident
															</Button>
														)}

														<Button
															size='sm'
															variant='ghost'
															onClick={() =>
																toggleExpanded(
																	log.id,
																)
															}
														>
															{isExpanded ? (
																<ChevronDown className='h-4 w-4' />
															) : (
																<ChevronRight className='h-4 w-4' />
															)}
														</Button>
													</div>
												</div>

												{isExpanded && (
													<div className='mt-4 pt-4 border-t border-slate-200 space-y-3'>
														{log.response_body && (
															<div>
																<h4 className='text-sm font-medium text-slate-700 mb-2'>
																	Response
																	Body
																</h4>
																<pre className='text-xs bg-slate-100 p-3 rounded-md overflow-x-auto max-h-40'>
																	{
																		log.response_body
																	}
																</pre>
															</div>
														)}

														{log.headers &&
															Object.keys(
																log.headers,
															).length > 0 && (
																<div>
																	<h4 className='text-sm font-medium text-slate-700 mb-2'>
																		Response
																		Headers
																	</h4>
																	<div className='bg-slate-100 p-3 rounded-md'>
																		{Object.entries(
																			log.headers,
																		).map(
																			([
																				key,
																				value,
																			]) => (
																				<div
																					key={
																						key
																					}
																					className='text-xs font-mono'
																				>
																					<span className='text-slate-600'>
																						{
																							key
																						}
																						:
																					</span>{' '}
																					<span className='text-slate-900'>
																						{
																							value
																						}
																					</span>
																				</div>
																			),
																		)}
																	</div>
																</div>
															)}

														<div className='flex gap-2'>
															{endpoint && (
																<Link
																	to={`/admin/endpoints/${endpoint.id}`}
																	className='text-sm text-blue-600 hover:underline flex items-center gap-1'
																>
																	<ExternalLink className='h-3 w-3' />
																	View
																	Endpoint
																	Details
																</Link>
															)}
															<Button
																size='sm'
																variant='ghost'
																onClick={() =>
																	setSelectedLog(
																		log,
																	)
																}
															>
																View Full
																Details
															</Button>
														</div>
													</div>
												)}
											</div>
										</div>
									)
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Log Detail Modal */}
			<Dialog
				open={!!selectedLog}
				onOpenChange={() => setSelectedLog(null)}
			>
				<DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
					{selectedLog && (
						<>
							<DialogHeader>
								<DialogTitle className='flex items-center gap-2'>
									{getStatusIcon(selectedLog.success)}
									Log Entry Details
								</DialogTitle>
								<DialogDescription>
									{new Date(
										selectedLog.timestamp,
									).toLocaleString()}
								</DialogDescription>
							</DialogHeader>
							<div className='space-y-4'>
								<div className='grid gap-4 md:grid-cols-2'>
									<div>
										<h4 className='font-medium mb-2'>
											Basic Information
										</h4>
										<div className='space-y-2 text-sm'>
											<div>
												<span className='font-medium'>
													Status:
												</span>{' '}
												{getStatusBadge(
													selectedLog.success,
													selectedLog.status_code,
												)}
											</div>
											<div>
												<span className='font-medium'>
													Endpoint:
												</span>{' '}
												{endpointMap[
													selectedLog.endpoint_id
												]?.name || 'Unknown'}
											</div>
											{selectedLog.response_time_ms && (
												<div>
													<span className='font-medium'>
														Response Time:
													</span>{' '}
													{
														selectedLog.response_time_ms
													}
													ms
												</div>
											)}
										</div>
									</div>
									<div>
										<h4 className='font-medium mb-2'>
											Actions
										</h4>
										<div className='space-y-2'>
											{!selectedLog.success && (
												<Button
													size='sm'
													onClick={() =>
														createIncidentFromError(
															selectedLog,
														)
													}
													className='w-full'
												>
													<AlertTriangle className='h-4 w-4' />
													Create Incident
												</Button>
											)}
											{endpointMap[
												selectedLog.endpoint_id
											] && (
												<Link
													to={`/admin/endpoints/${selectedLog.endpoint_id}`}
												>
													<Button
														size='sm'
														variant='outline'
														className='w-full'
													>
														<ExternalLink className='h-4 w-4' />
														View Endpoint
													</Button>
												</Link>
											)}
										</div>
									</div>
								</div>

								{selectedLog.error && (
									<div>
										<h4 className='font-medium mb-2'>
											Error Details
										</h4>
										<pre className='text-sm bg-red-50 p-3 rounded-md text-red-800'>
											{selectedLog.error}
										</pre>
									</div>
								)}

								{selectedLog.response_body && (
									<div>
										<h4 className='font-medium mb-2'>
											Full Response
										</h4>
										<pre className='text-xs bg-slate-100 p-3 rounded-md overflow-x-auto max-h-60'>
											{selectedLog.response_body}
										</pre>
									</div>
								)}

								{selectedLog.headers &&
									Object.keys(selectedLog.headers).length >
										0 && (
										<div>
											<h4 className='font-medium mb-2'>
												Response Headers
											</h4>
											<div className='bg-slate-100 p-3 rounded-md max-h-40 overflow-y-auto'>
												{Object.entries(
													selectedLog.headers,
												).map(([key, value]) => (
													<div
														key={key}
														className='text-sm font-mono mb-1'
													>
														<span className='text-slate-600 font-semibold'>
															{key}:
														</span>{' '}
														<span className='text-slate-900'>
															{value}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
