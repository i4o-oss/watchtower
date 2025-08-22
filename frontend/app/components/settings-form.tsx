import { useState, useEffect } from 'react'
import { useForm, useField } from '@tanstack/react-form'
import { Button } from '~/components/ui/button'
import { CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Separator } from '~/components/ui/separator'
import { Eye, EyeOff } from 'lucide-react'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'
import { useSuccessToast, useErrorToast } from '~/components/toast'

export interface SettingsFormData {
	siteName: string
	siteDescription: string
	domain: string
	adminEmail: string
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

interface SettingsData {
	site_name: string
	description: string
	domain: string
	adminEmail: string
}

export function SettingsForm() {
	const [isSubmittingSite, setIsSubmittingSite] = useState(false)
	const [isSubmittingDomain, setIsSubmittingDomain] = useState(false)
	const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [siteError, setSiteError] = useState<string | null>(null)
	const [domainError, setDomainError] = useState<string | null>(null)
	const [adminError, setAdminError] = useState<string | null>(null)
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [showNewPassword, setShowNewPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const form = useForm({
		defaultValues: {
			siteName: '',
			siteDescription: '',
			domain: '',
			adminEmail: '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		} as SettingsFormData,
	})

	const submitSettings = async (section: 'site' | 'domain' | 'admin') => {
		const values = form.state.values
		let payload: any = {}
		let setSubmitting: (value: boolean) => void
		let setError: (value: string | null) => void
		let successMessage: string

		switch (section) {
			case 'site':
				payload = {
					siteName: values.siteName,
					siteDescription: values.siteDescription,
				}
				setSubmitting = setIsSubmittingSite
				setError = setSiteError
				successMessage = 'Site configuration updated successfully'
				break
			case 'domain':
				payload = {
					domain: values.domain,
				}
				setSubmitting = setIsSubmittingDomain
				setError = setDomainError
				successMessage = 'Domain settings updated successfully'
				break
			case 'admin':
				payload = {
					adminEmail: values.adminEmail,
					currentPassword: values.currentPassword,
					newPassword: values.newPassword,
				}
				setSubmitting = setIsSubmittingAdmin
				setError = setAdminError
				successMessage = 'Admin credentials updated successfully'
				// Only admin section requires current password
				if (
					!values.currentPassword ||
					values.currentPassword.trim() === ''
				) {
					setError('Current password is required')
					return
				}
				break
		}

		setSubmitting(true)
		setError(null)

		try {
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/settings`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify(payload),
				},
			)

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || 'Failed to update settings')
			}

			successToast(successMessage)
			// Clear password fields after successful update (only for admin section)
			if (section === 'admin') {
				form.setFieldValue('currentPassword', '')
				form.setFieldValue('newPassword', '')
				form.setFieldValue('confirmPassword', '')
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to update settings'
			setError(message)
			errorToast(message)
		} finally {
			setSubmitting(false)
		}
	}

	// Load initial settings data
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
				const response = await fetch(
					`${API_BASE_URL}/api/v1/admin/settings`,
					{
						credentials: 'include',
					},
				)

				if (response.ok) {
					const data: SettingsData = await response.json()
					form.setFieldValue('siteName', data.site_name || '')
					form.setFieldValue(
						'siteDescription',
						data.description || '',
					)
					form.setFieldValue('domain', data.domain || '')
					form.setFieldValue('adminEmail', data.adminEmail || '')
				}
			} catch (err) {
				console.error('Failed to load settings:', err)
			} finally {
				setIsLoading(false)
			}
		}

		loadSettings()
	}, [])

	if (isLoading) {
		return (
			<CardContent className='space-y-8'>
				<div className='flex items-center justify-center py-8'>
					<div className='text-sm text-muted-foreground'>
						Loading settings...
					</div>
				</div>
			</CardContent>
		)
	}

	return (
		<CardContent className='p-0 gap-4 flex flex-col'>
			{/* Site Configuration Section */}
			<div className='px-6 py-4 space-y-4'>
				<div>
					<h3 className='text-lg font-semibold'>
						Site Configuration
					</h3>
					<p className='text-sm text-muted-foreground'>
						Configure basic site information displayed on the status
						page
					</p>
				</div>

				{siteError && (
					<Alert variant='destructive'>
						<AlertDescription>{siteError}</AlertDescription>
					</Alert>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault()
						submitSettings('site')
					}}
					className='space-y-4'
				>
					<form.Field
						name='siteName'
						validators={{
							onChange: combineValidators(
								validators.required,
								validators.minLength(1),
							),
						}}
					>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='siteName'>Site Name</Label>
								<Input
									id='siteName'
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder='Enter site name'
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<form.Field
						name='siteDescription'
						validators={{
							onChange: validators.maxLength(500),
						}}
					>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='siteDescription'>
									Site Description
								</Label>
								<Textarea
									id='siteDescription'
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder='Enter site description (optional)'
									rows={3}
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<div className='flex justify-end pt-4'>
						<Button type='submit' disabled={isSubmittingSite}>
							{isSubmittingSite
								? 'Saving...'
								: 'Save Site Settings'}
						</Button>
					</div>
				</form>
			</div>

			<Separator />

			{/* Domain Settings Section */}
			<div className='px-6 py-4 space-y-4'>
				<div>
					<h3 className='text-lg font-semibold'>Domain Settings</h3>
					<p className='text-sm text-muted-foreground'>
						Configure the primary domain for your status page
					</p>
				</div>

				{domainError && (
					<Alert variant='destructive'>
						<AlertDescription>{domainError}</AlertDescription>
					</Alert>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault()
						submitSettings('domain')
					}}
					className='space-y-4'
				>
					<form.Field
						name='domain'
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim() === '')
									return undefined
								const domainRegex =
									/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
								if (!domainRegex.test(value)) {
									return 'Please enter a valid domain'
								}
								return undefined
							},
						}}
					>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='domain'>Primary Domain</Label>
								<Input
									id='domain'
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder='example.com'
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<div className='flex justify-end pt-4'>
						<Button type='submit' disabled={isSubmittingDomain}>
							{isSubmittingDomain
								? 'Saving...'
								: 'Save Domain Settings'}
						</Button>
					</div>
				</form>
			</div>

			<Separator />

			{/* Admin Account Management Section */}
			<div className='px-6 py-4 space-y-4'>
				<div>
					<h3 className='text-lg font-semibold'>Admin Account</h3>
					<p className='text-sm text-muted-foreground'>
						Update admin email and password
					</p>
				</div>

				{adminError && (
					<Alert variant='destructive'>
						<AlertDescription>{adminError}</AlertDescription>
					</Alert>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault()
						submitSettings('admin')
					}}
					className='space-y-4'
				>
					<form.Field
						name='adminEmail'
						validators={{
							onChange: combineValidators(
								validators.required,
								validators.email,
							),
						}}
					>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='adminEmail'>Admin Email</Label>
								<Input
									id='adminEmail'
									type='email'
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder='admin@example.com'
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<form.Field
						name='currentPassword'
						validators={{
							onChange: validators.minLength(1),
						}}
					>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='currentPassword'>
									Current Password
								</Label>
								<div className='relative'>
									<Input
										id='currentPassword'
										type={
											showCurrentPassword
												? 'text'
												: 'password'
										}
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder='Enter current password'
									/>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
										onClick={() =>
											setShowCurrentPassword(
												!showCurrentPassword,
											)
										}
									>
										{showCurrentPassword ? (
											<EyeOff className='h-4 w-4' />
										) : (
											<Eye className='h-4 w-4' />
										)}
									</Button>
								</div>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<form.Field name='newPassword'>
						{(field) => (
							<div className='space-y-2'>
								<Label htmlFor='newPassword'>
									New Password (optional)
								</Label>
								<div className='relative'>
									<Input
										id='newPassword'
										type={
											showNewPassword
												? 'text'
												: 'password'
										}
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder='Enter new password (leave empty to keep current)'
									/>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
										onClick={() =>
											setShowNewPassword(!showNewPassword)
										}
									>
										{showNewPassword ? (
											<EyeOff className='h-4 w-4' />
										) : (
											<Eye className='h-4 w-4' />
										)}
									</Button>
								</div>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<form.Field
						name='confirmPassword'
						validators={{
							onChange: validators.confirmPassword('newPassword'),
						}}
					>
						{(field) => {
							const newPasswordValue =
								form.getFieldValue('newPassword')
							const isDisabled =
								!newPasswordValue ||
								newPasswordValue.trim() === ''

							return (
								<div className='space-y-2'>
									<Label htmlFor='confirmPassword'>
										Confirm New Password
									</Label>
									<div className='relative'>
										<Input
											id='confirmPassword'
											type={
												showConfirmPassword
													? 'text'
													: 'password'
											}
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											placeholder='Confirm new password'
											disabled={isDisabled}
										/>
										<Button
											type='button'
											variant='ghost'
											size='sm'
											className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
											onClick={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
											disabled={isDisabled}
										>
											{showConfirmPassword ? (
												<EyeOff className='h-4 w-4' />
											) : (
												<Eye className='h-4 w-4' />
											)}
										</Button>
									</div>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)
						}}
					</form.Field>

					<div className='flex justify-end pt-4'>
						<Button type='submit' disabled={isSubmittingAdmin}>
							{isSubmittingAdmin
								? 'Saving...'
								: 'Save Admin Settings'}
						</Button>
					</div>
				</form>
			</div>
		</CardContent>
	)
}
