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
import { useForm, useField } from '@tanstack/react-form'
import type { Route } from './+types/login'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'
import { requireGuest, useAuth } from '~/lib/auth'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'

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

interface LoginFormData {
	email: string
	password: string
	rememberMe: boolean
}

export default function Login() {
	const navigation = useNavigation()
	const actionData = useActionData<typeof clientAction>()
	const loaderData = useLoaderData<typeof clientLoader>()
	const navigate = useNavigate()
	const { login } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showPassword, setShowPassword] = useState(false)

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
			rememberMe: false,
		} as LoginFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			setError(null)

			try {
				const result = await login(value.email, value.password)
				if (result.success) {
					navigate('/', { replace: true })
				} else {
					setError(result.error || 'Login failed')
				}
			} catch (err) {
				setError('Network error occurred')
			} finally {
				setIsSubmitting(false)
			}
		},
	})

	return (
		<div
			className='min-h-screen flex items-center justify-center px-4'
			style={{ backgroundColor: 'var(--background-off-white)' }}
		>
			<Card className='w-full max-w-[400px]'>
				<CardHeader className='space-y-1 text-center'>
					<div className='mb-2'>
						<h1 className='text-h2 font-bold text-foreground'>
							Watchtower
						</h1>
						<p className='text-body text-muted-foreground mt-1'>
							Monitor with confidence
						</p>
					</div>
					<CardTitle className='text-h2'>Welcome Back</CardTitle>
					<CardDescription className='text-body'>
						Enter your credentials to sign in to your account
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
							<Alert
								variant='destructive'
								className='bg-error-red/5 border-error-red/20'
							>
								<AlertDescription className='text-body'>
									{error}
								</AlertDescription>
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
										className='text-body font-medium'
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
												? 'border-error-red focus-visible:ring-error-red'
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
									validators.minLength(6),
								),
							}}
							children={(field) => (
								<div className='space-y-2'>
									<Label
										htmlFor='password'
										className='text-body font-medium'
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
											placeholder='Enter your password'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											disabled={isSubmitting}
											autoComplete='current-password'
											className={`h-10 pr-10 transition-colors duration-200 ${
												field.state.meta.errors.length >
												0
													? 'border-error-red focus-visible:ring-error-red'
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
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>

						<form.Field
							name='rememberMe'
							children={(field) => (
								<div className='flex items-center space-x-2'>
									<Checkbox
										id='rememberMe'
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
										disabled={isSubmitting}
										className='data-[state=checked]:bg-primary data-[state=checked]:border-primary'
									/>
									<Label
										htmlFor='rememberMe'
										className='text-body cursor-pointer'
									>
										Remember me
									</Label>
								</div>
							)}
						/>

						<Button
							type='submit'
							className='w-full h-10 text-button bg-primary hover:bg-primary/90 transition-colors duration-200'
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
									Signing In...
								</>
							) : (
								'Sign In'
							)}
						</Button>
					</form>

					<div className='mt-6 space-y-3 text-center'>
						<Link
							to='/forgot-password'
							className='text-link hover:text-primary/80 transition-colors duration-200 text-sm block'
						>
							Forgot password?
						</Link>

						<div className='text-body-small text-muted-foreground'>
							Don't have an account?{' '}
							<Link
								to='/register'
								className='text-link hover:text-primary/80 transition-colors duration-200'
							>
								Create one
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
