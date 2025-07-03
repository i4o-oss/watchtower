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
import type { Route } from './+types/endpoints'

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
	const { endpoints: initialEndpoints, total } = loaderData
	const [endpoints, setEndpoints] = useState(initialEndpoints)
	const [searchTerm, setSearchTerm] = useState('')
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [endpointToDelete, setEndpointToDelete] = useState<any>(null)
	const navigate = useNavigate()

	const filteredEndpoints = endpoints.filter(
		(endpoint: any) =>
			endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			endpoint.url.toLowerCase().includes(searchTerm.toLowerCase()),
	)

	const handleDelete = async (endpoint: any) => {
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
				setEndpoints(endpoints.filter((e: any) => e.id !== endpoint.id))
			} else {
				console.error('Failed to delete endpoint')
			}
		} catch (error) {
			console.error('Error deleting endpoint:', error)
		}

		setDeleteDialogOpen(false)
		setEndpointToDelete(null)
	}

	const toggleEndpoint = async (endpoint: any) => {
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
					endpoints.map((e: any) =>
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

	return (
		<div>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>Endpoints</h1>
					<p className='text-muted-foreground'>
						Manage your monitoring endpoints
					</p>
				</div>
				<Link to='/admin/endpoints/new'>
					<Button>Add Endpoint</Button>
				</Link>
			</div>

			{/* Search and Filters */}
			<Card className='mb-6'>
				<CardContent className='pt-6'>
					<div className='flex gap-4'>
						<Input
							placeholder='Search endpoints...'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className='max-w-sm'
						/>
					</div>
				</CardContent>
			</Card>

			{/* Endpoints List */}
			<Card>
				<CardHeader>
					<CardTitle>All Endpoints ({total})</CardTitle>
					<CardDescription>
						Monitor and manage your endpoint configurations
					</CardDescription>
				</CardHeader>
				<CardContent>
					{filteredEndpoints.length === 0 ? (
						<div className='text-center py-12'>
							<h3 className='text-lg font-medium text-muted-foreground mb-2'>
								{searchTerm
									? 'No endpoints found'
									: 'No endpoints yet'}
							</h3>
							<p className='text-muted-foreground mb-4'>
								{searchTerm
									? 'Try adjusting your search terms'
									: 'Get started by creating your first monitoring endpoint'}
							</p>
							{!searchTerm && (
								<Link to='/admin/endpoints/new'>
									<Button>Create First Endpoint</Button>
								</Link>
							)}
						</div>
					) : (
						<div className='space-y-4'>
							{filteredEndpoints.map((endpoint: any) => (
								<div
									key={endpoint.id}
									className='border rounded-lg p-4'
								>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<div className='flex items-center gap-3 mb-2'>
												<h3 className='font-semibold text-lg'>
													{endpoint.name}
												</h3>
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
												<Badge
													variant='outline'
													className='font-mono text-xs'
												>
													{endpoint.method}
												</Badge>
											</div>

											<p className='text-muted-foreground mb-2'>
												{endpoint.description ||
													'No description'}
											</p>

											<p className='font-mono text-sm bg-muted px-2 py-1 rounded mb-3 inline-block'>
												{endpoint.url}
											</p>

											<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
												<div>
													<span className='text-muted-foreground'>
														Expected Status:
													</span>
													<div className='font-medium'>
														{
															endpoint.expected_status_code
														}
													</div>
												</div>
												<div>
													<span className='text-muted-foreground'>
														Timeout:
													</span>
													<div className='font-medium'>
														{
															endpoint.timeout_seconds
														}
														s
													</div>
												</div>
												<div>
													<span className='text-muted-foreground'>
														Interval:
													</span>
													<div className='font-medium'>
														{
															endpoint.check_interval_seconds
														}
														s
													</div>
												</div>
												<div>
													<span className='text-muted-foreground'>
														Created:
													</span>
													<div className='font-medium'>
														{new Date(
															endpoint.created_at,
														).toLocaleDateString()}
													</div>
												</div>
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
															`/admin/endpoints/${endpoint.id}`,
														)
													}
												>
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														navigate(
															`/admin/endpoints/${endpoint.id}/edit`,
														)
													}
												>
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														toggleEndpoint(endpoint)
													}
												>
													{endpoint.enabled
														? 'Disable'
														: 'Enable'}
												</DropdownMenuItem>
												<DropdownMenuItem
													className='text-destructive'
													onClick={() => {
														setEndpointToDelete(
															endpoint,
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
							onClick={() => handleDelete(endpointToDelete)}
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
