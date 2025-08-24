import { useState, useEffect } from 'react'
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
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '~/components/ui/pagination'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { Separator } from '~/components/ui/separator'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import {
	ArrowLeft,
	Edit3,
	Trash2,
	Play,
	Pause,
	RefreshCw,
	GlobeIcon,
	CheckCircle2,
	XCircle,
	Clock,
} from 'lucide-react'
import type { Route } from './+types/[id]'

export function meta({ loaderData, params }: Route.MetaArgs) {
	const endpoint = loaderData?.endpoint
	return [
		{ title: `${endpoint?.name} · Endpoint Details · Watchtower` },
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
				`${API_BASE_URL}/api/v1/admin/endpoints/${id}/logs?page=1&limit=20`,
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
		const logs = logsRes.ok
			? await logsRes.json()
			: { logs: [], total: 0, page: 1, limit: 20 }

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
	const [currentPage, setCurrentPage] = useState(1)
	const [isLoadingLogs, setIsLoadingLogs] = useState(false)

	const totalPages = Math.ceil(logs.total / logs.limit)

	const fetchLogs = async (page: number) => {
		setIsLoadingLogs(true)
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${params.id}/logs?page=${page}&limit=20`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				const newLogs = await response.json()
				setLogs(newLogs)
				setCurrentPage(page)
			}
		} catch (error) {
			console.error('Error fetching logs:', error)
		} finally {
			setIsLoadingLogs(false)
		}
	}

	// Real-time updates via Server-Sent Events
	useSSE({
		status_update: (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data)
				// Only refresh if this status update is for our specific endpoint and we're on first page
				if (data.endpoint_id === params.id && currentPage === 1) {
					fetchLogs(1)
				}
			} catch (error) {
				console.error('Error parsing status_update event:', error)
			}
		},
	})

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

	// Calculate endpoint health metrics
	const calculateHealthMetrics = () => {
		if (!logs.logs || logs.logs.length === 0) {
			return {
				successRate: 0,
				avgResponseTime: 0,
				totalChecks: logs.total || 0,
				lastCheck: null,
			}
		}

		const recentLogs = logs.logs.slice(0, 100) // Use recent 100 for calculations
		const successfulLogs = recentLogs.filter((log: any) => log.success)
		const successRate =
			recentLogs.length > 0
				? Math.round((successfulLogs.length / recentLogs.length) * 100)
				: 0
		const responseTimes = recentLogs
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

		return {
			successRate,
			avgResponseTime,
			totalChecks: logs.total || 0,
			lastCheck,
		}
	}

	const healthMetrics = calculateHealthMetrics()

	return (
		<main className='flex flex-col gap-4'>
			{/* Quick Stats - Similar to /admin route */}
			<section className='grid grid-cols-3 gap-1 border border-border divide-x divide-border rounded overflow-hidden'>
				<Card className='rounded-none shadow-none border-none'>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<GlobeIcon className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal font-mono uppercase'>
									Success Rate
								</p>
								<p className='typography-h4'>
									{healthMetrics.successRate}%
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className='rounded-none shadow-none border-none'>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<Clock className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal font-mono uppercase'>
									Avg Response Time
								</p>
								<p className='typography-h4'>
									{healthMetrics.avgResponseTime}ms
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className='rounded-none shadow-none border-none'>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								{endpoint.enabled ? (
									<CheckCircle2 className='h-7 w-7 text-green-500' />
								) : (
									<XCircle className='h-7 w-7 text-red-500' />
								)}
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal font-mono uppercase'>
									Status
								</p>
								<p className='typography-h4'>
									{endpoint.enabled ? 'Active' : 'Disabled'}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>

			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
				<PageHeader
					title={endpoint.name}
					description={`${
						healthMetrics.lastCheck
							? `Last checked ${healthMetrics.lastCheck.toLocaleString()}`
							: ''
					}`}
				>
					<div className='flex flex-wrap items-center gap-2'>
						<Button
							className='cursor-pointer gap-2 rounded'
							variant='outline'
							size='sm'
							onClick={toggleEndpoint}
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
								size='sm'
								className='cursor-pointer gap-2 rounded'
							>
								<Edit3 className='h-4 w-4' />
								Edit
							</Button>
						</Link>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant='destructive'
									size='sm'
									className='cursor-pointer gap-2 rounded'
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
				</PageHeader>
				<Separator />
				<CardContent className='px-6 py-4 gap-4 flex flex-col'>
					<div>
						<h4 className='font-medium mb-2'>URL</h4>
						<p className='font-mono text-sm bg-muted px-3 py-2 rounded'>
							{endpoint.url}
						</p>
					</div>

					{endpoint.description && (
						<div>
							<h4 className='font-medium mb-2'>Description</h4>
							<p className='text-sm text-muted-foreground font-mono'>
								{endpoint.description}
							</p>
						</div>
					)}

					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<div>
							<h4 className='font-medium text-sm text-muted-foreground'>
								Method
							</h4>
							<p className='font-mono'>{endpoint.method}</p>
						</div>
						<div>
							<h4 className='font-medium text-sm text-muted-foreground'>
								Expected Status
							</h4>
							<p className='font-mono'>
								{endpoint.expected_status_code}
							</p>
						</div>
						<div>
							<h4 className='font-medium text-sm text-muted-foreground'>
								Timeout
							</h4>
							<p className='font-mono'>
								{endpoint.timeout_seconds}s
							</p>
						</div>
						<div>
							<h4 className='font-medium text-sm text-muted-foreground'>
								Interval
							</h4>
							<p className='font-mono'>
								{endpoint.check_interval_seconds}s
							</p>
						</div>
					</div>

					{endpoint.headers &&
						Object.keys(endpoint.headers).length > 0 && (
							<div>
								<h4 className='font-medium mb-2'>Headers</h4>
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
							<h4 className='font-medium mb-2'>Request Body</h4>
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
							<p className='font-mono'>
								{new Date(endpoint.created_at).toLocaleString()}
							</p>
						</div>
						<div>
							<h4 className='font-medium text-muted-foreground'>
								Last Updated
							</h4>
							<p className='font-mono'>
								{new Date(endpoint.updated_at).toLocaleString()}
							</p>
						</div>
					</div>
				</CardContent>
			</PageContent>

			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded-sm shadow-none'>
				<PageHeader
					title='Monitoring Logs'
					description='Complete monitoring history for this endpoint'
				>
					<span className='text-sm text-muted-foreground'>{`${logs.total} logs`}</span>
					<Button
						variant='outline'
						size='sm'
						onClick={() => fetchLogs(currentPage)}
						className='gap-2 rounded'
					>
						<RefreshCw className='h-4 w-4' />
						Refresh
					</Button>
				</PageHeader>
				<Separator />
				<CardContent className='p-0 gap-0 flex flex-col'>
					{isLoadingLogs ? (
						<div className='flex justify-center py-8'>
							<div className='text-muted-foreground'>
								Loading logs...
							</div>
						</div>
					) : logs.logs.length === 0 ? (
						<p className='text-center text-muted-foreground py-8'>
							No monitoring logs yet
						</p>
					) : (
						<>
							<div className='divide-y divide-border'>
								{logs.logs.map((log: any) => (
									<div
										key={log.id}
										className='flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors'
									>
										<div className='flex items-center gap-4 min-w-0'>
											<Badge
												variant={
													log.success
														? 'default'
														: 'destructive'
												}
												className='shrink-0 rounded font-mono'
											>
												{log.success ? 'OK' : 'FAIL'}
											</Badge>
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-mono'>
													{new Date(
														log.timestamp,
													).toLocaleString()}
												</p>
												{!log.success && log.error && (
													<p className='text-xs text-destructive truncate'>
														{log.error}
													</p>
												)}
											</div>
										</div>
										<div className='flex items-center gap-4 text-sm text-muted-foreground shrink-0'>
											{log.response_time_ms !== null && (
												<span className='font-mono'>
													{log.response_time_ms}
													ms
												</span>
											)}
											{log.status_code && (
												<span className='font-mono'>
													{log.status_code}
												</span>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className='flex items-center justify-end px-6 py-4 border-t border-border'>
									<Pagination className='flex justify-end'>
										<PaginationContent>
											<PaginationItem>
												<PaginationPrevious
													onClick={() =>
														currentPage > 1 &&
														fetchLogs(
															currentPage - 1,
														)
													}
													className={
														currentPage === 1
															? 'pointer-events-none opacity-50'
															: 'cursor-pointer'
													}
												/>
											</PaginationItem>

											{/* Show first page */}
											<PaginationItem>
												<PaginationLink
													onClick={() => fetchLogs(1)}
													isActive={currentPage === 1}
													className='cursor-pointer rounded'
												>
													1
												</PaginationLink>
											</PaginationItem>

											{/* Show pages around current page */}
											{currentPage > 3 && (
												<PaginationItem>
													<span className='px-2'>
														...
													</span>
												</PaginationItem>
											)}

											{Array.from(
												{ length: totalPages },
												(_, i) => i + 1,
											)
												.filter(
													(page) =>
														page > 1 &&
														page < totalPages &&
														Math.abs(
															page - currentPage,
														) <= 1,
												)
												.map((page) => (
													<PaginationItem key={page}>
														<PaginationLink
															onClick={() =>
																fetchLogs(page)
															}
															isActive={
																currentPage ===
																page
															}
															className='cursor-pointer rounded'
														>
															{page}
														</PaginationLink>
													</PaginationItem>
												))}

											{currentPage < totalPages - 2 && (
												<PaginationItem>
													<span className='px-2'>
														...
													</span>
												</PaginationItem>
											)}

											{/* Show last page */}
											{totalPages > 1 && (
												<PaginationItem>
													<PaginationLink
														onClick={() =>
															fetchLogs(
																totalPages,
															)
														}
														isActive={
															currentPage ===
															totalPages
														}
														className='cursor-pointer rounded'
													>
														{totalPages}
													</PaginationLink>
												</PaginationItem>
											)}

											<PaginationItem>
												<PaginationNext
													onClick={() =>
														currentPage <
															totalPages &&
														fetchLogs(
															currentPage + 1,
														)
													}
													className={
														currentPage ===
														totalPages
															? 'pointer-events-none opacity-50 rounded'
															: 'cursor-pointer rounded'
													}
												/>
											</PaginationItem>
										</PaginationContent>
									</Pagination>
								</div>
							)}
						</>
					)}
				</CardContent>
			</PageContent>
		</main>
	)
}
