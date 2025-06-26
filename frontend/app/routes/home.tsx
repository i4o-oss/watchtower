import type { Route } from './+types/home'
import { Welcome } from '../welcome/welcome'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { useAuth } from '~/lib/auth'

// biome-ignore lint: lint/correctness/noEmptyPattern
export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Watchtower' },
		{ name: 'description', content: 'Welcome to Watchtower!' },
	]
}

export default function Home() {
	const { user, isAuthenticated, isLoading, logout } = useAuth()

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
					<p className='mt-2 text-muted-foreground'>Loading...</p>
				</div>
			</div>
		)
	}

	if (isAuthenticated && user) {
		return (
			<div className='min-h-screen bg-background'>
				<div className='container mx-auto px-4 py-8'>
					<div className='flex justify-between items-center mb-8'>
						<div>
							<h1 className='text-4xl font-bold'>
								Welcome back{user.name ? `, ${user.name}` : ''}!
							</h1>
							<p className='text-muted-foreground mt-2'>
								You're successfully signed in to Watchtower.
							</p>
						</div>
						<div className='flex gap-2'>
							<Button asChild>
								<a href='/dashboard'>Go to Dashboard</a>
							</Button>
							<Button
								variant='outline'
								onClick={async () => {
									await logout()
									window.location.reload()
								}}
							>
								Sign Out
							</Button>
						</div>
					</div>

					<div className='grid gap-6 md:grid-cols-2'>
						<Card>
							<CardHeader>
								<CardTitle>Dashboard</CardTitle>
								<CardDescription>
									Access your main dashboard
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className='text-muted-foreground mb-4'>
									View your account information and manage
									your settings.
								</p>
								<Button asChild>
									<a href='/dashboard'>Open Dashboard</a>
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Profile</CardTitle>
								<CardDescription>
									Your account information
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-2'>
								<div>
									<span className='font-medium'>Email:</span>{' '}
									<span className='text-muted-foreground'>
										{user.email}
									</span>
								</div>
								{user.name && (
									<div>
										<span className='font-medium'>
											Name:
										</span>{' '}
										<span className='text-muted-foreground'>
											{user.name}
										</span>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<Welcome />
			<div className='container mx-auto px-4 py-8'>
				<Card className='max-w-md mx-auto'>
					<CardHeader className='text-center'>
						<CardTitle>Get Started</CardTitle>
						<CardDescription>
							Sign in to your account or create a new one
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<Button asChild className='w-full'>
							<a href='/login'>Sign In</a>
						</Button>
						<Button asChild variant='outline' className='w-full'>
							<a href='/register'>Create Account</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
