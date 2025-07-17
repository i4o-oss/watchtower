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
import {
	Bell,
	Settings,
	Mail,
	MessageSquare,
	Webhook,
	ArrowRight,
} from 'lucide-react'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/notifications'

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

	// For now, return mock data
	// In production, this would fetch notification channel status
	return {
		channels: {
			email: { enabled: false, configured: false },
			slack: { enabled: false, configured: false },
			discord: { enabled: false, configured: false },
			webhook: { enabled: false, configured: false },
		},
	}
}

export default function AdminNotifications({
	loaderData,
}: Route.ComponentProps) {
	const { channels } = loaderData

	const channelTypes = [
		{
			type: 'email',
			name: 'Email',
			icon: Mail,
			description: 'SMTP email notifications',
			color: 'blue',
		},
		{
			type: 'slack',
			name: 'Slack',
			icon: MessageSquare,
			description: 'Slack webhook integration',
			color: 'green',
		},
		{
			type: 'discord',
			name: 'Discord',
			icon: MessageSquare,
			description: 'Discord webhook integration',
			color: 'purple',
		},
		{
			type: 'webhook',
			name: 'Webhook',
			icon: Webhook,
			description: 'Generic HTTP webhooks',
			color: 'orange',
		},
	]

	const quickActions = [
		{
			title: 'Channel Configuration',
			description: 'Set up and manage notification channels',
			href: '/admin/notifications/channels',
			icon: Settings,
			color: 'blue',
		},
	]

	return (
		<div>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>Notifications</h1>
					<p className='text-muted-foreground'>
						Configure and manage alert notifications
					</p>
				</div>
				<Link to='/admin/notifications/channels'>
					<Button>Configure Channels</Button>
				</Link>
			</div>

			{/* Channel Status */}
			<Card className='mb-8'>
				<CardHeader>
					<CardTitle>Channel Status</CardTitle>
					<CardDescription>
						Overview of configured notification channels
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
						{channelTypes.map((channel) => {
							const status = channels[channel.type]
							const Icon = channel.icon

							return (
								<div
									key={channel.type}
									className='border rounded-lg p-4 hover:bg-accent/50 transition-colors'
								>
									<div className='flex items-center gap-3 mb-2'>
										<Icon className='h-5 w-5' />
										<span className='font-medium'>
											{channel.name}
										</span>
									</div>
									<p className='text-sm text-muted-foreground mb-3'>
										{channel.description}
									</p>
									<div className='flex gap-2'>
										<Badge
											variant={
												status?.configured
													? 'default'
													: 'secondary'
											}
										>
											{status?.configured
												? 'Configured'
												: 'Not Configured'}
										</Badge>
										<Badge
											variant={
												status?.enabled
													? 'default'
													: 'outline'
											}
										>
											{status?.enabled
												? 'Enabled'
												: 'Disabled'}
										</Badge>
									</div>
								</div>
							)
						})}
					</div>
				</CardContent>
			</Card>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>
						Common notification management tasks
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 gap-4'>
						{quickActions.map((action) => {
							const Icon = action.icon

							return (
								<Link
									key={action.href}
									to={action.href}
									className='block'
								>
									<div className='border rounded-lg p-4 hover:bg-accent/50 transition-colors h-full'>
										<div className='flex items-start justify-between mb-2'>
											<Icon className='h-5 w-5 text-muted-foreground' />
											<ArrowRight className='h-4 w-4 text-muted-foreground' />
										</div>
										<h3 className='font-medium mb-1'>
											{action.title}
										</h3>
										<p className='text-sm text-muted-foreground'>
											{action.description}
										</p>
									</div>
								</Link>
							)
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
