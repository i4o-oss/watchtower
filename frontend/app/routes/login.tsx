import { useState, useEffect } from 'react'
import {
	Form,
	redirect,
	useNavigation,
	useActionData,
	useLoaderData,
	Link,
	useNavigate,
} from 'react-router'
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
import { requireGuest, useAuth } from '~/lib/auth'

export function meta() {
	return [
		{ title: 'Login - Watchtower' },
		{ name: 'description', content: 'Sign in to your Watchtower account' },
	]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	return await requireGuest('/')
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	// We'll handle the login in the component instead of here
	// to ensure AuthProvider state is updated properly
	return null
}

export default function Login() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const loaderData = useLoaderData<typeof clientLoader>()
	const navigate = useNavigate()
	const { login } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsSubmitting(true)
		setError(null)

		const formData = new FormData(event.currentTarget)
		const email = formData.get('email') as string
		const password = formData.get('password') as string

		try {
			const result = await login(email, password)
			if (result.success) {
				// Navigate to home after successful login
				navigate('/', { replace: true })
			} else {
				setError(result.error || 'Login failed')
			}
		} catch (err) {
			setError('Network error occurred')
		} finally {
			setIsSubmitting(false)
		}
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
					<form onSubmit={handleSubmit} className='space-y-4'>
						{error && (
							<Alert variant='destructive'>
								<AlertDescription>{error}</AlertDescription>
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
					</form>

					<div className='mt-4 text-center text-sm'>
						Don't have an account?{' '}
						<Link
							to='/register'
							className='text-primary hover:underline'
						>
							Create one
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
