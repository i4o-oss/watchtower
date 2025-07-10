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
		const response = await fetch(
			`${API_BASE_URL}/api/v1/admin/incidents/${id}`,
			{
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			},
		)

		if (!response.ok) {
			throw new Response('Incident not found', { status: 404 })
		}

		const data = await response.json()
		return data
	} catch (error) {
		throw new Response('Error loading incident', { status: 500 })
	}
}

export default function IncidentDetail({
	loaderData,
	params,
}: Route.ComponentProps) {
	const incident = loaderData.incident || loaderData
	const navigate = useNavigate()
	const [isDeleting, setIsDeleting] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [updateNote, setUpdateNote] = useState('')
	const [newStatus, setNewStatus] = useState(incident?.status || 'open')

	// Safety check
	if (!incident) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<h2 className='text-xl font-semibold mb-2'>
						Incident not found
					</h2>
					<p className='text-muted-foreground mb-4'>
						The incident you're looking for doesn't exist.
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
				navigate('/admin/incidents')
			} else {
				console.error('Failed to delete incident')
			}
		} catch (error) {
			console.error('Error deleting incident:', error)
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
				window.location.reload()
			}
		} catch (error) {
			console.error('Error updating incident:', error)
		} finally {
			setIsUpdating(false)
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
		<div>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>{incident.title}</h1>
					<p className='text-muted-foreground'>
						Incident details and management
					</p>
				</div>
				<div className='flex gap-2'>
					<Link to='/admin/incidents'>
						<Button variant='outline'>Back to Incidents</Button>
					</Link>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant='destructive'>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Delete Incident
								</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete this
									incident? This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
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
				{/* Incident Details */}
				<div className='lg:col-span-2 space-y-6'>
					<Card>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<CardTitle>Incident Information</CardTitle>
								<div className='flex gap-2'>
									{getStatusBadge(incident.status)}
									{getSeverityBadge(incident.severity)}
								</div>
							</div>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<h4 className='font-medium mb-2'>Title</h4>
								<p className='text-lg'>{incident.title}</p>
							</div>

							{incident.description && (
								<div>
									<h4 className='font-medium mb-2'>
										Description
									</h4>
									<div className='bg-muted p-3 rounded whitespace-pre-wrap'>
										{incident.description}
									</div>
								</div>
							)}

							<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Status
									</h4>
									<p>{incident.status}</p>
								</div>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Severity
									</h4>
									<p>{incident.severity}</p>
								</div>
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Created
									</h4>
									<p>
										{new Date(
											incident.created_at,
										).toLocaleString()}
									</p>
								</div>
								{incident.end_time && (
									<div>
										<h4 className='font-medium text-sm text-muted-foreground'>
											Resolved
										</h4>
										<p>
											{new Date(
												incident.end_time,
											).toLocaleString()}
										</p>
									</div>
								)}
							</div>

							{incident.created_by && (
								<div>
									<h4 className='font-medium text-sm text-muted-foreground'>
										Created By
									</h4>
									<p>User ID: {incident.created_by}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Status Update */}
					<Card>
						<CardHeader>
							<CardTitle>Update Incident</CardTitle>
							<CardDescription>
								Change status or add update notes
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
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
								<Label htmlFor='note'>
									Update Note (Optional)
								</Label>
								<Textarea
									id='note'
									value={updateNote}
									onChange={(e) =>
										setUpdateNote(e.target.value)
									}
									placeholder='Add a note about this update...'
									rows={3}
								/>
							</div>

							<Button
								onClick={handleStatusUpdate}
								disabled={
									isUpdating ||
									(newStatus === incident.status &&
										!updateNote.trim())
								}
								className='w-full'
							>
								{isUpdating ? 'Updating...' : 'Update Incident'}
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className='space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className='space-y-2'>
							{incident.status !== 'investigating' && (
								<Button
									variant='outline'
									className='w-full'
									onClick={() => {
										setNewStatus('investigating')
										handleStatusUpdate()
									}}
								>
									Mark as Investigating
								</Button>
							)}

							{incident.status !== 'resolved' && (
								<Button
									variant='outline'
									className='w-full'
									onClick={() => {
										setNewStatus('resolved')
										handleStatusUpdate()
									}}
								>
									Mark as Resolved
								</Button>
							)}

							{incident.status === 'resolved' && (
								<Button
									variant='outline'
									className='w-full'
									onClick={() => {
										setNewStatus('open')
										handleStatusUpdate()
									}}
								>
									Reopen Incident
								</Button>
							)}

							<Link to='/admin/incidents' className='block'>
								<Button variant='outline' className='w-full'>
									Back to All Incidents
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Timeline</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-3 text-sm'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>
										Created:
									</span>
									<span>
										{new Date(
											incident.created_at,
										).toLocaleString()}
									</span>
								</div>

								{incident.updated_at &&
									incident.updated_at !==
										incident.created_at && (
										<div className='flex justify-between'>
											<span className='text-muted-foreground'>
												Last Updated:
											</span>
											<span>
												{new Date(
													incident.updated_at,
												).toLocaleString()}
											</span>
										</div>
									)}

								{incident.end_time && (
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>
											Resolved:
										</span>
										<span>
											{new Date(
												incident.end_time,
											).toLocaleString()}
										</span>
									</div>
								)}

								{incident.end_time && incident.created_at && (
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>
											Duration:
										</span>
										<span>
											{Math.round(
												(new Date(
													incident.end_time,
												).getTime() -
													new Date(
														incident.created_at,
													).getTime()) /
													(1000 * 60),
											)}{' '}
											minutes
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
