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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { Search, Activity } from 'lucide-react'
import { UptimeSparkline } from '~/components/uptime-sparkline'

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
	status?: 'operational' | 'degraded' | 'outage' | 'unknown'
	recent_checks?: {
		timestamp: string
		success: boolean
		response_time_ms?: number
	}[]
}

interface EndpointCardsProps {
	data: Endpoint[]
	isLoading?: boolean
}

export function EndpointCards({ data, isLoading = false }: EndpointCardsProps) {
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
			<div className='bg-muted rounded-md h-4 w-3/4' />
			<div className='bg-muted rounded-md h-3 w-1/2' />
			<div className='bg-muted rounded-md h-16 w-full' />
			<div className='flex justify-between'>
				<div className='bg-muted rounded-md h-3 w-16' />
				<div className='bg-muted rounded-md h-3 w-16' />
			</div>
		</div>
	)

	return (
		<div className='divide-y divide-border'>
			{/* Filters and Controls */}
			<div className='flex flex-col p-4 gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='relative flex-1 max-w-sm'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search endpoints...'
						value={globalFilter}
						onChange={(event) =>
							setGlobalFilter(event.target.value)
						}
						className='pl-10 rounded'
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className='w-36 rounded'>
						<SelectValue placeholder='All Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Status</SelectItem>
						<SelectItem value='active'>Active</SelectItem>
						<SelectItem value='disabled'>Disabled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Endpoint Cards Grid */}
			<div className='grid grid-cols-1'>
				{isLoading ? (
					// Loading state
					Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<Card key={i}>
							<LoadingShimmer />
						</Card>
					))
				) : filteredEndpoints.length === 0 ? (
					<EmptyState />
				) : (
					filteredEndpoints.map((endpoint) => {
						const getStatusColor = (endpoint: Endpoint) => {
							// If disabled, always show gray
							if (!endpoint.enabled) {
								return {
									bg: 'bg-gray-50 dark:bg-gray-950/20',
									border: 'border-gray-200 dark:border-gray-800',
									sparklineColor: '#9ca3af',
								}
							}

							// Check actual status if available
							switch (endpoint.status) {
								case 'operational':
									return {
										bg: 'bg-green-50 dark:bg-green-950/20',
										border: 'border-green-200 dark:border-green-800',
										sparklineColor: '#10b981',
									}
								case 'degraded':
									return {
										bg: 'bg-yellow-50 dark:bg-yellow-950/20',
										border: 'border-yellow-200 dark:border-yellow-800',
										sparklineColor: '#f59e0b',
									}
								case 'outage':
									return {
										bg: 'bg-red-50 dark:bg-red-950/20',
										border: 'border-red-200 dark:border-red-800',
										sparklineColor: '#ef4444',
									}
								default:
									// Default to green if enabled but status unknown
									return {
										bg: 'bg-green-50 dark:bg-green-950/20',
										border: 'border-green-200 dark:border-green-800',
										sparklineColor: '#10b981',
									}
							}
						}
						const colors = getStatusColor(endpoint)

						return (
							<Card
								key={endpoint.id}
								className={cn(
									'p-0 rounded-none',
									'cursor-pointer transition-all duration-200',
									colors.bg,
									colors.border,
								)}
								onClick={() => handleCardClick(endpoint)}
							>
								<CardContent className='p-4'>
									{/* Minimal Header */}
									<div className='flex items-center justify-between mb-2'>
										<h3 className='font-semibold text-foreground text-base truncate'>
											{endpoint.name}
										</h3>
										<Badge
											variant={
												endpoint.enabled
													? 'default'
													: 'secondary'
											}
											className='text-xs rounded'
										>
											{endpoint.enabled
												? 'Active'
												: 'Inactive'}
										</Badge>
									</div>

									{/* URL with ellipsis and tooltip */}
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className='text-xs text-muted-foreground truncate mb-4 font-mono'>
													{endpoint.url}
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p className='font-mono text-xs'>
													{endpoint.url}
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>

									{/* Uptime Graph */}
									<div className='h-16'>
										<UptimeSparkline
											data={endpoint.recent_checks?.map(
												(check) => ({
													value: check.success
														? 100
														: 0,
												}),
											)}
											color={colors.sparklineColor}
										/>
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
