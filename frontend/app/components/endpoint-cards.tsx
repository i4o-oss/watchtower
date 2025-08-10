import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { cn } from '~/lib/utils'
import {
	Search,
	CheckCircle2,
	XCircle,
	Edit,
	Trash2,
	Play,
	Pause,
	Activity,
} from 'lucide-react'

export interface Endpoint {
	id: string
	name: string
	url: string
	method: string
	enabled: boolean
	expected_status_code: number
	timeout_seconds: number
	check_interval_seconds: number
	created_at: string
	updated_at: string
	description?: string
}

interface EndpointCardsProps {
	data: Endpoint[]
	isLoading?: boolean
	onToggleEndpoint: (endpoint: Endpoint) => void
	onDeleteEndpoint: (endpoint: Endpoint) => void
}

export function EndpointCards({
	data,
	isLoading = false,
	onToggleEndpoint,
	onDeleteEndpoint,
}: EndpointCardsProps) {
	const navigate = useNavigate()
	const [globalFilter, setGlobalFilter] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')

	// Filter endpoints based on search and status
	const filteredEndpoints = data.filter((endpoint) => {
		const matchesSearch = globalFilter
			? endpoint.name
					.toLowerCase()
					.includes(globalFilter.toLowerCase()) ||
				endpoint.url
					.toLowerCase()
					.includes(globalFilter.toLowerCase()) ||
				endpoint.description
					?.toLowerCase()
					.includes(globalFilter.toLowerCase())
			: true

		const matchesStatus =
			statusFilter === 'all' ||
			(statusFilter === 'active' && endpoint.enabled) ||
			(statusFilter === 'disabled' && !endpoint.enabled)

		return matchesSearch && matchesStatus
	})

	const handleCardClick = (endpoint: Endpoint) => {
		navigate(`/admin/endpoints/${endpoint.id}`)
	}

	const handleActionClick = (e: React.MouseEvent, action: () => void) => {
		e.stopPropagation() // Prevent card click when clicking action buttons
		action()
	}

	// Empty state component
	const EmptyState = () => (
		<div className='text-center py-16 col-span-full'>
			<div className='mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6'>
				<Activity
					className='h-12 w-12 text-muted-foreground'
					strokeWidth={1}
				/>
			</div>
			<h3 className='text-xl font-semibold mb-2'>No endpoints found</h3>
			<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
				{globalFilter || statusFilter !== 'all'
					? 'Try adjusting your search terms or filters'
					: 'Get started by creating your first monitoring endpoint to track your services.'}
			</p>
		</div>
	)

	// Loading shimmer component
	const LoadingShimmer = () => (
		<div className='animate-pulse space-y-4 p-6'>
			<div className='bg-muted rounded-md h-4 w-3/4'></div>
			<div className='bg-muted rounded-md h-3 w-1/2'></div>
			<div className='bg-muted rounded-md h-16 w-full'></div>
			<div className='flex justify-between'>
				<div className='bg-muted rounded-md h-3 w-16'></div>
				<div className='bg-muted rounded-md h-3 w-16'></div>
			</div>
		</div>
	)

	return (
		<div className='space-y-6'>
			{/* Filters and Controls */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex flex-1 items-center gap-4'>
					<div className='relative flex-1 max-w-sm'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder='Search endpoints...'
							value={globalFilter}
							onChange={(event) =>
								setGlobalFilter(event.target.value)
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
							<SelectItem value='all'>All Status</SelectItem>
							<SelectItem value='active'>Active</SelectItem>
							<SelectItem value='disabled'>Disabled</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='text-sm text-muted-foreground'>
					{filteredEndpoints.length} of {data.length} endpoint(s)
				</div>
			</div>

			{/* Endpoint Cards Grid */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{isLoading ? (
					// Loading state
					Array.from({ length: 6 }).map((_, i) => (
						<Card key={i}>
							<LoadingShimmer />
						</Card>
					))
				) : filteredEndpoints.length === 0 ? (
					<EmptyState />
				) : (
					filteredEndpoints.map((endpoint) => {
						const getStatusColor = (enabled: boolean) => {
							return enabled
								? {
										bg: 'bg-green-50',
										border: 'border-green-200',
										dot: 'bg-green-500',
									}
								: {
										bg: 'bg-red-50',
										border: 'border-red-200',
										dot: 'bg-red-500',
									}
						}
						const colors = getStatusColor(endpoint.enabled)

						return (
							<Card
								key={endpoint.id}
								className={cn(
									'cursor-pointer transition-all duration-200 hover:shadow-md',
									colors.bg,
									colors.border,
								)}
								onClick={() => handleCardClick(endpoint)}
							>
								<CardContent className='p-6'>
									{/* Endpoint Header */}
									<div className='flex items-start justify-between mb-4'>
										<div className='flex items-center space-x-3 flex-1 min-w-0'>
											<div
												className={cn(
													'w-3 h-3 rounded-full flex-shrink-0',
													colors.dot,
												)}
											/>
											<div className='min-w-0 flex-1'>
												<h3 className='font-semibold text-foreground text-base truncate'>
													{endpoint.name}
												</h3>
												<p className='text-sm text-muted-foreground capitalize'>
													{endpoint.enabled
														? 'Active'
														: 'Disabled'}
												</p>
											</div>
										</div>
										<div className='flex items-center gap-1 flex-shrink-0'>
											<Button
												variant='ghost'
												size='sm'
												className='h-8 w-8 p-0'
												onClick={(e) =>
													handleActionClick(e, () =>
														navigate(
															`/admin/endpoints/${endpoint.id}/edit`,
														),
													)
												}
											>
												<Edit className='h-4 w-4' />
											</Button>
											<Button
												variant='ghost'
												size='sm'
												className='h-8 w-8 p-0'
												onClick={(e) =>
													handleActionClick(e, () =>
														onToggleEndpoint(
															endpoint,
														),
													)
												}
											>
												{endpoint.enabled ? (
													<Pause className='h-4 w-4' />
												) : (
													<Play className='h-4 w-4' />
												)}
											</Button>
											<Button
												variant='ghost'
												size='sm'
												className='h-8 w-8 p-0 text-destructive hover:text-destructive'
												onClick={(e) =>
													handleActionClick(e, () =>
														onDeleteEndpoint(
															endpoint,
														),
													)
												}
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</div>

									{/* URL and Method */}
									<div className='space-y-2 mb-4'>
										<div className='font-mono text-sm bg-muted/50 px-2 py-1 rounded truncate'>
											{endpoint.url}
										</div>
										<div className='flex items-center justify-between'>
											<Badge
												variant='outline'
												className='font-mono text-xs font-semibold'
											>
												{endpoint.method}
											</Badge>
											<Badge
												variant={
													endpoint.enabled
														? 'default'
														: 'secondary'
												}
												className='gap-1.5'
											>
												{endpoint.enabled ? (
													<CheckCircle2 className='h-3 w-3' />
												) : (
													<XCircle className='h-3 w-3' />
												)}
												{endpoint.enabled
													? 'Active'
													: 'Disabled'}
											</Badge>
										</div>
									</div>

									{/* Description */}
									{endpoint.description && (
										<div className='mb-4'>
											<p className='text-sm text-muted-foreground line-clamp-2'>
												{endpoint.description}
											</p>
										</div>
									)}

									{/* Metrics */}
									<div className='flex justify-between items-center text-sm text-muted-foreground'>
										<div className='flex items-center space-x-1'>
											<span>
												Status:{' '}
												{endpoint.expected_status_code}
											</span>
										</div>
										<div className='text-xs'>
											{endpoint.timeout_seconds}s timeout
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})
				)}
			</div>
		</div>
	)
}
