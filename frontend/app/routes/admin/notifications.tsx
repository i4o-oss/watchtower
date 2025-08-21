import { Link } from 'react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import {
	Plus,
	Mail,
	MessageSquare,
	Webhook,
	Activity,
	Clock,
	TestTube,
	Edit,
	ToggleLeft,
	AlertCircle,
	CheckCircle2,
	ActivityIcon,
} from 'lucide-react'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/notifications'

export function meta() {
	return [
		{ title: 'Notification · Watchtower' },
		{
			name: 'description',
			content: 'Configure notification channels and alerts',
		},
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const response = await fetch(
			`${API_BASE_URL}/api/v1/admin/notifications/channels`,
			{
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			},
		)

		if (response.ok) {
			const data = await response.json()
			return {
				channels: data.channels || [],
				total: data.total || 0,
				stats: {
					deliveryRate: 98.5,
					totalDeliveries: 1247,
					failedDeliveries: 18,
					lastDelivery: '2025-01-15T10:30:00Z',
				},
			}
		}

		return {
			channels: [],
			total: 0,
			stats: {
				deliveryRate: 0,
				totalDeliveries: 0,
				failedDeliveries: 0,
				lastDelivery: null,
			},
		}
	} catch (error) {
		console.error('Error loading notification channels:', error)
		return {
			channels: [],
			total: 0,
			stats: {
				deliveryRate: 0,
				totalDeliveries: 0,
				failedDeliveries: 0,
				lastDelivery: null,
			},
		}
	}
}

