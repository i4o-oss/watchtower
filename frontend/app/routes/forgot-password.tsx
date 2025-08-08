import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from '@tanstack/react-form'
import type { Route } from './+types/forgot-password'
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
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { requireGuest } from '~/lib/auth'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'

export function meta() {
	return [
		{ title: 'Reset Password - Watchtower' },
		{ name: 'description', content: 'Reset your Watchtower password' },
	]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	return await requireGuest('/')
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	return null
}

interface ForgotPasswordFormData {
	email: string
}

export default function ForgotPassword() {
	const navigate = useNavigate()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isSuccess, setIsSuccess] = useState(false)

	const form = useForm({
		defaultValues: {
			email: '',
		} as ForgotPasswordFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			setError(null)

			try {
				// Simulate API call for password reset
				// TODO: Replace with actual API integration
				await new Promise((resolve) => setTimeout(resolve, 1000))

				// For now, always show success
				setIsSuccess(true)
			} catch (err) {
				setError('Network error occurred')
			} finally {
				setIsSubmitting(false)
			}
		},
	})

	if (isSuccess) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background px-4'>
				<Card className='w-full max-w-md'>
					<CardHeader className='space-y-1 text-center'>
						<div className='mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4'>
							<CheckCircle className='w-6 h-6 text-green-600' />
						</div>
						<CardTitle>Check Your Email</CardTitle>
						<CardDescription className='text-center'>
							We'll send you a secure link to reset your password
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							<Alert className='bg-green-50 border-green-200'>
								<AlertDescription>
									If an account with that email exists, we've
									sent you a password reset link. Please check
									your inbox and spam folder.
								</AlertDescription>
							</Alert>

							<Button
								variant='ghost'
								onClick={() => navigate('/login')}
								className='w-full'
							>
								<ArrowLeft className='w-4 h-4' />
								Back to Sign In
							</Button>
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
					<CardTitle className='text-h2 text-center'>
						Reset Password
					</CardTitle>
					<CardDescription className='text-center'>
						Enter your email and we'll send you a secure link to
						reset your password
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
										Email Address
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
										className='h-10'
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
								? 'Sending Reset Instructions...'
								: 'Send Reset Instructions'}
						</Button>
					</form>

					<div className='mt-6 text-center'>
						<Link
							to='/login'
							className='text-primary hover:text-primary/80 inline-flex items-center gap-2 transition-colors duration-200'
						>
							<ArrowLeft className='w-4 h-4' />
							Back to Sign In
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
