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
import { requireGuest, useAuth } from '~/lib/auth'

export function meta() {
	return [
		{ title: 'Register - Watchtower' },
		{ name: 'description', content: 'Create your Watchtower account' },
	]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	return await requireGuest('/')
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	// We'll handle the registration in the component instead of here
	// to ensure AuthProvider state is updated properly
	return null
}

export default function Register() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const loaderData = useLoaderData<typeof clientLoader>()
	const navigate = useNavigate()
	const { register } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsSubmitting(true)
		setError(null)

		const formData = new FormData(event.currentTarget)
		const email = formData.get('email') as string
		const password = formData.get('password') as string
		const name = formData.get('name') as string

		try {
			const result = await register(email, password, name)
			if (result.success) {
				// Navigate to home after successful registration
				navigate('/', { replace: true })
			} else {
				setError(result.error || 'Registration failed')
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
						Create Account
					</CardTitle>
					<CardDescription className='text-center'>
						Enter your information to create your account
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
					</form>

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