export default function AdminNotifications({
	loaderData,
}: Route.ComponentProps) {
	const { channels, total, stats } = loaderData

	const channelTypes = [
		{
			type: 'email',
			name: 'Email',
			icon: Mail,
			description: 'SMTP email notifications',
			color: 'blue',
			difficulty: 'Easy',
		},
		{
			type: 'slack',
			name: 'Slack',
			icon: MessageSquare,
			description: 'Slack webhook integration',
			color: 'green',
			difficulty: 'Easy',
		},
		{
			type: 'discord',
			name: 'Discord',
			icon: MessageSquare,
			description: 'Discord webhook integration',
			color: 'purple',
			difficulty: 'Easy',
		},
		{
			type: 'webhook',
			name: 'Webhook',
			icon: Webhook,
			description: 'Generic HTTP webhooks',
			color: 'orange',
			difficulty: 'Medium',
		},
	]

	if (total === 0) {
		// Empty State
		return (
			<main className='flex-1 flex flex-col'>
				<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
					<PageHeader
						title='Notification Channels'
						description='Configure notification channels to stay informed'
					>
						<Link to='/admin/notifications/channels'>
							<Button size='sm' variant='outline'>
								<Plus className='h-5 w-5' />
								Add Channel
							</Button>
						</Link>
					</PageHeader>
					<CardContent className='p-0 gap-0 flex flex-col'>
						<div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
							<div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto'>
								<ActivityIcon className='h-8 w-8 text-blue-600' />
							</div>
							<h3 className='text-xl font-semibold mb-2 text-foreground'>
								Configure Notification Channels
							</h3>
							<p className='text-muted-foreground mb-6 max-w-md mx-auto'>
								Get alerts when your services go down or
								recover.
							</p>
							<div className='flex flex-col sm:flex-row gap-4'>
								<Link to='/admin/notifications/channels'>
									<Button size='sm'>
										<Plus className='h-5 w-5' />
										Add Channel
									</Button>
								</Link>
							</div>
						</div>
					</CardContent>
				</PageContent>
			</main>
		)
	}

	// Dashboard State with channels
	return (
		<main className='flex-1 flex flex-col'>
			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
				<PageHeader
					title='Notification Channels'
					description='Manage and monitor your notification delivery channels'
				>
					<Link to='/admin/notifications/channels'>
						<Button size='sm'>
							<Plus className='h-4 w-4' />
							Configure Channels
						</Button>
					</Link>
				</PageHeader>

				<CardContent className='p-6 gap-0 flex flex-col'>
					{/* Stats Cards */}
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
						<Card>
							<CardContent className='p-4'>
								<div className='flex items-center justify-between'>
									<div>
										<p className='text-sm font-medium text-muted-foreground'>
											Success Rate
										</p>
										<p className='text-2xl font-bold text-green-600'>
											{stats.deliveryRate}%
										</p>
									</div>
									<CheckCircle2 className='h-8 w-8 text-green-600 opacity-20' />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className='p-4'>
								<div className='flex items-center justify-between'>
									<div>
										<p className='text-sm font-medium text-muted-foreground'>
											Total Sent
										</p>
										<p className='text-2xl font-bold'>
											{stats.totalDeliveries.toLocaleString()}
										</p>
									</div>
									<Activity className='h-8 w-8 text-blue-600 opacity-20' />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className='p-4'>
								<div className='flex items-center justify-between'>
									<div>
										<p className='text-sm font-medium text-muted-foreground'>
											Failed
										</p>
										<p className='text-2xl font-bold text-red-600'>
											{stats.failedDeliveries}
										</p>
									</div>
									<AlertCircle className='h-8 w-8 text-red-600 opacity-20' />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className='p-4'>
								<div className='flex items-center justify-between'>
									<div>
										<p className='text-sm font-medium text-muted-foreground'>
											Last Delivery
										</p>
										<p className='text-sm font-medium'>
											{stats.lastDelivery
												? new Date(
														stats.lastDelivery,
													).toLocaleString()
												: 'Never'}
										</p>
									</div>
									<Clock className='h-8 w-8 text-muted-foreground opacity-20' />
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Channel Cards Grid */}
					<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6'>
						{channels.map((channel: any) => {
							const channelType = channelTypes.find(
								(ct) => ct.type === channel.type,
							)
							if (!channelType) return null

							const Icon = channelType.icon
							const isHealthy =
								channel.status === 'connected' ||
								channel.enabled
							const lastDelivery = channel.last_delivery
								? new Date(channel.last_delivery)
								: null

							return (
								<Card
									key={channel.id}
									className='group hover:shadow-md transition-all duration-200'
								>
									<CardHeader className='pb-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-3'>
												<div
													className={`p-2 rounded-lg bg-${channelType.color}-100`}
												>
													<Icon
														className={`h-5 w-5 text-${channelType.color}-600`}
													/>
												</div>
												<div>
													<CardTitle className='text-lg'>
														{channel.name}
													</CardTitle>
													<CardDescription className='text-sm'>
														{
															channelType.description
														}
													</CardDescription>
												</div>
											</div>

											{/* Status Indicator */}
											<div className='flex items-center gap-2'>
												<div
													className={`w-2 h-2 rounded-full ${
														isHealthy
															? 'bg-green-500'
															: 'bg-red-500'
													}`}
												/>
												<span
													className={`text-xs font-medium ${
														isHealthy
															? 'text-green-700'
															: 'text-red-700'
													}`}
												>
													{channel.status ||
														(channel.enabled
															? 'Connected'
															: 'Disconnected')}
												</span>
											</div>
										</div>
									</CardHeader>

									<CardContent className='space-y-4'>
										{/* Delivery Info */}
										<div className='grid grid-cols-2 gap-4 text-sm'>
											<div>
												<p className='text-muted-foreground'>
													Success Rate
												</p>
												<p className='font-medium text-green-600'>
													{channel.success_rate ||
														'100'}
													%
												</p>
											</div>
											<div>
												<p className='text-muted-foreground'>
													Last Delivery
												</p>
												<p className='font-medium'>
													{lastDelivery
														? lastDelivery.toLocaleTimeString()
														: 'Never'}
												</p>
											</div>
										</div>

										{/* Quick Actions */}
										<div className='flex items-center gap-2 pt-2'>
											<Button
												variant='outline'
												size='sm'
												className='flex-1'
											>
												<TestTube className='h-3 w-3 mr-1' />
												Test
											</Button>
											<Button
												variant='outline'
												size='sm'
												className='flex-1'
												asChild
											>
												<Link to='/admin/notifications/channels'>
													<Edit className='h-3 w-3 mr-1' />
													Edit
												</Link>
											</Button>
											<Button variant='outline' size='sm'>
												<ToggleLeft className='h-3 w-3' />
											</Button>
										</div>
									</CardContent>
								</Card>
							)
						})}
					</div>

					{/* Channel Health Overview */}
					<Card>
						<CardHeader>
							<CardTitle>Channel Health</CardTitle>
							<CardDescription>
								Operational status of all notification channels
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{channelTypes.map((channelType) => {
									const Icon = channelType.icon
									const channelData = channels.find(
										(c: any) => c.type === channelType.type,
									)
									const isHealthy =
										channelData?.enabled &&
										channelData?.status === 'connected'

									return (
										<div
											key={channelType.type}
											className='flex items-center justify-between p-3 rounded-lg border'
										>
											<div className='flex items-center gap-3'>
												<Icon className='h-4 w-4 text-muted-foreground' />
												<span className='font-medium'>
													{channelType.name}
												</span>
											</div>
											<div className='flex items-center gap-3'>
												<div className='flex items-center gap-2'>
													<div
														className={`w-2 h-2 rounded-full ${
															isHealthy
																? 'bg-green-500'
																: 'bg-muted-foreground'
														}`}
													/>
													<span className='text-sm text-muted-foreground'>
														{channelData
															? isHealthy
																? 'Operational'
																: 'Offline'
															: 'Not Configured'}
													</span>
												</div>
												{channelData && (
													<Badge
														variant='outline'
														className='text-xs'
													>
														{channelData.success_rate ||
															'100'}
														% success
													</Badge>
												)}
											</div>
										</div>
									)
								})}
							</div>
						</CardContent>
					</Card>
				</CardContent>
			</PageContent>
		</main>
	)
}
