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
import { Eye, EyeOff } from 'lucide-react'
import { requireGuest, useAuth, checkRegistrationStatus } from '~/lib/auth'
import {
	validators,
	combineValidators,
	FieldError,
	PasswordStrengthIndicator,
} from '~/lib/form-utils'

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
	email: string
	password: string
	confirmPassword: string
}

export default function Register() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const loaderData = useLoaderData<typeof clientLoader>()
	const navigate = useNavigate()
	const { register } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	// Check if registration is blocked
	const isRegistrationBlocked = loaderData?.registrationBlocked || false

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
			confirmPassword: '',
		} as RegisterFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			setError(null)

			try {
				const result = await register(value.email, value.password)
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
			<div className='min-h-screen flex items-center justify-center px-4'>
				<Card className='w-full max-w-[400px]'>
					<CardHeader className='space-y-1 text-center'>
						<CardTitle>Registration Closed</CardTitle>
						<CardDescription>
							Registration is closed. Please contact your
							administrator for access.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert>
							<AlertDescription>
								Registration is closed. Please contact your
								administrator for access.
							</AlertDescription>
						</Alert>

						<div className='mt-6 text-center'>
							<Link
								to='/login'
								className='text-primary hover:text-primary/80 transition-colors duration-200'
							>
								Already have an account? Sign in
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className='min-h-screen flex items-center justify-center px-4'>
			<Card className='w-full max-w-[400px]'>
				<CardHeader className='space-y-1 text-center'>
					<CardTitle>Set up your Watchtower</CardTitle>
					<CardDescription>
						Create your admin account to get started monitoring
					</CardDescription>
					<div className='text-xs text-muted-foreground mt-2'>
						Step 1 of 3
					</div>
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
							name='email'
							validators={{
								onChange: combineValidators(
									validators.required,
									validators.email,
								),
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label
										htmlFor='email'
										className='text-sm font-medium'
									>
										Email
									</Label>
									<Input
										id='email'
										name='email'
										type='email'
										placeholder='admin@company.com'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										disabled={isSubmitting}
										autoComplete='email'
										className={`h-10 transition-colors duration-200 ${
											field.state.meta.errors.length > 0
												? 'border-destructive focus-visible:ring-destructive'
												: 'focus-visible:ring-primary'
										}`}
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
									validators.passwordStrength,
								),
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label
										htmlFor='password'
										className='text-sm font-medium'
									>
										Password
									</Label>
									<div className='relative'>
										<Input
											id='password'
											name='password'
											type={
												showPassword
													? 'text'
													: 'password'
											}
											placeholder='Create a strong password'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											disabled={isSubmitting}
											autoComplete='new-password'
											className={`h-10 pr-10 transition-colors duration-200 ${
												field.state.meta.errors.length >
												0
													? 'border-destructive focus-visible:ring-destructive'
													: field.state.value
														? 'border-primary focus-visible:ring-primary'
														: 'focus-visible:ring-primary'
											}`}
										/>
										<Button
											type='button'
											variant='ghost'
											size='icon'
											className='absolute right-0 top-0 h-10 w-10 px-3 hover:bg-transparent'
											onClick={() =>
												setShowPassword(!showPassword)
											}
											tabIndex={-1}
										>
											{showPassword ? (
												<EyeOff className='h-4 w-4 text-muted-foreground' />
											) : (
												<Eye className='h-4 w-4 text-muted-foreground' />
											)}
										</Button>
									</div>

									<PasswordStrengthIndicator
										password={field.state.value}
									/>

									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>

						<form.Field
							name='confirmPassword'
							validators={{
								onChange: (info) => {
									if (!info.value)
										return 'Please confirm your password'
									const passwordValue =
										form.getFieldValue('password')
									if (info.value !== passwordValue) {
										return 'Passwords do not match'
									}
									return undefined
								},
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label
										htmlFor='confirmPassword'
										className='text-sm font-medium'
									>
										Confirm Password
									</Label>
									<div className='relative'>
										<Input
											id='confirmPassword'
											name='confirmPassword'
											type={
												showConfirmPassword
													? 'text'
													: 'password'
											}
											placeholder='Confirm your password'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											disabled={isSubmitting}
											autoComplete='new-password'
											className={`h-10 pr-10 transition-colors duration-200 ${
												field.state.meta.errors.length >
												0
													? 'border-destructive focus-visible:ring-destructive'
													: field.state.value &&
															field.state
																.value ===
																form.getFieldValue(
																	'password',
																)
														? 'border-green-500 focus-visible:ring-green-500'
														: 'focus-visible:ring-primary'
											}`}
										/>
										<Button
											type='button'
											variant='ghost'
											size='icon'
											className='absolute right-0 top-0 h-10 w-10 px-3 hover:bg-transparent'
											onClick={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
											tabIndex={-1}
										>
											{showConfirmPassword ? (
												<EyeOff className='h-4 w-4 text-muted-foreground' />
											) : (
												<Eye className='h-4 w-4 text-muted-foreground' />
											)}
										</Button>
									</div>
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
							{isSubmitting ? (
								<>
									<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
									Creating Admin Account...
								</>
							) : (
								'Create Admin Account'
							)}
						</Button>
					</form>

					<div className='mt-6 text-center text-xs text-muted-foreground'>
						Already have an account?{' '}
						<Link
							to='/login'
							className='text-primary hover:text-primary/80 transition-colors duration-200'
						>
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
