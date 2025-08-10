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
	Settings,
	Mail,
	MessageSquare,
	Webhook,
	Activity,
	Clock,
	TestTube,
	Edit,
	ToggleLeft,
	TrendingUp,
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	Bell,
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/notifications'
import { Separator } from '~/components/ui/separator'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Notifications - Admin - Watchtower' },
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
			difficulty: 'Medium',
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
			difficulty: 'Hard',
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
					/>
					<CardContent className='p-6'>
						<div className='min-h-[60vh] flex flex-col items-center justify-center space-y-8 px-4'>
							<div className='text-center space-y-4 max-w-md'>
								<div className='mx-auto w-16 h-16 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full flex items-center justify-center'>
									<Activity className='h-8 w-8 text-blue-600' />
								</div>
								<h1 className='text-2xl font-bold text-foreground'>
									Configure notification channels to stay
									informed
								</h1>
								<p className='text-muted-foreground leading-relaxed'>
									Get instant alerts when your services go
									down or recover. Choose from multiple
									notification channels.
								</p>
							</div>

							{/* Channel Type Grid */}
							<div className='w-full max-w-4xl'>
								<h2 className='text-lg font-semibold text-center mb-6'>
									Available Channel Types
								</h2>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
									{channelTypes.map((channel) => {
										const Icon = channel.icon
										const difficultyColors = {
											Easy: 'bg-green-100 text-green-800 border-green-200',
											Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
											Hard: 'bg-red-100 text-red-800 border-red-200',
										}

										return (
											<Card
												key={channel.type}
												className='relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-0 shadow-md'
											>
												<CardHeader>
													<div className='flex items-center gap-3 mb-2'>
														<div
															className={`p-2 rounded-lg bg-${channel.color}-100`}
														>
															<Icon
																className={`h-5 w-5 text-${channel.color}-600`}
															/>
														</div>
														<CardTitle className='text-lg'>
															{channel.name}
														</CardTitle>
													</div>
													<CardDescription className='text-sm leading-relaxed'>
														{channel.description}
													</CardDescription>
												</CardHeader>
												<CardContent className='pt-0'>
													<Badge
														variant='outline'
														className={`text-xs font-medium px-2 py-1 ${difficultyColors[channel.difficulty as keyof typeof difficultyColors]}`}
													>
														{channel.difficulty}{' '}
														Setup
													</Badge>
												</CardContent>
											</Card>
										)
									})}
								</div>
							</div>

							{/* Primary CTA */}
							<div className='flex flex-col sm:flex-row gap-4'>
								<Link to='/admin/notifications/channels'>
									<Button
										size='lg'
										className='px-6 py-2 text-base font-medium'
									>
										<Plus className='h-5 w-5' />
										Add Your First Channel
									</Button>
								</Link>
								<Button variant='outline' size='lg' asChild>
									<a
										href='https://docs.example.com/notifications'
										target='_blank'
										rel='noopener noreferrer'
									>
										View Documentation
									</a>
								</Button>
							</div>
						</div>
					</CardContent>
				</PageContent>
			</main>
		)
	}

	// Dashboard State with channels
	return (
		<main className='flex-1 flex flex-col xl:flex-row gap-6'>
			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden'>
				<PageHeader
					title='Notification Channels'
					description='Manage and monitor your notification delivery channels'
				>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size='sm'>
								<Plus className='h-4 w-4' />
								Add Channel
								<ChevronDown className='h-4 w-4 ml-2' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end' className='w-48'>
							{channelTypes.map((channel) => {
								const Icon = channel.icon
								return (
									<DropdownMenuItem
										key={channel.type}
										asChild
									>
										<Link to='/admin/notifications/channels'>
											<Icon className='h-4 w-4' />
											{channel.name}
										</Link>
									</DropdownMenuItem>
								)
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</PageHeader>

				<CardContent className='p-6 gap-0 flex flex-col'>
					{/* Delivery Statistics */}
					<Card className='rounded-none shadow-none border-none'>
						<CardHeader className='bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20'>
							<div className='flex items-center justify-between'>
								<div>
									<CardTitle className='text-lg'>
										Delivery Statistics
									</CardTitle>
									<CardDescription>
										Overall notification delivery
										performance
									</CardDescription>
								</div>
								<TrendingUp className='h-5 w-5 text-green-600' />
							</div>
						</CardHeader>
						<CardContent className='pt-6'>
							<div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
								<div className='space-y-2'>
									<div className='flex items-center gap-2'>
										<CheckCircle2 className='h-4 w-4 text-green-600' />
										<span className='text-sm font-medium text-muted-foreground'>
											Success Rate
										</span>
									</div>
									<p className='text-2xl font-bold text-green-600'>
										{stats.deliveryRate}%
									</p>
								</div>

								<div className='space-y-2'>
									<div className='flex items-center gap-2'>
										<Activity className='h-4 w-4 text-blue-600' />
										<span className='text-sm font-medium text-muted-foreground'>
											Total Sent
										</span>
									</div>
									<p className='text-2xl font-bold'>
										{stats.totalDeliveries.toLocaleString()}
									</p>
								</div>

								<div className='space-y-2'>
									<div className='flex items-center gap-2'>
										<AlertCircle className='h-4 w-4 text-red-600' />
										<span className='text-sm font-medium text-muted-foreground'>
											Failed
										</span>
									</div>
									<p className='text-2xl font-bold text-red-600'>
										{stats.failedDeliveries}
									</p>
								</div>

								<div className='space-y-2'>
									<div className='flex items-center gap-2'>
										<Clock className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm font-medium text-muted-foreground'>
											Last Delivery
										</span>
									</div>
									<p className='text-sm font-medium'>
										{stats.lastDelivery
											? new Date(
													stats.lastDelivery,
												).toLocaleString()
											: 'Never'}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Separator className='my-6' />

					{/* Channel Cards Grid */}
					<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
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

					<Separator className='my-6' />

					{/* Channel Health Overview */}
					<Card className='rounded-none shadow-none border-none'>
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

			{/* Quick Stats Sidebar */}
			<aside className='w-88 rounded-xl space-y-4'>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<Bell className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									Total Channels
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
									Delivery Rate
								</p>
								<p className='typography-h4'>
									{stats.deliveryRate}%
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className='flex items-center gap-4'>
							<div className='w-14 h-14 flex justify-center items-center p-2 bg-accent rounded-lg'>
								<Activity className='h-7 w-7' />
							</div>
							<div className='flex flex-col'>
								<p className='text-sm font-normal'>
									Total Sent
								</p>
								<p className='typography-h4'>
									{stats.totalDeliveries.toLocaleString()}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className='flex flex-col gap-2'>
							<p className='text-sm font-normal text-muted-foreground'>
								Last Delivery
							</p>
							<Badge variant='outline' className='w-fit'>
								{stats.lastDelivery
									? new Date(
											stats.lastDelivery,
										).toLocaleString()
									: 'Never'}
							</Badge>
							{stats.failedDeliveries > 0 && (
								<p className='text-xs text-destructive'>
									{stats.failedDeliveries} failed
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</aside>
		</main>
	)
}
