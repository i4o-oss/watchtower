import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { useSSE } from '~/hooks/useSSE'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import {
	Search,
	Settings2,
	Plus,
	AlertTriangleIcon,
	Clock,
	TrendingUp,
	ChevronDownIcon,
	ChevronRightIcon,
	CheckIcon,
} from 'lucide-react'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/incidents'
import { Separator } from '~/components/ui/separator'
import { useSuccessToast, useErrorToast } from '~/components/toast'

export function meta() {
	return [
		{ title: 'Incidents · Watchtower' },
		{ name: 'description', content: 'Manage system incidents' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/admin/incidents`, {
			method: 'GET',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.ok) {
			return await response.json()
		}

		return { incidents: [], total: 0 }
	} catch (error) {
		console.error('Error loading incidents:', error)
		return { incidents: [], total: 0 }
	}
}

export default function AdminIncidents({ loaderData }: Route.ComponentProps) {
	const { incidents: initialIncidents, total } = loaderData
	const [incidents, setIncidents] = useState(initialIncidents)
	const [historySearchTerm, setHistorySearchTerm] = useState('')
	const [historyStatusFilter, setHistoryStatusFilter] = useState('all')
	const [historySeverityFilter, setHistorySeverityFilter] = useState('all')
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [incidentToDelete, setIncidentToDelete] = useState<any>(null)
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
	const [incidentToUpdate, setIncidentToUpdate] = useState<any>(null)
	const [updateNote, setUpdateNote] = useState('')
	const [newStatus, setNewStatus] = useState('')
	const [dialogAction, setDialogAction] = useState<
		'investigating' | 'resolve'
	>('investigating')
	const [isUpdating, setIsUpdating] = useState(false)
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	// Real-time updates via Server-Sent Events
	useSSE(
		{
			incident_created: (event) => {
				try {
					const newIncident = JSON.parse(event.data)
					setIncidents((prev: any) => [...prev, newIncident])
				} catch (error) {
					console.error(
						'Error parsing incident_created event:',
						error,
					)
				}
			},
			incident_updated: (event) => {
				try {
					const updatedIncident = JSON.parse(event.data)
					setIncidents((prev: any) =>
						prev.map((incident: any) =>
							incident.id === updatedIncident.id
								? updatedIncident
								: incident,
						),
					)
				} catch (error) {
					console.error(
						'Error parsing incident_updated event:',
						error,
					)
				}
			},
			incident_deleted: (event) => {
				try {
					const deletedIncident = JSON.parse(event.data)
					setIncidents((prev: any) =>
						prev.filter(
							(incident: any) =>
								incident.id !== deletedIncident.id,
						),
					)
				} catch (error) {
					console.error(
						'Error parsing incident_deleted event:',
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

	const { activeIncidents, historyIncidents, filteredHistoryIncidents } =
		useMemo(() => {
			const active = incidents.filter(
				(incident: any) =>
					!['resolved', 'closed'].includes(incident.status),
			)
			const history = incidents.filter((incident: any) =>
				['resolved', 'closed'].includes(incident.status),
			)

			const filteredHistory = history.filter((incident: any) => {
				const matchesSearch =
					incident.title
						.toLowerCase()
						.includes(historySearchTerm.toLowerCase()) ||
					incident.description
						?.toLowerCase()
						.includes(historySearchTerm.toLowerCase())
				const matchesStatus =
					historyStatusFilter === 'all' ||
					incident.status === historyStatusFilter
				const matchesSeverity =
					historySeverityFilter === 'all' ||
					incident.severity === historySeverityFilter

				return matchesSearch && matchesStatus && matchesSeverity
			})

			return {
				activeIncidents: active,
				historyIncidents: history,
				filteredHistoryIncidents: filteredHistory,
			}
		}, [
			incidents,
			historySearchTerm,
			historyStatusFilter,
			historySeverityFilter,
		])

	const handleDelete = async (incident: any) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${incident.id}`,
				{
					method: 'DELETE',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (!response.ok) {
				console.error('Failed to delete incident')
			}
		} catch (error) {
			console.error('Error deleting incident:', error)
		}

		setDeleteDialogOpen(false)
		setIncidentToDelete(null)
	}

	const openUpdateDialog = (
		incident: any,
		action: 'investigating' | 'resolve',
	) => {
		setIncidentToUpdate(incident)
		setDialogAction(action)
		setNewStatus(action === 'resolve' ? 'resolved' : 'investigating')
		setUpdateNote('')
		setUpdateDialogOpen(true)
	}

	const handleStatusUpdate = async () => {
		if (!incidentToUpdate) return

		setIsUpdating(true)
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const updateData: any = {}

			if (newStatus !== incidentToUpdate.status) {
				updateData.status = newStatus
			}

			if (updateNote.trim()) {
				updateData.description = incidentToUpdate.description
					? `${incidentToUpdate.description}\n\nUpdate: ${updateNote.trim()}`
					: updateNote.trim()
			}

			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${incidentToUpdate.id}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updateData),
				},
			)

			if (response.ok) {
				successToast(
					'Incident Updated',
					'Status and notes have been updated',
				)
				setUpdateNote('')
				setUpdateDialogOpen(false)
				setIncidentToUpdate(null)
			} else {
				errorToast('Update Failed', 'Failed to update the incident')
			}
		} catch (error) {
			console.error('Error updating incident status:', error)
			errorToast('Network Error', 'Failed to update the incident')
		} finally {
			setIsUpdating(false)
		}
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
			default:
				return {
					title: 'Start Investigation',
					description:
						'Mark this incident as investigating and add an update',
					submitText: 'Start Investigation',
				}
		}
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

	const getAffectedServicesCount = (incident: any) => {
		return incident.endpoint_incidents?.length || 0
	}

	const getAffectedServicesNames = (incident: any) => {
		if (
			!incident.endpoint_incidents ||
			incident.endpoint_incidents.length === 0
		) {
			return []
		}
		return incident.endpoint_incidents.map(
			(ei: any) => ei.endpoint?.name || 'Unknown Service',
		)
	}

	const getSeverityBadge = (severity: string) => {
		const severityConfig = {
			critical: { variant: 'destructive' as const },
			high: { variant: 'destructive' as const },
			medium: { variant: 'default' as const },
			low: { variant: 'secondary' as const },
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
			investigating: { variant: 'default' as const },
			identified: { variant: 'default' as const },
			monitoring: { variant: 'default' as const },
			resolved: { variant: 'secondary' as const },
			closed: { variant: 'secondary' as const },
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

	// Calculate stats
	const avgResolutionTime =
		historyIncidents.filter((i: any) => i.end_time && i.created_at).length >
		0
			? Math.round(
					historyIncidents
						.filter((i: any) => i.end_time && i.created_at)
						.reduce(
							(acc: number, i: any) =>
								acc +
								(new Date(i.end_time).getTime() -
									new Date(i.created_at).getTime()),
							0,
						) /
						historyIncidents.filter(
							(i: any) => i.end_time && i.created_at,
						).length /
						(1000 * 60),
				)
			: 0
	const criticalIncidents = incidents.filter(
		(i: any) => i.severity === 'critical' || i.severity === 'high',
	).length

	return (
		<>
			<main className='flex flex-col gap-4'>
				{/* Quick Stats Section - Similar to /admin/endpoints/[id] pattern */}
				<section className='grid grid-cols-1 md:grid-cols-3 gap-4'>
					<div className='flex-1 flex items-center gap-4 p-4 border border-border rounded'>
						<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent/50 rounded-lg'>
							<AlertTriangleIcon className='h-7 w-7 text-yellow-500' />
						</div>
						<div className='flex flex-col'>
							<p className='text-sm font-normal font-mono uppercase'>
								Active Incidents
							</p>
							<p className='typography-h4'>
								{activeIncidents.length}
							</p>
						</div>
					</div>
					<div className='flex-1 flex items-center gap-4 p-4 border border-border rounded'>
						<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent/50 rounded-lg'>
							<TrendingUp className='h-7 w-7 text-green-500' />
						</div>
						<div className='flex flex-col'>
							<p className='text-sm font-normal font-mono uppercase'>
								Total Incidents
							</p>
							<p className='typography-h4'>{total}</p>
						</div>
					</div>
					<div className='flex-1 flex items-center gap-4 p-4 border border-border rounded'>
						<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent/50 rounded-lg'>
							<Clock className='h-7 w-7 text-purple-500' />
						</div>
						<div className='flex flex-col'>
							<p className='text-sm font-normal font-mono uppercase'>
								Avg Resolution
							</p>
							<p className='typography-h4'>
								{avgResolutionTime}m
							</p>
						</div>
					</div>
				</section>

				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
					<PageHeader
						title='Active Incidents'
						description='Ongoing incidents affecting services'
					>
						<Link to='/admin/incidents/new'>
							<Button size='sm'>
								<Plus className='h-4 w-4' />
								Create Incident
							</Button>
						</Link>
					</PageHeader>
					<Separator />
					{/* Active Incidents */}
					<CardContent className='p-0 gap-0 flex flex-col'>
						{activeIncidents.length === 0 ? (
							<div className='text-center py-8 text-muted-foreground'>
								<div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto'>
									<span className='text-2xl'>
										<CheckIcon className='h-8 w-8 text-foreground' />
									</span>
								</div>
								<h3 className='text-xl font-semibold mb-2 text-foreground'>
									All Systems Operational
								</h3>
								<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
									No active incidents at this time. All
									monitored services are running smoothly.
								</p>
								<Link to='/admin/incidents/new'>
									<Button>Report New Incident</Button>
								</Link>
							</div>
						) : (
							<div className='divide-y divide-border'>
								{activeIncidents
									.slice(0, 10)
									.map((incident: any) => (
										<div
											key={incident.id}
											className='flex items-center justify-between p-4'
										>
											<div className='flex-1 min-w-0 flex flex-col gap-2'>
												<div className='flex items-center gap-2'>
													<h4 className='font-medium'>
														{incident.title}
													</h4>
													{getStatusBadge(
														incident.status,
													)}
													{getSeverityBadge(
														incident.severity,
													)}
													{getAffectedServicesCount(
														incident,
													) > 0 && (
														<div className='flex items-center gap-1 flex-wrap'>
															{getAffectedServicesNames(
																incident,
															)
																.slice(0, 2)
																.map(
																	(
																		serviceName: string,
																		index: number,
																	) => (
																		<Badge
																			key={
																				index
																			}
																			variant='outline'
																			className='text-xs'
																		>
																			{
																				serviceName
																			}
																		</Badge>
																	),
																)}
															{getAffectedServicesCount(
																incident,
															) > 2 && (
																<Badge
																	variant='outline'
																	className='text-xs'
																>
																	+
																	{getAffectedServicesCount(
																		incident,
																	) - 2}{' '}
																	more
																</Badge>
															)}
														</div>
													)}
												</div>
												{incident.description && (
													<p className='text-sm text-muted-foreground truncate'>
														{incident.description
															.length > 100
															? `${incident.description.substring(0, 100)}...`
															: incident.description}
													</p>
												)}
												<span
													className='text-xs text-muted-foreground'
													title={incident.created_at}
												>
													{getTimeElapsed(
														incident.created_at,
													)}
												</span>
											</div>
											<div className='flex items-center gap-2 ml-4'>
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															className='cursor-pointer'
															size='sm'
															variant='ghost'
														>
															Change Status
															<ChevronDownIcon className='h-4 w-4' />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align='end'
														className='w-40'
													>
														<DropdownMenuItem
															disabled={
																incident.status ===
																'investigating'
															}
															onClick={() =>
																openUpdateDialog(
																	incident,
																	'investigating',
																)
															}
														>
															Investigating
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																openUpdateDialog(
																	incident,
																	'resolve',
																)
															}
														>
															Resolved
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
												<Link
													to={`/admin/incidents/${incident.id}`}
												>
													<Button
														className='cursor-pointer'
														size='sm'
														variant='ghost'
													>
														View
														<ChevronRightIcon className='h-4 w-4' />
													</Button>
												</Link>
											</div>
										</div>
									))}
							</div>
						)}
					</CardContent>
				</PageContent>

				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
					<PageHeader
						title='Incident History'
						description='Resolved and closed incidents with resolution analytics'
					/>
					<Separator />
					{/* Incident History */}
					<CardContent className='p-0 gap-0 flex flex-col'>
						{historyIncidents.length === 0 ? (
							<div className='text-center py-8 text-muted-foreground'>
								<div className='w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto'>
									<span className='text-2xl'>📋</span>
								</div>
								<h3 className='text-xl font-semibold mb-2 text-foreground'>
									No Incident History
								</h3>
								<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
									No resolved or closed incidents found.
									Historical data will appear here once
									incidents are resolved.
								</p>
							</div>
						) : (
							<>
								{/* Filters and Controls - for history only */}
								<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border'>
									<div className='relative flex-1 max-w-sm'>
										<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
										<Input
											placeholder='Search history...'
											value={historySearchTerm}
											onChange={(e) =>
												setHistorySearchTerm(
													e.target.value,
												)
											}
											className='pl-10'
										/>
									</div>
									<div className='flex items-center gap-4'>
										<Select
											value={historyStatusFilter}
											onValueChange={
												setHistoryStatusFilter
											}
										>
											<SelectTrigger className='w-36'>
												<SelectValue placeholder='All Status' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='all'>
													All Status
												</SelectItem>
												<SelectItem value='resolved'>
													Resolved
												</SelectItem>
												<SelectItem value='closed'>
													Closed
												</SelectItem>
											</SelectContent>
										</Select>
										<Select
											value={historySeverityFilter}
											onValueChange={
												setHistorySeverityFilter
											}
										>
											<SelectTrigger className='w-36'>
												<SelectValue placeholder='All Severity' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='all'>
													All Severity
												</SelectItem>
												<SelectItem value='critical'>
													Critical
												</SelectItem>
												<SelectItem value='high'>
													High
												</SelectItem>
												<SelectItem value='medium'>
													Medium
												</SelectItem>
												<SelectItem value='low'>
													Low
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* History List */}
								<div className='divide-y divide-border'>
									{filteredHistoryIncidents.map(
										(incident: any) => {
											const resolutionTime =
												incident.end_time &&
												incident.created_at
													? Math.round(
															(new Date(
																incident.end_time,
															).getTime() -
																new Date(
																	incident.created_at,
																).getTime()) /
																(1000 * 60),
														)
													: null

											return (
												<Link
													key={incident.id}
													to={`/admin/incidents/${incident.id}`}
													className='block hover:bg-accent/50 transition-colors'
												>
													<div className='p-4'>
														<div className='flex items-start justify-between gap-4'>
															<div className='flex-1 min-w-0'>
																<div className='flex items-center gap-2 mb-2'>
																	<h4 className='font-medium text-base leading-tight'>
																		{
																			incident.title
																		}
																	</h4>
																	{getStatusBadge(
																		incident.status,
																	)}
																	{getSeverityBadge(
																		incident.severity,
																	)}
																	{getAffectedServicesCount(
																		incident,
																	) > 0 && (
																		<div className='flex items-center gap-1 flex-wrap'>
																			{getAffectedServicesNames(
																				incident,
																			)
																				.slice(
																					0,
																					3,
																				)
																				.map(
																					(
																						serviceName: string,
																						index: number,
																					) => (
																						<Badge
																							key={
																								index
																							}
																							variant='outline'
																							className='text-xs'
																						>
																							{
																								serviceName
																							}
																						</Badge>
																					),
																				)}
																			{getAffectedServicesCount(
																				incident,
																			) >
																				3 && (
																				<Badge
																					variant='outline'
																					className='text-xs'
																				>
																					+
																					{getAffectedServicesCount(
																						incident,
																					) -
																						3}{' '}
																					more
																				</Badge>
																			)}
																		</div>
																	)}
																</div>

																{incident.description && (
																	<p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
																		{
																			incident.description
																		}
																	</p>
																)}

																<div className='flex items-center gap-4 text-xs text-muted-foreground'>
																	<span className='flex items-center gap-1'>
																		<Clock className='h-3 w-3' />
																		{new Date(
																			incident.created_at,
																		).toLocaleDateString(
																			'en-US',
																			{
																				month: 'short',
																				day: 'numeric',
																				year: 'numeric',
																			},
																		)}
																	</span>
																	{resolutionTime && (
																		<span className='flex items-center gap-1'>
																			<span>
																				Resolved
																				in:
																			</span>
																			<span className='font-medium'>
																				{resolutionTime <
																				60
																					? `${resolutionTime}m`
																					: resolutionTime <
																							1440
																						? `${Math.floor(
																								resolutionTime /
																									60,
																							)}h ${resolutionTime % 60}m`
																						: `${Math.floor(
																								resolutionTime /
																									1440,
																							)}d ${Math.floor(
																								(resolutionTime %
																									1440) /
																									60,
																							)}h`}
																			</span>
																		</span>
																	)}
																</div>
															</div>
															<ChevronRightIcon className='h-4 w-4 text-muted-foreground mt-1' />
														</div>
													</div>
												</Link>
											)
										},
									)}
								</div>
							</>
						)}
					</CardContent>
				</PageContent>
			</main>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Incident</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "
							{incidentToDelete?.title}"? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => handleDelete(incidentToDelete)}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Update Dialog */}
			<Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
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
									<SelectItem value='open'>Open</SelectItem>
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
								{dialogAction === 'resolve'
									? 'Resolution Message'
									: 'Investigation Notes'}
							</Label>
							<Textarea
								id='update_note'
								value={updateNote}
								onChange={(e) => setUpdateNote(e.target.value)}
								placeholder={
									dialogAction === 'resolve'
										? 'Describe how the incident was resolved...'
										: 'Add investigation notes or current status...'
								}
								rows={4}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setUpdateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleStatusUpdate}
							disabled={isUpdating}
						>
							{isUpdating
								? 'Updating...'
								: getDialogConfig().submitText}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
