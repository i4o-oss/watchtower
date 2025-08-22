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
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import {
	AlertTriangle,
	Clock,
	Target,
	CheckCircle2,
	XCircle,
	ArrowLeft,
	Trash2,
	Megaphone,
	RefreshCw,
	Calendar,
} from 'lucide-react'
import { useSSE } from '~/hooks/useSSE'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/[id]'

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: 'Incident Details · Watchtower' },
		{ name: 'description', content: 'View and manage incident details' },
	]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const { id } = params

	try {
		const [incidentResponse, endpointsResponse] = await Promise.all([
			fetch(`${API_BASE_URL}/api/v1/admin/incidents/${id}`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
			fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			}),
		])

		if (!incidentResponse.ok) {
			throw new Response('Incident not found', { status: 404 })
		}

		const incidentData = await incidentResponse.json()
		const endpointsData = endpointsResponse.ok
			? await endpointsResponse.json()
			: { endpoints: [] }

		return {
			incident: incidentData.incident || incidentData,
			endpoints: endpointsData.endpoints || [],
		}
	} catch (error) {
		throw new Response('Error loading incident', { status: 500 })
	}
}

export default function IncidentDetail({
	loaderData,
	params,
}: Route.ComponentProps) {
	const { incident: initialIncident, endpoints } = loaderData
	const [incident, setIncident] = useState(initialIncident)
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [isDeleting, setIsDeleting] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [updateNote, setUpdateNote] = useState('')
	const [newStatus, setNewStatus] = useState(incident?.status || 'open')
	const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
	const [dialogAction, setDialogAction] = useState<
		'update' | 'resolve' | 'reopen'
	>('update')
	const [timeline, setTimeline] = useState<any[]>([])

	// Real-time updates
	useSSE(
		{
			incident_updated: (event) => {
				try {
					const updatedIncident = JSON.parse(event.data)
					if (updatedIncident.id === incident?.id) {
						setIncident(updatedIncident)
					}
				} catch (error) {
					console.error(
						'Error parsing incident_updated event:',
						error,
					)
				}
			},
		},
		{
			url: `${import.meta.env.VITE_API_BASE_URL}/api/v1/events`,
			withCredentials: true,
		},
	)

	// Safety check
	if (!incident) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center space-y-4'>
					<div className='w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4'>
						<span className='text-2xl'>❌</span>
					</div>
					<h2 className='text-xl font-semibold'>
						Incident not found
					</h2>
					<p className='text-muted-foreground'>
						The incident you're looking for doesn't exist or has
						been removed.
					</p>
					<Link to='/admin/incidents'>
						<Button>Back to Incidents</Button>
					</Link>
				</div>
			</div>
		)
	}

	const handleDelete = async () => {
		setIsDeleting(true)
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${params.id}`,
				{
					method: 'DELETE',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				successToast(
					'Incident Deleted',
					'The incident has been permanently deleted',
				)
				navigate('/admin/incidents')
			} else {
				errorToast('Delete Failed', 'Failed to delete the incident')
			}
		} catch (error) {
			console.error('Error deleting incident:', error)
			errorToast('Network Error', 'Failed to delete the incident')
		} finally {
			setIsDeleting(false)
		}
	}

	const handleStatusUpdate = async () => {
		if (newStatus === incident.status && !updateNote.trim()) {
			return
		}

		setIsUpdating(true)
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const updateData: any = {}

			if (newStatus !== incident.status) {
				updateData.status = newStatus
			}

			if (updateNote.trim()) {
				updateData.description = incident.description
					? `${incident.description}\n\nUpdate: ${updateNote.trim()}`
					: updateNote.trim()
			}

			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${params.id}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updateData),
				},
			)

			if (response.ok) {
				const updatedData = await response.json()
				setIncident(updatedData.incident || updatedData)
				setUpdateNote('')
				successToast(
					'Incident Updated',
					'Status and notes have been updated',
				)
			} else {
				errorToast('Update Failed', 'Failed to update the incident')
			}
		} catch (error) {
			console.error('Error updating incident:', error)
			errorToast('Network Error', 'Failed to update the incident')
		} finally {
			setIsUpdating(false)
		}
	}

	const openUpdateDialog = (action: 'update' | 'resolve' | 'reopen') => {
		setDialogAction(action)
		if (action === 'resolve') {
			setNewStatus('resolved')
		} else if (action === 'reopen') {
			setNewStatus('open')
		}
		setIsUpdateDialogOpen(true)
	}

	const getDialogConfig = () => {
		switch (dialogAction) {
			case 'resolve':
				return {
					title: 'Resolve Incident',
					description:
						'Mark this incident as resolved and add a final update',
					submitText: 'Resolve Incident',
				}
			case 'reopen':
				return {
					title: 'Reopen Incident',
					description:
						'Reopen this incident and add an update explaining why',
					submitText: 'Reopen Incident',
				}
			default:
				return {
					title: 'Post Update',
					description: 'Update the incident status and add notes',
					submitText: 'Post Update',
				}
		}
	}

	const getSeverityBadge = (severity: string) => {
		const severityConfig = {
			critical: { variant: 'destructive' as const, color: 'bg-red-500' },
			high: { variant: 'destructive' as const, color: 'bg-orange-500' },
			medium: { variant: 'default' as const, color: 'bg-yellow-500' },
			low: { variant: 'secondary' as const, color: 'bg-green-500' },
		}

		const config =
			severityConfig[severity as keyof typeof severityConfig] ||
			severityConfig.low

		return (
			<Badge className='font-mono uppercase' variant={config.variant}>
				{severity}
			</Badge>
		)
	}

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			open: { variant: 'destructive' as const },
			investigating: { variant: 'secondary' as const },
			identified: { variant: 'secondary' as const },
			monitoring: { variant: 'secondary' as const },
			closed: { variant: 'secondary' as const },
			resolved: { variant: 'default' as const },
		}

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig.open

		return (
			<Badge className='font-mono uppercase' variant={config.variant}>
				{status}
			</Badge>
		)
	}

	const getTimeElapsed = (createdAt: string) => {
		const now = new Date().getTime()
		const created = new Date(createdAt).getTime()
		const diff = now - created

		const minutes = Math.floor(diff / (1000 * 60))
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		if (days > 0) return `${days}d ${hours % 24}h ago`
		if (hours > 0) return `${hours}h ${minutes % 60}m ago`
		return `${minutes}m ago`
	}

	const getAffectedEndpoints = () => {
		if (!incident.endpoint_ids || incident.endpoint_ids.length === 0)
			return []
		return endpoints.filter((endpoint: any) =>
			incident.endpoint_ids.includes(endpoint.id),
		)
	}

	// Calculate key metrics for stats section
	const affectedServices = getAffectedEndpoints().length
	const resolutionTime =
		incident.end_time && incident.created_at
			? Math.round(
					(new Date(incident.end_time).getTime() -
						new Date(incident.created_at).getTime()) /
						(1000 * 60),
				)
			: null
	const timeElapsed = Math.round(
		(new Date().getTime() - new Date(incident.created_at).getTime()) /
			(1000 * 60),
	)

	return (
		<>
			<main className='flex flex-col gap-4'>
				{/* Quick Stats - Similar to /admin/endpoints/[id] route */}
				<section className='grid grid-cols-3 gap-1 border border-border divide-x divide-border rounded overflow-hidden'>
					<Card className='rounded-none shadow-none border-none'>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									{incident.status === 'resolved' ? (
										<CheckCircle2 className='h-7 w-7 text-green-500' />
									) : incident.severity === 'critical' ? (
										<AlertTriangle className='h-7 w-7 text-red-500' />
									) : (
										<XCircle className='h-7 w-7 text-orange-500' />
									)}
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal font-mono uppercase'>
										Status
									</p>
									<p className='typography-h4 capitalize'>
										{incident.status}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className='rounded-none shadow-none border-none'>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<Target className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal font-mono uppercase'>
										Affected Services
									</p>
									<p className='typography-h4'>
										{affectedServices}
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
										{incident.status === 'resolved'
											? 'Resolution Time'
											: 'Time Elapsed'}
									</p>
									<p className='typography-h4'>
										{incident.status === 'resolved' &&
										resolutionTime
											? `${resolutionTime}m`
											: `${timeElapsed}m`}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
					<PageHeader
						title={incident.title}
						description={`${
							incident.severity
						} severity incident • Started ${getTimeElapsed(
							incident.created_at,
						)}${
							getAffectedEndpoints().length > 0
								? ` • ${getAffectedEndpoints().length} service${
										getAffectedEndpoints().length !== 1
											? 's'
											: ''
									} affected`
								: ' • No services specified'
						}`}
					>
						{incident.status === 'resolved' ? (
							<Button
								onClick={() => openUpdateDialog('reopen')}
								size='sm'
								variant='outline'
							>
								<RefreshCw className='h-4 w-4' />
								Reopen
							</Button>
						) : (
							<Button
								onClick={() => openUpdateDialog('resolve')}
								size='sm'
								variant='outline'
							>
								<CheckCircle2 className='h-4 w-4' />
								Resolve
							</Button>
						)}

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									className='gap-2'
									size='sm'
									variant='destructive'
								>
									<Trash2 className='h-4 w-4' />
									Delete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Delete Incident
									</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to permanently
										delete this incident? This action cannot
										be undone and will remove all associated
										timeline data.
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
											: 'Delete Incident'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</PageHeader>

					{/* Incident Information Section */}
					<CardContent className='px-6 py-4 gap-4 flex flex-col'>
						{incident.description && (
							<div>
								<h4 className='font-medium mb-2'>
									Description
								</h4>
								<p className='text-sm text-muted-foreground'>
									{incident.description}
								</p>
							</div>
						)}

						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<div>
								<h4 className='font-medium text-sm text-muted-foreground mb-1'>
									Status
								</h4>
								<div className='flex items-center gap-2'>
									{getStatusBadge(incident.status)}
								</div>
							</div>
							<div>
								<h4 className='font-medium text-sm text-muted-foreground mb-1'>
									Severity
								</h4>
								<div>{getSeverityBadge(incident.severity)}</div>
							</div>
							<div>
								<h4 className='font-medium text-sm text-muted-foreground mb-1'>
									Created
								</h4>
								<p className='text-sm font-mono'>
									{new Date(
										incident.created_at,
									).toLocaleString()}
								</p>
							</div>
							{incident.end_time && (
								<div>
									<h4 className='font-medium text-sm text-muted-foreground mb-1'>
										Resolved
									</h4>
									<p className='text-sm font-mono'>
										{new Date(
											incident.end_time,
										).toLocaleString()}
									</p>
								</div>
							)}
						</div>

						{getAffectedEndpoints().length > 0 && (
							<div>
								<h4 className='font-medium mb-3'>
									Affected Services
								</h4>
								<div className='space-y-2'>
									{getAffectedEndpoints().map(
										(endpoint: any) => (
											<div
												key={endpoint.id}
												className='flex items-center justify-between p-3 border rounded-lg'
											>
												<div className='flex-1'>
													<div className='font-medium'>
														{endpoint.name}
													</div>
													<div className='text-sm text-muted-foreground'>
														{endpoint.url}
													</div>
												</div>
												<Badge
													variant={
														endpoint.status === 'up'
															? 'secondary'
															: 'destructive'
													}
													className='text-xs'
												>
													{endpoint.status ||
														'Unknown'}
												</Badge>
											</div>
										),
									)}
								</div>
							</div>
						)}
					</CardContent>
				</PageContent>

				{/* Timeline Section */}
				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded-sm shadow-none'>
					<PageHeader
						title='Timeline'
						description='Incident updates and status changes'
					>
						<Button
							onClick={() => openUpdateDialog('update')}
							size='sm'
							variant='outline'
						>
							<Megaphone className='h-4 w-4' />
							Post Update
						</Button>
					</PageHeader>
					<CardContent className='px-6 py-4 gap-4 flex flex-col'>
						<div className='space-y-0'>
							<div className='flex gap-4 relative'>
								<div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center relative z-10'>
									<Calendar className='h-4 w-4 text-green-600' />
								</div>
								<div className='absolute left-4 top-0 bottom-0 w-0.5 bg-border' />
								<div className='flex-1 pb-4'>
									<div className='flex items-center gap-2 mb-1'>
										<span className='font-medium'>
											Incident Created
										</span>
										<Badge
											className='font-mono uppercase'
											variant='outline'
										>
											{incident.status === 'open'
												? 'Current'
												: 'Initial'}
										</Badge>
									</div>
									<p className='text-sm text-muted-foreground font-mono'>
										{new Date(
											incident.created_at,
										).toLocaleString()}
									</p>
								</div>
							</div>

							{incident.status !== 'open' && (
								<div className='flex gap-4 relative py-6'>
									<div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center relative z-10'>
										<RefreshCw className='h-4 w-4 text-blue-600' />
									</div>
									<div className='absolute left-4 top-0 bottom-0 w-0.5 bg-border' />
									<div className='flex-1 pb-4'>
										<div className='flex items-center gap-2 mb-1'>
											<span className='font-medium'>
												Status Updated to{' '}
												{incident.status}
											</span>
											<Badge
												className='font-mono uppercase'
												variant='default'
											>
												Current
											</Badge>
										</div>
										<p className='text-sm text-muted-foreground font-mono'>
											{incident.updated_at
												? new Date(
														incident.updated_at,
													).toLocaleString()
												: 'Recently updated'}
										</p>
									</div>
								</div>
							)}

							{incident.end_time && (
								<div className='flex gap-4'>
									<div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center relative z-10'>
										<CheckCircle2 className='h-4 w-4 text-green-600' />
									</div>
									<div className='flex-1 pb-4'>
										<div className='flex items-center gap-2 mb-1'>
											<span className='font-medium'>
												Incident Resolved
											</span>
											<Badge
												className='font-mono uppercase'
												variant='secondary'
											>
												Final
											</Badge>
										</div>
										<p className='text-sm text-muted-foreground font-mono'>
											{new Date(
												incident.end_time,
											).toLocaleString()}
										</p>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</PageContent>

				{/* Update Dialog */}
				<Dialog
					open={isUpdateDialogOpen}
					onOpenChange={setIsUpdateDialogOpen}
				>
					<DialogContent className='max-w-md'>
						<DialogHeader>
							<DialogTitle>{getDialogConfig().title}</DialogTitle>
							<DialogDescription>
								{getDialogConfig().description}
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='status'>Status</Label>
								<Select
									value={newStatus}
									onValueChange={setNewStatus}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='open'>
											Open
										</SelectItem>
										<SelectItem value='investigating'>
											Investigating
										</SelectItem>
										<SelectItem value='identified'>
											Identified
										</SelectItem>
										<SelectItem value='monitoring'>
											Monitoring
										</SelectItem>
										<SelectItem value='resolved'>
											Resolved
										</SelectItem>
										<SelectItem value='closed'>
											Closed
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='update_note'>
									{dialogAction === 'update'
										? 'Update Notes'
										: 'Message'}
								</Label>
								<Textarea
									id='update_note'
									value={updateNote}
									onChange={(e) =>
										setUpdateNote(e.target.value)
									}
									placeholder={
										dialogAction === 'resolve'
											? 'Describe how the incident was resolved...'
											: dialogAction === 'reopen'
												? 'Explain why the incident needs to be reopened...'
												: 'Add update notes...'
									}
									rows={4}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setIsUpdateDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={() => {
									handleStatusUpdate()
									setIsUpdateDialogOpen(false)
								}}
								disabled={isUpdating}
							>
								{isUpdating
									? 'Updating...'
									: getDialogConfig().submitText}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</main>
		</>
	)
}
