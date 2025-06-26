import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { useAuth } from '~/lib/auth'
import type { Route } from './+types/dashboard'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Dashboard - Watchtower' },
		{ name: 'description', content: 'Your Watchtower dashboard' },
	]
}

export async function clientLoader() {
	// Check if user is authenticated
	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/me`,
			{
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		)

		if (!response.ok) {
			// Not authenticated, redirect to login
			throw new Response('Unauthorized', { status: 401 })
		}

		const user = await response.json()
		return { user }
	} catch (error) {
		throw new Response('Unauthorized', { status: 401 })
	}
}

export default function Dashboard() {
	const { user, logout } = useAuth()

	const handleLogout = async () => {
		await logout()
		window.location.href = '/login'
	}

	return (
		<div className='min-h-screen bg-background'>
			<div className='container mx-auto px-4 py-8'>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold'>Dashboard</h1>
						<p className='text-muted-foreground'>
							Welcome back{user?.name ? `, ${user.name}` : ''}!
						</p>
					</div>
					<Button onClick={handleLogout} variant='outline'>
						Sign Out
					</Button>
				</div>

				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
					<Card>
						<CardHeader>
							<CardTitle>Profile Information</CardTitle>
							<CardDescription>
								Your account details
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<div>
								<span className='font-medium'>Email:</span>{' '}
								<span className='text-muted-foreground'>
									{user?.email}
								</span>
							</div>
							{user?.name && (
								<div>
									<span className='font-medium'>Name:</span>{' '}
									<span className='text-muted-foreground'>
										{user.name}
									</span>
								</div>
							)}
							<div>
								<span className='font-medium'>User ID:</span>{' '}
								<span className='text-muted-foreground'>
									{user?.id}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Quick Stats</CardTitle>
							<CardDescription>
								Overview of your activity
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='text-muted-foreground'>
								This is a protected route that requires
								authentication. You can expand this with your
								app-specific content.
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Recent Activity</CardTitle>
							<CardDescription>
								Your latest actions
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='text-muted-foreground'>
								No recent activity to display. This section can
								be customized based on your app's needs.
							</p>
						</CardContent>
					</Card>
				</div>

				<div className='mt-8'>
					<Card>
						<CardHeader>
							<CardTitle>Getting Started</CardTitle>
							<CardDescription>
								Welcome to your protected dashboard
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<p className='text-muted-foreground'>
								This is a simple protected route that
								demonstrates authentication in your React Router
								v7 app. You can customize this page with your
								own content and functionality.
							</p>
							<div className='flex gap-2'>
								<Button size='sm'>Action 1</Button>
								<Button size='sm' variant='outline'>
									Action 2
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
