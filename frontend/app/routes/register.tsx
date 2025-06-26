import { useState, useEffect } from 'react'
import {
	Form,
	redirect,
	useNavigation,
	useActionData,
	Link,
} from 'react-router'
import type { Route } from './+types/register'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { useAuth } from '~/lib/auth'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Register - Watchtower' },
		{ name: 'description', content: 'Create your Watchtower account' },
	]
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData()
	const email = formData.get('email') as string
	const password = formData.get('password') as string
	const name = formData.get('name') as string

	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/register`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password, name }),
			},
		)

		const data = await response.json()

		if (response.ok) {
			// Registration successful, redirect to home or dashboard
			return redirect('/')
		} else {
			// Return error to be handled by the component
			return { error: data.message || 'Registration failed' }
		}
	} catch (error) {
		console.error('Registration error:', error)
		return { error: 'Network error occurred' }
	}
}

export default function Register() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const { isAuthenticated, checkAuth } = useAuth()

	const isSubmitting = navigation.state === 'submitting'

	// Refresh auth state after successful registration
	useEffect(() => {
		if (navigation.state === 'idle' && !actionData?.error) {
			checkAuth()
		}
	}, [navigation.state, actionData])

	// If already authenticated, redirect to home
	if (isAuthenticated) {
		window.location.href = '/'
		return null
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-background px-4'>
			<Card className='w-full max-w-md'>
				<CardHeader className='space-y-1'>
					<CardTitle className='text-2xl font-bold text-center'>
						Create Account
					</CardTitle>
					<CardDescription className='text-center'>
						Enter your information to create your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method='post' className='space-y-4'>
						{actionData?.error && (
							<Alert variant='destructive'>
								<AlertDescription>
									{actionData.error}
								</AlertDescription>
							</Alert>
						)}

						<div className='space-y-2'>
							<Label htmlFor='name'>Name (Optional)</Label>
							<Input
								id='name'
								name='name'
								type='text'
								placeholder='Your full name'
								disabled={isSubmitting}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='email'>Email</Label>
							<Input
								id='email'
								name='email'
								type='email'
								placeholder='your@email.com'
								required
								disabled={isSubmitting}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='password'>Password</Label>
							<Input
								id='password'
								name='password'
								type='password'
								placeholder='Enter your password'
								required
								disabled={isSubmitting}
							/>
						</div>

						<Button
							type='submit'
							className='w-full'
							disabled={isSubmitting}
						>
							{isSubmitting
								? 'Creating Account...'
								: 'Create Account'}
						</Button>
					</Form>

					<div className='mt-4 text-center text-sm'>
						Already have an account?{' '}
						<Link
							to='/login'
							className='text-primary hover:underline'
						>
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
