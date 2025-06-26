import { useState, useEffect } from 'react'
import { Form, redirect, useNavigation, useActionData } from 'react-router'
import type { Route } from './+types/login'
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
		{ title: 'Login - Watchtower' },
		{ name: 'description', content: 'Sign in to your Watchtower account' },
	]
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData()
	const email = formData.get('email') as string
	const password = formData.get('password') as string

	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/login`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			},
		)

		const data = await response.json()

		if (response.ok) {
			// Login successful, redirect to home or dashboard
			return redirect('/')
		} else {
			// Return error to be handled by the component
			return { error: data.message || 'Login failed' }
		}
	} catch (error) {
		console.error('Login error:', error)
		return { error: 'Network error occurred' }
	}
}

export default function Login() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const { isAuthenticated, checkAuth } = useAuth()

	const isSubmitting = navigation.state === 'submitting'

	// Refresh auth state after successful login
	useEffect(() => {
		if (navigation.state === 'idle' && !actionData?.error) {
			checkAuth()
		}
	}, [navigation.state, actionData, checkAuth])

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
						Welcome Back
					</CardTitle>
					<CardDescription className='text-center'>
						Enter your credentials to sign in to your account
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
							{isSubmitting ? 'Signing In...' : 'Sign In'}
						</Button>
					</Form>

					<div className='mt-4 text-center text-sm'>
						Don't have an account?{' '}
						<a
							href='/register'
							className='text-primary hover:underline'
						>
							Create one
						</a>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
