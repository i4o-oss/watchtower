import { Link } from 'react-router'
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
							<CardTitle>Admin Access</CardTitle>
							<CardDescription>
								System administration
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3'>
							<p className='text-muted-foreground text-sm'>
								Manage endpoints, incidents, and monitoring logs
							</p>
							<Link to='/admin'>
								<Button className='w-full'>
									Go to Admin Dashboard
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>Common tasks</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<Link to='/admin/endpoints/new' className='block'>
								<Button
									variant='outline'
									size='sm'
									className='w-full'
								>
									Add Endpoint
								</Button>
							</Link>
							<Link to='/admin/monitoring' className='block'>
								<Button
									variant='outline'
									size='sm'
									className='w-full'
								>
									View Logs
								</Button>
							</Link>
							<Link to='/admin/incidents' className='block'>
								<Button
									variant='outline'
									size='sm'
									className='w-full'
								>
									View Incidents
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>

				<div className='mt-8'>
					<Card>
						<CardHeader>
							<CardTitle>Watchtower Monitoring</CardTitle>
							<CardDescription>
								Monitor your endpoints and track incidents
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<p className='text-muted-foreground'>
								Watchtower helps you monitor your web endpoints,
								track response times, and manage incidents. Use
								the admin dashboard to configure your monitoring
								endpoints and view detailed analytics.
							</p>
							<div className='flex flex-wrap gap-2'>
								<Link to='/admin'>
									<Button>Admin Dashboard</Button>
								</Link>
								<Link to='/admin/endpoints'>
									<Button variant='outline'>
										Manage Endpoints
									</Button>
								</Link>
								<Link to='/admin/monitoring'>
									<Button variant='outline'>
										View Monitoring
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
