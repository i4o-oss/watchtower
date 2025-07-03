import { useState } from 'react'
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
	const { endpoint, logs } = loaderData
	const navigate = useNavigate()
	const [isDeleting, setIsDeleting] = useState(false)

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

	return (
		<div>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>{endpoint.name}</h1>
					<p className='text-muted-foreground'>
						Endpoint details and monitoring logs
					</p>
				</div>
				<div className='flex gap-2'>
					<Link to='/admin/endpoints'>
						<Button variant='outline'>Back to Endpoints</Button>
					</Link>
					<Link to={`/admin/endpoints/${params.id}/edit`}>
						<Button variant='outline'>Edit</Button>
					</Link>
					<Button variant='outline' onClick={toggleEndpoint}>
						{endpoint.enabled ? 'Disable' : 'Enable'}
					</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant='destructive'>Delete</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Delete Endpoint
									</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this
										endpoint? This action cannot be undone
										and will also delete all associated
										monitoring logs.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDelete}
										disabled={isDeleting}
									>
										{isDeleting ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>

				<div className='grid gap-6 lg:grid-cols-3'>
					{/* Endpoint Details */}
					<div className='lg:col-span-2 space-y-6'>
						<Card>
							<CardHeader>
								<div className='flex items-center justify-between'>
									<CardTitle>
										Endpoint Configuration
									</CardTitle>
									<Badge
										variant={
											endpoint.enabled
												? 'default'
												: 'secondary'
										}
									>
										{endpoint.enabled
											? 'Active'
											: 'Disabled'}
									</Badge>
								</div>
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
										<p>
											{endpoint.check_interval_seconds}s
										</p>
									</div>
								</div>

								{endpoint.headers &&
									Object.keys(endpoint.headers).length >
										0 && (
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
								<CardTitle>Recent Monitoring Logs</CardTitle>
								<CardDescription>
									Latest monitoring results for this endpoint
								</CardDescription>
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
													{getStatusBadge(
														log.success,
													)}
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
															{
																log.response_time_ms
															}
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

					{/* Statistics Sidebar */}
					<div className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Quick Stats</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div>
									<h4 className='text-sm font-medium text-muted-foreground'>
										Recent Success Rate
									</h4>
									<p className='text-2xl font-bold'>
										{logs.logs.length > 0
											? Math.round(
													(logs.logs.filter(
														(l: any) => l.success,
													).length /
														logs.logs.length) *
														100,
												)
											: 0}
										%
									</p>
								</div>

								<div>
									<h4 className='text-sm font-medium text-muted-foreground'>
										Total Checks
									</h4>
									<p className='text-2xl font-bold'>
										{logs.logs.length}
									</p>
								</div>

								{logs.logs.length > 0 && (
									<div>
										<h4 className='text-sm font-medium text-muted-foreground'>
											Avg Response Time
										</h4>
										<p className='text-2xl font-bold'>
											{Math.round(
												logs.logs
													.filter(
														(l: any) =>
															l.response_time_ms,
													)
													.reduce(
														(acc: number, l: any) =>
															acc +
															l.response_time_ms,
														0,
													) /
													logs.logs.filter(
														(l: any) =>
															l.response_time_ms,
													).length,
											)}
											ms
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Actions</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2'>
								<Link
									to={`/admin/endpoints/${params.id}/edit`}
									className='block'
								>
									<Button
										variant='outline'
										className='w-full'
									>
										Edit Configuration
									</Button>
								</Link>
								<Button
									variant='outline'
									className='w-full'
									onClick={toggleEndpoint}
								>
									{endpoint.enabled
										? 'Disable Monitoring'
										: 'Enable Monitoring'}
								</Button>
								<Link to='/admin/monitoring' className='block'>
									<Button
										variant='outline'
										className='w-full'
									>
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
