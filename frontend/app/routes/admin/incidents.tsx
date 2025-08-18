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
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import {
	Search,
	Settings2,
	Plus,
	AlertTriangleIcon,
	Clock,
	TrendingUp,
} from 'lucide-react'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/incidents'
import { Separator } from '~/components/ui/separator'

export function meta() {
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
	const [historySearchTerm, setHistorySearchTerm] = useState('')
	const [historyStatusFilter, setHistoryStatusFilter] = useState('all')
	const [historySeverityFilter, setHistorySeverityFilter] = useState('all')
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
			<main className='flex flex-col gap-6'>
				{/* Quick Stats Section - Similar to /admin/endpoints/[id] pattern */}
				<section className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<AlertTriangleIcon className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Active Incidents
									</p>
									<p className='typography-h4'>
										{activeIncidents.length}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<TrendingUp className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Total Incidents
									</p>
									<p className='typography-h4'>{total}</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className='flex items-center gap-4'>
								<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
									<Clock className='h-7 w-7' />
								</div>
								<div className='flex flex-col'>
									<p className='text-sm font-normal'>
										Avg Resolution
									</p>
									<p className='typography-h4'>
										{avgResolutionTime}m
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
					<PageHeader
						title='Incident Management'
						description='Complete lifecycle management for service incidents'
					>
						<Link to='/admin/incidents/new'>
							<Button size='sm'>
								<Plus className='h-4 w-4' />
								Create Incident
							</Button>
						</Link>
					</PageHeader>

					{/* Main Sections */}
					<CardContent className='p-0 gap-0 flex flex-col'>
						{/* Active Incidents */}
						<Card className='rounded-none shadow-none border-none'>
							<CardHeader className='flex flex-row items-center justify-between'>
								<div>
									<CardTitle className='flex items-center gap-2'>
										🔥 Active Incidents
										{activeIncidents.length > 0 && (
											<Badge
												variant='destructive'
												className='ml-1 px-1.5 py-0.5 text-xs'
											>
												{activeIncidents.length}
											</Badge>
										)}
									</CardTitle>
									<CardDescription>
										Current incidents requiring immediate
										attention
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent>
								{activeIncidents.length === 0 ? (
									<div className='text-center py-8 text-muted-foreground'>
										<div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto'>
											<span className='text-2xl'>✅</span>
										</div>
										<h3 className='text-xl font-semibold mb-2 text-foreground'>
											All Systems Operational
										</h3>
										<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
											No active incidents at this time.
											All monitored services are running
											smoothly.
										</p>
										<Link to='/admin/incidents/new'>
											<Button>Report New Incident</Button>
										</Link>
									</div>
								) : (
									<div className='space-y-3'>
										{activeIncidents
											.slice(0, 10)
											.map((incident: any) => (
												<div
													key={incident.id}
													className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors'
												>
													<div className='flex-1 min-w-0'>
														<div className='flex items-center gap-3 mb-2'>
															<h4 className='font-medium text-lg'>
																{incident.title}
															</h4>
															{getStatusBadge(
																incident.status,
															)}
															{getSeverityBadge(
																incident.severity,
															)}
														</div>
														<div className='flex items-center gap-3 text-sm text-muted-foreground'>
															<span>
																{getTimeElapsed(
																	incident.created_at,
																)}
															</span>
															{getAffectedServicesCount(
																incident,
															) > 0 && (
																<span>
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
																</span>
															)}
														</div>
														{incident.description && (
															<p className='text-sm text-muted-foreground mt-1 truncate'>
																{incident
																	.description
																	.length >
																100
																	? `${incident.description.substring(0, 100)}...`
																	: incident.description}
															</p>
														)}
													</div>
													<div className='flex items-center gap-2 ml-4'>
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
											))}
									</div>
								)}
							</CardContent>
						</Card>

						<Separator />

						{/* Incident History */}
						<Card className='rounded-none shadow-none border-none'>
							<CardHeader className='flex flex-row items-center justify-between'>
								<div>
									<CardTitle>📋 Incident History</CardTitle>
									<CardDescription>
										Resolved and closed incidents with
										resolution analytics
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent>
								{historyIncidents.length === 0 ? (
									<div className='text-center py-8 text-muted-foreground'>
										<div className='w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto'>
											<span className='text-2xl'>📋</span>
										</div>
										<h3 className='text-xl font-semibold mb-2 text-foreground'>
											No Incident History
										</h3>
										<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
											No resolved or closed incidents
											found. Historical data will appear
											here once incidents are resolved.
										</p>
									</div>
								) : (
									<>
										{/* Filters and Controls - for history only */}
										<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
											<div className='flex flex-1 items-center gap-4'>
												<div className='relative flex-1 max-w-sm'>
													<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
													<Input
														placeholder='Search history...'
														value={
															historySearchTerm
														}
														onChange={(e) =>
															setHistorySearchTerm(
																e.target.value,
															)
														}
														className='pl-10'
													/>
												</div>
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
													value={
														historySeverityFilter
													}
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
													{
														filteredHistoryIncidents.length
													}{' '}
													of {historyIncidents.length}{' '}
													incident(s)
												</div>
											</div>
										</div>

										{/* History List */}
										<div className='space-y-4'>
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
																		(1000 *
																			60),
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
																		) >
																			0 && (
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
												},
											)}
										</div>
									</>
								)}
							</CardContent>
						</Card>
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
		</>
	)
}
