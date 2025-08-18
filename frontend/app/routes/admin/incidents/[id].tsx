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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Separator } from '~/components/ui/separator'
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
import { useSSE } from '~/hooks/useSSE'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/[id]'

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: `Incident Details - Admin - Watchtower` },
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
	const [publicMessage, setPublicMessage] = useState('')
	const [isPublicMessageDialogOpen, setIsPublicMessageDialogOpen] =
		useState(false)
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

	const handlePublicMessageUpdate = async () => {
		if (!publicMessage.trim()) return

		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${params.id}/public-message`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: publicMessage.trim() }),
				},
			)

			if (response.ok) {
				successToast(
					'Public Message Posted',
					'Your message has been published to the status page',
				)
				setPublicMessage('')
				setIsPublicMessageDialogOpen(false)
			} else {
				errorToast(
					'Publish Failed',
					'Failed to publish the public message',
				)
			}
		} catch (error) {
			console.error('Error publishing message:', error)
			errorToast('Network Error', 'Failed to publish the public message')
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
			<div className='flex items-center gap-2'>
				<div className={`w-2 h-2 rounded-full ${config.color}`} />
				<Badge variant={config.variant} className='capitalize'>
					{severity}
				</Badge>
			</div>
		)
	}

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			open: { variant: 'destructive' as const, icon: '🔴' },
			investigating: { variant: 'default' as const, icon: '🔍' },
			identified: { variant: 'default' as const, icon: '✅' },
			monitoring: { variant: 'default' as const, icon: '👀' },
			resolved: { variant: 'secondary' as const, icon: '✅' },
			closed: { variant: 'secondary' as const, icon: '🔒' },
		}

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig.open

		return (
			<Badge variant={config.variant} className='capitalize'>
				<span className='mr-1'>{config.icon}</span>
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

	const getStatusProgressSteps = () => {
		const steps = [
			'open',
			'investigating',
			'identified',
			'monitoring',
			'resolved',
		]
		const currentIndex = steps.indexOf(incident.status)

		return steps.map((step, index) => ({
			name: step,
			completed: index <= currentIndex,
			current: step === incident.status,
		}))
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
			<main className='flex flex-col gap-6'>
				{/* Quick Stats Section - Similar to other admin routes */}
				<section className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									{incident.status === 'resolved' ? (
										<span className='text-2xl'>✅</span>
									) : incident.severity === 'critical' ? (
										<span className='text-2xl'>🚨</span>
									) : (
										<span className='text-2xl'>⚠️</span>
									)}
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Status
									</p>
									<p className='typography-h4 capitalize'>
										{incident.status}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<span className='text-2xl'>🎯</span>
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Affected Services
									</p>
									<p className='typography-h4'>
										{affectedServices}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<span className='text-2xl'>⏱️</span>
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
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

				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
					<PageHeader
						title={incident.title}
						description={`${incident.severity} severity incident • Started ${getTimeElapsed(incident.created_at)}${getAffectedEndpoints().length > 0 ? ` • ${getAffectedEndpoints().length} service${getAffectedEndpoints().length !== 1 ? 's' : ''} affected` : ' • No services specified'}`}
					>
						<div className='flex flex-wrap items-center gap-2'>
							<Link to='/admin/incidents'>
								<Button variant='outline' size='sm'>
									← Back to Incidents
								</Button>
							</Link>
							<Dialog
								open={isPublicMessageDialogOpen}
								onOpenChange={setIsPublicMessageDialogOpen}
							>
								<DialogTrigger asChild>
									<Button size='sm'>📢 Post Update</Button>
								</DialogTrigger>
								<DialogContent className='max-w-md'>
									<DialogHeader>
										<DialogTitle>
											Post Public Update
										</DialogTitle>
										<DialogDescription>
											Share an update with your users on
											the status page
										</DialogDescription>
									</DialogHeader>
									<div className='space-y-4'>
										<div className='space-y-2'>
											<Label htmlFor='public_message'>
												Message
											</Label>
											<Textarea
												id='public_message'
												value={publicMessage}
												onChange={(e) =>
													setPublicMessage(
														e.target.value,
													)
												}
												placeholder='We are actively investigating this issue and will provide updates as we learn more...'
												rows={4}
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant='outline'
											onClick={() =>
												setIsPublicMessageDialogOpen(
													false,
												)
											}
										>
											Cancel
										</Button>
										<Button
											onClick={handlePublicMessageUpdate}
											disabled={!publicMessage.trim()}
										>
											Publish Update
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant='destructive' size='sm'>
										🗑️ Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Delete Incident
										</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to permanently
											delete this incident? This action
											cannot be undone and will remove all
											associated timeline data.
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
						</div>
					</PageHeader>

					<Card className='rounded-none shadow-none border-none flex-1'>
						<CardContent className='p-6 gap-0 flex flex-col h-full'>
							<Tabs defaultValue='overview' className='space-y-6'>
								<TabsList className='grid w-full grid-cols-3'>
									<TabsTrigger
										value='overview'
										className='flex items-center gap-2'
									>
										📋 Overview
									</TabsTrigger>
									<TabsTrigger
										value='timeline'
										className='flex items-center gap-2'
									>
										⏱️ Timeline
									</TabsTrigger>
									<TabsTrigger
										value='communication'
										className='flex items-center gap-2'
									>
										📢 Public Preview
									</TabsTrigger>
								</TabsList>

								<TabsContent
									value='overview'
									className='space-y-6'
								>
									<div className='grid gap-6 lg:grid-cols-3'>
										{/* Main Incident Details */}
										<div className='lg:col-span-2 space-y-6'>
											<Card>
												<CardHeader>
													<CardTitle className='flex items-center gap-2'>
														📝 Incident Information
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-6'>
													{incident.description && (
														<div>
															<h4 className='font-medium mb-3'>
																Description
															</h4>
															<div className='bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed'>
																{
																	incident.description
																}
															</div>
														</div>
													)}

													<div className='grid grid-cols-2 md:grid-cols-3 gap-6'>
														<div>
															<h4 className='font-medium text-sm text-muted-foreground mb-1'>
																Status
															</h4>
															<div className='flex items-center gap-2'>
																{getStatusBadge(
																	incident.status,
																)}
															</div>
														</div>
														<div>
															<h4 className='font-medium text-sm text-muted-foreground mb-1'>
																Severity
															</h4>
															<div>
																{getSeverityBadge(
																	incident.severity,
																)}
															</div>
														</div>
														<div>
															<h4 className='font-medium text-sm text-muted-foreground mb-1'>
																Created
															</h4>
															<p className='text-sm'>
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
																<p className='text-sm'>
																	{new Date(
																		incident.end_time,
																	).toLocaleString()}
																</p>
															</div>
														)}
														{incident.created_by && (
															<div>
																<h4 className='font-medium text-sm text-muted-foreground mb-1'>
																	Reporter
																</h4>
																<p className='text-sm'>
																	User #
																	{
																		incident.created_by
																	}
																</p>
															</div>
														)}
													</div>
												</CardContent>
											</Card>

											{/* Impact Assessment */}
											<Card>
												<CardHeader>
													<CardTitle className='flex items-center gap-2'>
														🎯 Impact Assessment
													</CardTitle>
													<CardDescription>
														Services and endpoints
														affected by this
														incident
													</CardDescription>
												</CardHeader>
												<CardContent>
													{getAffectedEndpoints()
														.length > 0 ? (
														<div className='space-y-3'>
															{getAffectedEndpoints().map(
																(
																	endpoint: any,
																) => (
																	<div
																		key={
																			endpoint.id
																		}
																		className='flex items-center justify-between p-3 border rounded-lg'
																	>
																		<div className='flex-1'>
																			<div className='font-medium'>
																				{
																					endpoint.name
																				}
																			</div>
																			<div className='text-sm text-muted-foreground'>
																				{
																					endpoint.url
																				}
																			</div>
																		</div>
																		<div className='flex items-center gap-2'>
																			<Badge
																				variant={
																					endpoint.status ===
																					'up'
																						? 'secondary'
																						: 'destructive'
																				}
																				className='text-xs'
																			>
																				{endpoint.status ||
																					'Unknown'}
																			</Badge>
																		</div>
																	</div>
																),
															)}
														</div>
													) : (
														<div className='text-center py-8'>
															<div className='w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3'>
																<span className='text-xl'>
																	📊
																</span>
															</div>
															<p className='text-muted-foreground'>
																No specific
																services were
																identified as
																affected by this
																incident
															</p>
														</div>
													)}
												</CardContent>
											</Card>
										</div>

										{/* Sidebar Actions */}
										<div className='space-y-6'>
											{/* Quick Status Updates */}
											<Card>
												<CardHeader>
													<CardTitle className='flex items-center gap-2'>
														⚡ Quick Actions
													</CardTitle>
												</CardHeader>
												<CardContent className='space-y-3'>
													{getStatusProgressSteps().map(
														(step) => (
															<Button
																key={step.name}
																variant={
																	step.current
																		? 'default'
																		: step.completed
																			? 'secondary'
																			: 'outline'
																}
																className={`w-full justify-start ${step.current ? 'ring-2 ring-primary' : ''}`}
																onClick={() => {
																	setNewStatus(
																		step.name,
																	)
																	handleStatusUpdate()
																}}
																disabled={
																	step.completed &&
																	step.name !==
																		'resolved'
																}
															>
																<span>
																	{step.completed
																		? '✅'
																		: '⭕'}
																</span>
																<span className='capitalize'>
																	{step.name.replace(
																		'_',
																		' ',
																	)}
																</span>
															</Button>
														),
													)}

													<Separator className='my-4' />

													<div className='space-y-3'>
														<Button
															variant='outline'
															className='w-full'
															onClick={() =>
																setIsPublicMessageDialogOpen(
																	true,
																)
															}
														>
															📢 Post Public
															Update
														</Button>

														{incident.status ===
															'resolved' && (
															<Button
																variant='outline'
																className='w-full'
																onClick={() => {
																	setNewStatus(
																		'open',
																	)
																	handleStatusUpdate()
																}}
															>
																🔄 Reopen
																Incident
															</Button>
														)}
													</div>
												</CardContent>
											</Card>

											{/* Status Timeline */}
											<Card>
												<CardHeader>
													<CardTitle className='flex items-center gap-2'>
														📅 Key Timestamps
													</CardTitle>
												</CardHeader>
												<CardContent>
													<div className='space-y-4 text-sm'>
														<div className='flex justify-between items-center'>
															<span className='text-muted-foreground'>
																Created
															</span>
															<span className='font-mono'>
																{new Date(
																	incident.created_at,
																).toLocaleString()}
															</span>
														</div>

														{incident.updated_at &&
															incident.updated_at !==
																incident.created_at && (
																<div className='flex justify-between items-center'>
																	<span className='text-muted-foreground'>
																		Last
																		Updated
																	</span>
																	<span className='font-mono'>
																		{new Date(
																			incident.updated_at,
																		).toLocaleString()}
																	</span>
																</div>
															)}

														{incident.end_time && (
															<div className='flex justify-between items-center'>
																<span className='text-muted-foreground'>
																	Resolved
																</span>
																<span className='font-mono'>
																	{new Date(
																		incident.end_time,
																	).toLocaleString()}
																</span>
															</div>
														)}

														{incident.end_time &&
															incident.created_at && (
																<>
																	<Separator />
																	<div className='flex justify-between items-center'>
																		<span className='text-muted-foreground'>
																			Total
																			Duration
																		</span>
																		<span className='font-medium'>
																			{Math.round(
																				(new Date(
																					incident.end_time,
																				).getTime() -
																					new Date(
																						incident.created_at,
																					).getTime()) /
																					(1000 *
																						60),
																			)}{' '}
																			minutes
																		</span>
																	</div>
																</>
															)}
													</div>
												</CardContent>
											</Card>
										</div>
									</div>
								</TabsContent>

								<TabsContent
									value='timeline'
									className='space-y-6'
								>
									<Card>
										<CardHeader>
											<CardTitle className='flex items-center gap-2'>
												⏱️ Incident Timeline
											</CardTitle>
											<CardDescription>
												Chronological sequence of status
												updates and communications
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className='space-y-6'>
												{/* Status Update Form */}
												<Card>
													<CardHeader>
														<CardTitle className='text-lg'>
															Add Timeline Entry
														</CardTitle>
													</CardHeader>
													<CardContent className='space-y-4'>
														<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
															<div className='space-y-2'>
																<Label htmlFor='status'>
																	Update
																	Status
																</Label>
																<Select
																	value={
																		newStatus
																	}
																	onValueChange={
																		setNewStatus
																	}
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
															<div className='flex items-end'>
																<Button
																	onClick={
																		handleStatusUpdate
																	}
																	disabled={
																		newStatus ===
																		incident.status
																	}
																	className='w-full'
																>
																	{isUpdating
																		? 'Updating...'
																		: 'Update Status'}
																</Button>
															</div>
														</div>

														<div className='space-y-2'>
															<Label htmlFor='note'>
																Internal Notes
																(Optional)
															</Label>
															<Textarea
																id='note'
																value={
																	updateNote
																}
																onChange={(e) =>
																	setUpdateNote(
																		e.target
																			.value,
																	)
																}
																placeholder='Add internal notes about this status change or investigation progress...'
																rows={3}
															/>
														</div>
													</CardContent>
												</Card>

												{/* Timeline Display */}
												<div className='relative'>
													<div className='absolute left-4 top-0 bottom-0 w-0.5 bg-border'></div>
													<div className='space-y-6'>
														<div className='flex gap-4'>
															<div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center relative z-10'>
																<span className='text-sm'>
																	📅
																</span>
															</div>
															<div className='flex-1 pb-4'>
																<div className='flex items-center gap-2 mb-1'>
																	<span className='font-medium'>
																		Incident
																		Created
																	</span>
																	<Badge
																		variant='outline'
																		className='text-xs'
																	>
																		{incident.status ===
																		'open'
																			? 'Current'
																			: 'Initial'}
																	</Badge>
																</div>
																<p className='text-sm text-muted-foreground'>
																	{new Date(
																		incident.created_at,
																	).toLocaleString()}
																</p>
															</div>
														</div>

														{incident.status !==
															'open' && (
															<div className='flex gap-4'>
																<div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center relative z-10'>
																	<span className='text-sm'>
																		🔍
																	</span>
																</div>
																<div className='flex-1 pb-4'>
																	<div className='flex items-center gap-2 mb-1'>
																		<span className='font-medium'>
																			Status
																			Updated
																			to{' '}
																			{
																				incident.status
																			}
																		</span>
																		{incident.status ===
																			incident.status && (
																			<Badge
																				variant='default'
																				className='text-xs'
																			>
																				Current
																			</Badge>
																		)}
																	</div>
																	<p className='text-sm text-muted-foreground'>
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
																	<span className='text-sm'>
																		✅
																	</span>
																</div>
																<div className='flex-1 pb-4'>
																	<div className='flex items-center gap-2 mb-1'>
																		<span className='font-medium'>
																			Incident
																			Resolved
																		</span>
																		<Badge
																			variant='secondary'
																			className='text-xs'
																		>
																			Final
																		</Badge>
																	</div>
																	<p className='text-sm text-muted-foreground'>
																		{new Date(
																			incident.end_time,
																		).toLocaleString()}
																	</p>
																</div>
															</div>
														)}
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent
									value='communication'
									className='space-y-6'
								>
									<Card>
										<CardHeader>
											<CardTitle className='flex items-center gap-2'>
												👁️ Public Status Page Preview
											</CardTitle>
											<CardDescription>
												How this incident appears to
												your users on the public status
												page
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className='border rounded-lg p-6 bg-muted/50'>
												<div className='max-w-2xl mx-auto space-y-4'>
													<div className='flex items-center justify-between'>
														<div className='flex items-center gap-3'>
															{getStatusBadge(
																incident.status,
															)}
															{getSeverityBadge(
																incident.severity,
															)}
														</div>
														<span className='text-sm text-muted-foreground'>
															{getTimeElapsed(
																incident.created_at,
															)}
														</span>
													</div>

													<h3 className='text-xl font-semibold'>
														{incident.title}
													</h3>

													{incident.description && (
														<p className='text-muted-foreground leading-relaxed'>
															{
																incident.description.split(
																	'\n',
																)[0]
															}{' '}
															{/* Show first paragraph only for preview */}
														</p>
													)}

													{getAffectedEndpoints()
														.length > 0 && (
														<div className='space-y-2'>
															<h4 className='font-medium text-sm'>
																Affected
																Services:
															</h4>
															<div className='flex flex-wrap gap-2'>
																{getAffectedEndpoints().map(
																	(
																		endpoint: any,
																	) => (
																		<Badge
																			key={
																				endpoint.id
																			}
																			variant='outline'
																			className='text-xs'
																		>
																			{
																				endpoint.name
																			}
																		</Badge>
																	),
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className='flex items-center gap-2'>
												📝 Message Templates
											</CardTitle>
											<CardDescription>
												Pre-written templates for common
												incident communications
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className='grid gap-4'>
												{[
													{
														title: 'Service Investigation',
														template:
															'We are aware of issues affecting our service and are actively investigating. We will provide updates as more information becomes available.',
													},
													{
														title: 'Issue Identified',
														template:
															'We have identified the root cause of the service disruption and are implementing a fix. Expected resolution within the next hour.',
													},
													{
														title: 'Service Restored',
														template:
															'The issue has been resolved and all services are now operating normally. We apologize for any inconvenience caused.',
													},
												].map((template, index) => (
													<div
														key={index}
														className='border rounded-lg p-4 space-y-2'
													>
														<div className='flex items-center justify-between'>
															<h4 className='font-medium'>
																{template.title}
															</h4>
															<Button
																variant='outline'
																size='sm'
																onClick={() => {
																	setPublicMessage(
																		template.template,
																	)
																	setIsPublicMessageDialogOpen(
																		true,
																	)
																}}
															>
																Use Template
															</Button>
														</div>
														<p className='text-sm text-muted-foreground'>
															{template.template}
														</p>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</PageContent>
			</main>
		</>
	)
}
