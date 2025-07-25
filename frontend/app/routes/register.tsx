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
import { useForm } from '@tanstack/react-form'
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
import { requireGuest, useAuth, checkRegistrationStatus } from '~/lib/auth'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'

export function meta() {
	return [
		{ title: 'Register - Watchtower' },
		{ name: 'description', content: 'Create your Watchtower account' },
	]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	// Check if registration is allowed
	const registrationAllowed = await checkRegistrationStatus()

	// If registration is not allowed, still show the page but with blocked message
	// We'll handle the blocking in the component
	if (!registrationAllowed) {
		return { registrationBlocked: true }
	}

	// If registration is allowed, check if user is already authenticated
	await requireGuest('/')
	return { registrationBlocked: false }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	// We'll handle the registration in the component instead of here
	// to ensure AuthProvider state is updated properly
	return null
}

interface RegisterFormData {
	name: string
	email: string
	password: string
}

export default function Register() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const loaderData = useLoaderData<typeof clientLoader>()
	const navigate = useNavigate()
	const { register } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Check if registration is blocked
	const isRegistrationBlocked = loaderData?.registrationBlocked || false

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
		} as RegisterFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			setError(null)

			try {
				const result = await register(
					value.email,
					value.password,
					value.name,
				)
				if (result.success) {
					navigate('/', { replace: true })
				} else {
					setError(result.error || 'Registration failed')
				}
			} catch (err) {
				setError('Network error occurred')
			} finally {
				setIsSubmitting(false)
			}
		},
	})

	// If registration is blocked, show a different UI
	if (isRegistrationBlocked) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background px-4'>
				<Card className='w-full max-w-md'>
					<CardHeader className='space-y-1'>
						<CardTitle className='text-2xl font-bold text-center'>
							Registration Disabled
						</CardTitle>
						<CardDescription className='text-center'>
							Registration is disabled. Only the first user can
							register.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert>
							<AlertDescription>
								Registration has been disabled after the first
								user signed up. If you're the administrator,
								please use the login page to access your
								account.
							</AlertDescription>
						</Alert>

						<div className='mt-4 text-center'>
							<Link
								to='/login'
								className='text-primary hover:underline'
							>
								Go to Login
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		)
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
					<form
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='space-y-4'
					>
						{error && (
							<Alert variant='destructive'>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<form.Field
							name='name'
							children={(field) => (
								<div className='space-y-2'>
									<Label htmlFor='name'>
										Name (Optional)
									</Label>
									<Input
										id='name'
										name='name'
										type='text'
										placeholder='Your full name'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										disabled={isSubmitting}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>

						<form.Field
							name='email'
							validators={{
								onChange: combineValidators(
									validators.required,
									validators.email,
								),
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label htmlFor='email'>Email</Label>
									<Input
										id='email'
										name='email'
										type='email'
										placeholder='your@email.com'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										disabled={isSubmitting}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>

						<form.Field
							name='password'
							validators={{
								onChange: combineValidators(
									validators.required,
									validators.minLength(6),
								),
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label htmlFor='password'>Password</Label>
									<Input
										id='password'
										name='password'
										type='password'
										placeholder='Enter your password'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										disabled={isSubmitting}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>

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
