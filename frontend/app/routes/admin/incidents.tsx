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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
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
import { Search, Settings2, Plus } from 'lucide-react'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/incidents'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Incidents - Admin - Watchtower' },
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
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [severityFilter, setSeverityFilter] = useState('all')
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [incidentToDelete, setIncidentToDelete] = useState<any>(null)
	const navigate = useNavigate()

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

	const { activeIncidents, historyIncidents, filteredIncidents } =
		useMemo(() => {
			const active = incidents.filter(
				(incident: any) =>
					!['resolved', 'closed'].includes(incident.status),
			)
			const history = incidents.filter((incident: any) =>
				['resolved', 'closed'].includes(incident.status),
			)

			const filtered = incidents.filter((incident: any) => {
				const matchesSearch =
					incident.title
						.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					incident.description
						?.toLowerCase()
						.includes(searchTerm.toLowerCase())
				const matchesStatus =
					statusFilter === 'all' || incident.status === statusFilter
				const matchesSeverity =
					severityFilter === 'all' ||
					incident.severity === severityFilter

				return matchesSearch && matchesStatus && matchesSeverity
			})

			return {
				activeIncidents: active,
				historyIncidents: history,
				filteredIncidents: filtered,
			}
		}, [incidents, searchTerm, statusFilter, severityFilter])

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

	const updateIncidentStatus = async (incident: any, newStatus: string) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/incidents/${incident.id}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: newStatus }),
				},
			)

			if (!response.ok) {
				console.error('Failed to update incident status')
			}
		} catch (error) {
			console.error('Error updating incident status:', error)
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
		return incident.endpoint_ids?.length || 0
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

	return (
		<div className='space-y-8'>
			<div className='flex justify-between items-center'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Incident Management
					</h1>
					<p className='text-lg text-muted-foreground mt-2'>
						Complete lifecycle management for service incidents
					</p>
				</div>
				<Link to='/admin/incidents/new'>
					<Button size='lg' className='gap-2 shadow-lg'>
						<Plus className='h-4 w-4' />
						<span className='text-base font-medium'>
							Create Incident
						</span>
					</Button>
				</Link>
			</div>

			<Tabs defaultValue='active' className='space-y-6'>
				<div className='flex flex-col gap-4'>
					<TabsList className='grid w-full sm:w-auto grid-cols-2'>
						<TabsTrigger
							value='active'
							className='flex items-center gap-2 px-6'
						>
							🔥 Active Incidents
							{activeIncidents.length > 0 && (
								<Badge
									variant='destructive'
									className='ml-1 px-1.5 py-0.5 text-xs'
								>
									{activeIncidents.length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger
							value='history'
							className='flex items-center gap-2 px-6'
						>
							📋 Incident History
						</TabsTrigger>
					</TabsList>

					{/* Filters and Controls - matching endpoints table style */}
					<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
						<div className='flex flex-1 items-center gap-4'>
							<div className='relative flex-1 max-w-sm'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search all columns...'
									value={searchTerm}
									onChange={(e) =>
										setSearchTerm(e.target.value)
									}
									className='pl-10'
								/>
							</div>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger className='w-36'>
									<SelectValue placeholder='All Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Status
									</SelectItem>
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
								</SelectContent>
							</Select>
							<Select
								value={severityFilter}
								onValueChange={setSeverityFilter}
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
									<SelectItem value='high'>High</SelectItem>
									<SelectItem value='medium'>
										Medium
									</SelectItem>
									<SelectItem value='low'>Low</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='flex items-center gap-2'>
							<Button
								variant='outline'
								size='sm'
								className='gap-2'
							>
								<Settings2 className='h-4 w-4' />
								View
							</Button>
							<div className='text-sm text-muted-foreground'>
								{filteredIncidents.length} of {total}{' '}
								incident(s)
							</div>
						</div>
					</div>
				</div>

				<TabsContent value='active' className='space-y-6'>
					{activeIncidents.length === 0 ? (
						<Card>
							<CardContent className='flex flex-col items-center justify-center py-16 text-center'>
								<div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4'>
									<span className='text-2xl'>✅</span>
								</div>
								<h3 className='text-xl font-semibold mb-2'>
									All Systems Operational
								</h3>
								<p className='text-muted-foreground mb-6 max-w-md'>
									No active incidents at this time. All
									monitored services are running smoothly.
								</p>
								<Link to='/admin/incidents/new'>
									<Button>Report New Incident</Button>
								</Link>
							</CardContent>
						</Card>
					) : (
						<div className='grid gap-4'>
							{activeIncidents
								.filter((incident: any) => {
									const matchesSearch =
										searchTerm === '' ||
										incident.title
											.toLowerCase()
											.includes(
												searchTerm.toLowerCase(),
											) ||
										incident.description
											?.toLowerCase()
											.includes(searchTerm.toLowerCase())
									const matchesStatus =
										statusFilter === 'all' ||
										incident.status === statusFilter
									const matchesSeverity =
										severityFilter === 'all' ||
										incident.severity === severityFilter
									return (
										matchesSearch &&
										matchesStatus &&
										matchesSeverity
									)
								})
								.map((incident: any) => (
									<Card
										key={incident.id}
										className='hover:shadow-md transition-shadow'
									>
										<CardContent className='p-6'>
											<div className='flex items-start justify-between'>
												<div className='flex-1 space-y-4'>
													<div className='flex items-start gap-4'>
														<div className='flex-1'>
															<div className='flex items-center gap-3 mb-2'>
																<h3 className='text-xl font-semibold leading-tight'>
																	{
																		incident.title
																	}
																</h3>
															</div>
															<div className='flex items-center gap-3 mb-3'>
																{getStatusBadge(
																	incident.status,
																)}
																{getSeverityBadge(
																	incident.severity,
																)}
																<span className='text-sm text-muted-foreground'>
																	{getTimeElapsed(
																		incident.created_at,
																	)}
																</span>
																{getAffectedServicesCount(
																	incident,
																) > 0 && (
																	<Badge
																		variant='outline'
																		className='text-xs'
																	>
																		{getAffectedServicesCount(
																			incident,
																		)}{' '}
																		service
																		{getAffectedServicesCount(
																			incident,
																		) !== 1
																			? 's'
																			: ''}{' '}
																		affected
																	</Badge>
																)}
															</div>
															{incident.description && (
																<p className='text-muted-foreground leading-relaxed'>
																	{incident
																		.description
																		.length >
																	200
																		? `${incident.description.substring(0, 200)}...`
																		: incident.description}
																</p>
															)}
														</div>
													</div>
													<div className='flex gap-2 pt-2'>
														<Button
															variant='outline'
															size='sm'
															onClick={() =>
																updateIncidentStatus(
																	incident,
																	'investigating',
																)
															}
															disabled={
																incident.status ===
																'investigating'
															}
														>
															🔍 Investigating
														</Button>
														<Button
															variant='outline'
															size='sm'
															onClick={() =>
																updateIncidentStatus(
																	incident,
																	'resolved',
																)
															}
														>
															✅ Resolve
														</Button>
														<Link
															to={`/admin/incidents/${incident.id}`}
														>
															<Button
																variant='ghost'
																size='sm'
															>
																📝 Details
															</Button>
														</Link>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
						</div>
					)}
				</TabsContent>

				<TabsContent value='history' className='space-y-6'>
					{historyIncidents.length === 0 ? (
						<Card>
							<CardContent className='flex flex-col items-center justify-center py-16 text-center'>
								<div className='w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4'>
									<span className='text-2xl'>📋</span>
								</div>
								<h3 className='text-xl font-semibold mb-2'>
									No Incident History
								</h3>
								<p className='text-muted-foreground mb-6 max-w-md'>
									No resolved or closed incidents found.
									Historical data will appear here once
									incidents are resolved.
								</p>
							</CardContent>
						</Card>
					) : (
						<>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
								<Card>
									<CardContent className='p-6 text-center'>
										<div className='text-2xl font-bold'>
											{historyIncidents.length}
										</div>
										<div className='text-sm text-muted-foreground'>
											Total Incidents
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className='p-6 text-center'>
										<div className='text-2xl font-bold'>
											{Math.round(
												historyIncidents
													.filter(
														(i) =>
															i.end_time &&
															i.created_at,
													)
													.reduce(
														(acc, i) =>
															acc +
															(new Date(
																i.end_time,
															).getTime() -
																new Date(
																	i.created_at,
																).getTime()),
														0,
													) /
													historyIncidents.filter(
														(i) =>
															i.end_time &&
															i.created_at,
													).length /
													(1000 * 60),
											) || 0}
											m
										</div>
										<div className='text-sm text-muted-foreground'>
											Avg Resolution Time
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className='p-6 text-center'>
										<div className='text-2xl font-bold'>
											{
												historyIncidents.filter(
													(i) =>
														i.severity ===
															'critical' ||
														i.severity === 'high',
												).length
											}
										</div>
										<div className='text-sm text-muted-foreground'>
											High/Critical Incidents
										</div>
									</CardContent>
								</Card>
							</div>

							<Card>
								<CardHeader>
									<CardTitle>Incident History</CardTitle>
									<CardDescription>
										Resolved and closed incidents with
										resolution analytics
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='space-y-4'>
										{historyIncidents
											.filter((incident: any) => {
												const matchesSearch =
													searchTerm === '' ||
													incident.title
														.toLowerCase()
														.includes(
															searchTerm.toLowerCase(),
														) ||
													incident.description
														?.toLowerCase()
														.includes(
															searchTerm.toLowerCase(),
														)
												const matchesStatus =
													statusFilter === 'all' ||
													incident.status ===
														statusFilter
												const matchesSeverity =
													severityFilter === 'all' ||
													incident.severity ===
														severityFilter
												return (
													matchesSearch &&
													matchesStatus &&
													matchesSeverity
												)
											})
											.map((incident: any) => {
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
													<div
														key={incident.id}
														className='border rounded-lg p-4 hover:bg-muted/50 transition-colors'
													>
														<div className='flex items-start justify-between'>
															<div className='flex-1'>
																<div className='flex items-center gap-3 mb-2'>
																	<h4 className='font-medium'>
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
																</div>
																<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground'>
																	<div>
																		<span className='font-medium'>
																			Created:
																		</span>
																		<br />
																		{new Date(
																			incident.created_at,
																		).toLocaleDateString()}
																	</div>
																	{incident.end_time && (
																		<div>
																			<span className='font-medium'>
																				Resolved:
																			</span>
																			<br />
																			{new Date(
																				incident.end_time,
																			).toLocaleDateString()}
																		</div>
																	)}
																	{resolutionTime && (
																		<div>
																			<span className='font-medium'>
																				Duration:
																			</span>
																			<br />
																			{
																				resolutionTime
																			}
																			m
																		</div>
																	)}
																	{getAffectedServicesCount(
																		incident,
																	) > 0 && (
																		<div>
																			<span className='font-medium'>
																				Services:
																			</span>
																			<br />
																			{getAffectedServicesCount(
																				incident,
																			)}{' '}
																			affected
																		</div>
																	)}
																</div>
															</div>
															<Link
																to={`/admin/incidents/${incident.id}`}
															>
																<Button
																	variant='ghost'
																	size='sm'
																>
																	📝 View
																	Details
																</Button>
															</Link>
														</div>
													</div>
												)
											})}
									</div>
								</CardContent>
							</Card>
						</>
					)}
				</TabsContent>
			</Tabs>

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
		</div>
	)
}
