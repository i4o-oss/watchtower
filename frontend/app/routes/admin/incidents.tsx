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

	const filteredIncidents = incidents.filter((incident: any) => {
		const matchesSearch =
			incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			incident.description
				.toLowerCase()
				.includes(searchTerm.toLowerCase())
		const matchesStatus =
			statusFilter === 'all' || incident.status === statusFilter
		const matchesSeverity =
			severityFilter === 'all' || incident.severity === severityFilter

		return matchesSearch && matchesStatus && matchesSeverity
	})

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

			if (response.ok) {
				setIncidents(incidents.filter((i: any) => i.id !== incident.id))
			} else {
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

			if (response.ok) {
				setIncidents(
					incidents.map((i: any) =>
						i.id === incident.id ? { ...i, status: newStatus } : i,
					),
				)
			}
		} catch (error) {
			console.error('Error updating incident status:', error)
		}
	}

	const getSeverityBadge = (severity: string) => {
		const variants = {
			high: 'destructive',
			medium: 'default',
			low: 'secondary',
		} as const

		return (
			<Badge
				variant={
					variants[severity as keyof typeof variants] || 'secondary'
				}
			>
				{severity}
			</Badge>
		)
	}

	const getStatusBadge = (status: string) => {
		const variants = {
			open: 'destructive',
			investigating: 'default',
			resolved: 'secondary',
			closed: 'secondary',
		} as const

		return (
			<Badge
				variant={
					variants[status as keyof typeof variants] || 'secondary'
				}
			>
				{status}
			</Badge>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<div className='container mx-auto px-4 py-8'>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold'>Incidents</h1>
						<p className='text-muted-foreground'>
							Track and manage system incidents
						</p>
					</div>
					<div className='flex gap-2'>
						<Link to='/admin'>
							<Button variant='outline'>Back to Admin</Button>
						</Link>
						<Link to='/admin/incidents/new'>
							<Button>Create Incident</Button>
						</Link>
					</div>
				</div>

				{/* Search and Filters */}
				<Card className='mb-6'>
					<CardContent className='pt-6'>
						<div className='grid gap-4 md:grid-cols-4'>
							<Input
								placeholder='Search incidents...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>

							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder='All statuses' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Statuses
									</SelectItem>
									<SelectItem value='open'>Open</SelectItem>
									<SelectItem value='investigating'>
										Investigating
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
								value={severityFilter}
								onValueChange={setSeverityFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder='All severities' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Severities
									</SelectItem>
									<SelectItem value='high'>High</SelectItem>
									<SelectItem value='medium'>
										Medium
									</SelectItem>
									<SelectItem value='low'>Low</SelectItem>
								</SelectContent>
							</Select>

							<div className='text-sm text-muted-foreground flex items-center'>
								Showing {filteredIncidents.length} of {total}{' '}
								incidents
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Incidents List */}
				<Card>
					<CardHeader>
						<CardTitle>All Incidents</CardTitle>
						<CardDescription>
							System incidents and their current status
						</CardDescription>
					</CardHeader>
					<CardContent>
						{filteredIncidents.length === 0 ? (
							<div className='text-center py-12'>
								<h3 className='text-lg font-medium text-muted-foreground mb-2'>
									{searchTerm ||
									statusFilter !== 'all' ||
									severityFilter !== 'all'
										? 'No incidents found'
										: 'No incidents yet'}
								</h3>
								<p className='text-muted-foreground mb-4'>
									{searchTerm ||
									statusFilter !== 'all' ||
									severityFilter !== 'all'
										? 'Try adjusting your search terms or filters'
										: 'All systems are operational'}
								</p>
								{!searchTerm &&
									statusFilter === 'all' &&
									severityFilter === 'all' && (
										<Link to='/admin/incidents/new'>
											<Button>
												Create First Incident
											</Button>
										</Link>
									)}
							</div>
						) : (
							<div className='space-y-4'>
								{filteredIncidents.map((incident: any) => (
									<div
										key={incident.id}
										className='border rounded-lg p-4'
									>
										<div className='flex items-start justify-between'>
											<div className='flex-1'>
												<div className='flex items-center gap-3 mb-2'>
													<h3 className='font-semibold text-lg'>
														{incident.title}
													</h3>
													{getStatusBadge(
														incident.status,
													)}
													{getSeverityBadge(
														incident.severity,
													)}
												</div>

												<p className='text-muted-foreground mb-3'>
													{incident.description ||
														'No description provided'}
												</p>

												<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
													<div>
														<span className='text-muted-foreground'>
															Created:
														</span>
														<div className='font-medium'>
															{new Date(
																incident.created_at,
															).toLocaleDateString()}
														</div>
													</div>
													<div>
														<span className='text-muted-foreground'>
															Status:
														</span>
														<div className='font-medium'>
															{incident.status}
														</div>
													</div>
													<div>
														<span className='text-muted-foreground'>
															Severity:
														</span>
														<div className='font-medium'>
															{incident.severity}
														</div>
													</div>
													{incident.end_time && (
														<div>
															<span className='text-muted-foreground'>
																Resolved:
															</span>
															<div className='font-medium'>
																{new Date(
																	incident.end_time,
																).toLocaleDateString()}
															</div>
														</div>
													)}
												</div>
											</div>

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant='ghost'
														size='sm'
													>
														⋮
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end'>
													<DropdownMenuItem
														onClick={() =>
															navigate(
																`/admin/incidents/${incident.id}`,
															)
														}
													>
														View Details
													</DropdownMenuItem>
													{incident.status !==
														'resolved' && (
														<>
															<DropdownMenuItem
																onClick={() =>
																	updateIncidentStatus(
																		incident,
																		'investigating',
																	)
																}
															>
																Mark as
																Investigating
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	updateIncidentStatus(
																		incident,
																		'resolved',
																	)
																}
															>
																Mark as Resolved
															</DropdownMenuItem>
														</>
													)}
													{incident.status ===
														'resolved' && (
														<DropdownMenuItem
															onClick={() =>
																updateIncidentStatus(
																	incident,
																	'open',
																)
															}
														>
															Reopen Incident
														</DropdownMenuItem>
													)}
													<DropdownMenuItem
														className='text-destructive'
														onClick={() => {
															setIncidentToDelete(
																incident,
															)
															setDeleteDialogOpen(
																true,
															)
														}}
													>
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

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
								{incidentToDelete?.title}"? This action cannot
								be undone.
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
		</div>
	)
}
