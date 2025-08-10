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
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'
import {
	Plus,
	Activity,
	GlobeIcon,
	AlertTriangleIcon,
	CheckCircle2,
} from 'lucide-react'
import { EndpointsTable, type Endpoint } from '~/components/endpoints-table'
import type { Route } from './+types/endpoints'
import { Separator } from '~/components/ui/separator'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Endpoints - Admin - Watchtower' },
		{ name: 'description', content: 'Manage monitoring endpoints' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
			method: 'GET',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.ok) {
			return await response.json()
		}

		return { endpoints: [], total: 0 }
	} catch (error) {
		console.error('Error loading endpoints:', error)
		return { endpoints: [], total: 0 }
	}
}

export default function AdminEndpoints({ loaderData }: Route.ComponentProps) {
	const { endpoints: initialEndpoints, total: initialTotal } = loaderData
	const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints)
	const [total, setTotal] = useState(initialTotal)
	const [isLoading, setIsLoading] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(
		null,
	)
	const navigate = useNavigate()

	// Function to refresh endpoints data from server
	const refreshEndpoints = async () => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints`,
				{
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				const data = await response.json()
				setEndpoints(data.endpoints || [])
				setTotal(data.total || 0)
			}
		} catch (error) {
			console.error('Error refreshing endpoints:', error)
		}
	}

	// Real-time updates via Server-Sent Events
	useSSE({
		endpoint_created: () => {
			try {
				// Re-fetch data to ensure consistency instead of updating local state
				refreshEndpoints()
			} catch (error) {
				console.error('Error handling endpoint_created event:', error)
			}
		},
		endpoint_updated: () => {
			try {
				// Re-fetch data to ensure consistency instead of updating local state
				refreshEndpoints()
			} catch (error) {
				console.error('Error handling endpoint_updated event:', error)
			}
		},
		endpoint_deleted: () => {
			try {
				// Re-fetch data to ensure consistency instead of updating local state
				refreshEndpoints()
			} catch (error) {
				console.error('Error handling endpoint_deleted event:', error)
			}
		},
	})

	const handleDelete = async (endpoint: Endpoint) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${endpoint.id}`,
				{
					method: 'DELETE',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			if (response.ok) {
				setEndpoints(endpoints.filter((e) => e.id !== endpoint.id))
			} else {
				console.error('Failed to delete endpoint')
			}
		} catch (error) {
			console.error('Error deleting endpoint:', error)
		}

		setDeleteDialogOpen(false)
		setEndpointToDelete(null)
	}

	const toggleEndpoint = async (endpoint: Endpoint) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints/${endpoint.id}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled: !endpoint.enabled }),
				},
			)

			if (response.ok) {
				setEndpoints(
					endpoints.map((e) =>
						e.id === endpoint.id
							? { ...e, enabled: !e.enabled }
							: e,
					),
				)
			}
		} catch (error) {
			console.error('Error toggling endpoint:', error)
		}
	}

	const activeEndpoints = endpoints.filter((e) => e.enabled).length
	const inactiveEndpoints = endpoints.length - activeEndpoints
	const recentlyAdded = endpoints
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime(),
		)
		.slice(0, 1)[0]

	// Empty state component
	const EmptyState = () => (
		<div className='text-center py-16'>
			<div className='mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6'>
				<Activity
					className='h-12 w-12 text-muted-foreground'
					strokeWidth={1}
				/>
			</div>
			<h3 className='text-xl font-semibold mb-2'>No endpoints yet</h3>
			<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
				Get started by creating your first monitoring endpoint to track
				your services.
			</p>
			<Link to='/admin/endpoints/new'>
				<Button size='lg' className='gap-2'>
					<Plus className='h-4 w-4' />
					Create Your First Endpoint
				</Button>
			</Link>
		</div>
	)

	return (
		<>
			<main className='flex-1 flex flex-col xl:flex-row gap-6'>
				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
					<PageHeader
						title='Endpoints'
						description='Manage and monitor your service endpoints'
					>
						<Link to='/admin/endpoints/new'>
							<Button size='sm'>
								<Plus className='h-4 w-4' />
								Add Endpoint
							</Button>
						</Link>
					</PageHeader>

					<CardContent className='p-6'>
						{/* Endpoints Table */}
						{endpoints.length === 0 ? (
							<EmptyState />
						) : (
							<EndpointsTable
								data={endpoints}
								isLoading={isLoading}
								onToggleEndpoint={(endpoint) => {
									toggleEndpoint(endpoint)
								}}
								onDeleteEndpoint={(endpoint) => {
									setEndpointToDelete(endpoint)
									setDeleteDialogOpen(true)
								}}
							/>
						)}
					</CardContent>
				</PageContent>

				{/* Quick Stats Sidebar */}
				{/*{endpoints.length > 0 && (
					<aside className='w-88 rounded-xl space-y-4'>
						<Card>
							<CardContent>
								<div className='flex items-center gap-4'>
									<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
										<GlobeIcon className='h-7 w-7' />
									</div>
									<div className='flex flex-col'>
										<p className='text-sm font-normal'>
											Total Endpoints
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
										<CheckCircle2 className='h-7 w-7' />
									</div>
									<div className='flex flex-col'>
										<p className='text-sm font-normal'>
											Active Endpoints
										</p>
										<p className='typography-h4'>
											{activeEndpoints}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent>
								<div className='flex items-center gap-4'>
									<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
										<AlertTriangleIcon className='h-7 w-7' />
									</div>
									<div className='flex flex-col'>
										<p className='text-sm font-normal'>
											Inactive Endpoints
										</p>
										<p className='typography-h4'>
											{inactiveEndpoints}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
						{recentlyAdded && (
							<Card>
								<CardContent>
									<div className='flex flex-col gap-2'>
										<p className='text-sm font-normal text-muted-foreground'>
											Last Added
										</p>
										<p className='font-medium'>
											{recentlyAdded.name}
										</p>
										<Badge
											variant='outline'
											className='w-fit'
										>
											{new Date(
												recentlyAdded.created_at,
											).toLocaleDateString()}
										</Badge>
									</div>
								</CardContent>
							</Card>
						)}
					</aside>
				)}*/}
			</main>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "
							{endpointToDelete?.name}"? This action cannot be
							undone and will also delete all associated
							monitoring logs.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								endpointToDelete &&
								handleDelete(endpointToDelete)
							}
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
