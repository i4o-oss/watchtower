import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { JsonEditor } from '~/components/json-editor'
import { LoadingSpinner } from '~/components/loading-spinner'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { 
	validateForm, 
	validateField, 
	endpointValidationSchema, 
	getApiErrorMessage 
} from '~/lib/validation'
import type { Route } from './+types/new'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New Endpoint - Admin - Watchtower' },
		{ name: 'description', content: 'Create a new monitoring endpoint' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')
	return null
}

export default function NewEndpoint({}: Route.ComponentProps) {
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()
	
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		url: '',
		method: 'GET',
		headers: '',
		body: '',
		expected_status_code: 200,
		timeout_seconds: 30,
		check_interval_seconds: 300,
		enabled: true,
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setError(null)
		setFieldErrors({})

		// Validate form data
		const validation = validateForm(formData, endpointValidationSchema)
		if (!validation.isValid) {
			setFieldErrors(validation.errors)
			setIsSubmitting(false)
			errorToast('Validation Error', 'Please correct the errors in the form')
			return
		}

		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			// Parse headers if provided
			let headers = {}
			if (formData.headers.trim()) {
				try {
					headers = JSON.parse(formData.headers)
				} catch {
					setFieldErrors({ headers: 'Invalid JSON format for headers' })
					setIsSubmitting(false)
					errorToast('Invalid Headers', 'Headers must be valid JSON')
					return
				}
			}

			// Parse body if provided
			let body = null
			if (formData.body.trim()) {
				try {
					body = JSON.parse(formData.body)
				} catch {
					setFieldErrors({ body: 'Invalid JSON format for request body' })
					setIsSubmitting(false)
					errorToast('Invalid Request Body', 'Request body must be valid JSON')
					return
				}
			}

			const payload = {
				...formData,
				headers,
				body,
				expected_status_code: Number(formData.expected_status_code),
				timeout_seconds: Number(formData.timeout_seconds),
				check_interval_seconds: Number(formData.check_interval_seconds),
			}

			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/endpoints`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				},
			)

			if (response.ok) {
				successToast('Endpoint Created', `Successfully created endpoint "${formData.name}"`)
				navigate('/admin/endpoints')
			} else {
				const errorData = await response.json()
				const errorMessage = getApiErrorMessage(errorData)
				setError(errorMessage)
				errorToast('Creation Failed', errorMessage)
			}
		} catch (error) {
			console.error('Error creating endpoint:', error)
			const errorMessage = 'Network error occurred. Please check your connection and try again.'
			setError(errorMessage)
			errorToast('Network Error', errorMessage)
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateFormData = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		
		// Clear field error when user starts typing
		if (fieldErrors[field]) {
			setFieldErrors((prev) => {
				const newErrors = { ...prev }
				delete newErrors[field]
				return newErrors
			})
		}
	}

	// Validate field on blur
	const handleFieldBlur = (field: string) => {
		const rules = endpointValidationSchema[field]
		if (rules) {
			const error = validateField(formData[field], rules)
			if (error) {
				setFieldErrors((prev) => ({ ...prev, [field]: error }))
			}
		}
	}

	// Helper to get field error state
	const getFieldError = (field: string) => fieldErrors[field] || null
	const hasFieldError = (field: string) => !!fieldErrors[field]

	return (
		<div className='max-w-2xl'>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>New Endpoint</h1>
					<p className='text-muted-foreground'>
						Create a new monitoring endpoint
					</p>
				</div>
				<Link to='/admin/endpoints'>
					<Button variant='outline'>Cancel</Button>
				</Link>
			</div>

				<Card>
					<CardHeader>
						<CardTitle>Endpoint Configuration</CardTitle>
						<CardDescription>
							Configure your endpoint monitoring settings
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && (
								<Alert variant='destructive'>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Basic Information */}
							<div className='space-y-4'>
								<h3 className='text-lg font-medium'>
									Basic Information
								</h3>

								<div className='space-y-2'>
									<Label htmlFor='name'>Name *</Label>
									<Input
										id='name'
										value={formData.name}
										onChange={(e) => updateFormData('name', e.target.value)}
										onBlur={() => handleFieldBlur('name')}
										placeholder='My API Endpoint'
										className={hasFieldError('name') ? 'border-red-500 focus:ring-red-500' : ''}
										required
									/>
									{getFieldError('name') && (
										<p className='text-sm text-red-600 mt-1'>{getFieldError('name')}</p>
									)}
								</div>

								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description
									</Label>
									<Textarea
										id='description'
										value={formData.description}
										onChange={(e) =>
											updateFormData(
												'description',
												e.target.value,
											)
										}
										placeholder='Optional description of what this endpoint monitors'
										rows={3}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='url'>URL *</Label>
									<Input
										id='url'
										type='url'
										value={formData.url}
										onChange={(e) => updateFormData('url', e.target.value)}
										onBlur={() => handleFieldBlur('url')}
										placeholder='https://api.example.com/health'
										className={hasFieldError('url') ? 'border-red-500 focus:ring-red-500' : ''}
										required
									/>
									{getFieldError('url') && (
										<p className='text-sm text-red-600 mt-1'>{getFieldError('url')}</p>
									)}
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<Label htmlFor='method'>
											HTTP Method
										</Label>
										<Select
											value={formData.method}
											onValueChange={(value) =>
												updateFormData('method', value)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='GET'>
													GET
												</SelectItem>
												<SelectItem value='POST'>
													POST
												</SelectItem>
												<SelectItem value='PUT'>
													PUT
												</SelectItem>
												<SelectItem value='PATCH'>
													PATCH
												</SelectItem>
												<SelectItem value='DELETE'>
													DELETE
												</SelectItem>
												<SelectItem value='HEAD'>
													HEAD
												</SelectItem>
												<SelectItem value='OPTIONS'>
													OPTIONS
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className='space-y-2'>
										<Label htmlFor='status'>
											Expected Status Code
										</Label>
										<Input
											id='status'
											type='number'
											value={formData.expected_status_code}
											onChange={(e) => updateFormData('expected_status_code', e.target.value)}
											onBlur={() => handleFieldBlur('expected_status_code')}
											min='100'
											max='599'
											className={hasFieldError('expected_status_code') ? 'border-red-500 focus:ring-red-500' : ''}
										/>
										{getFieldError('expected_status_code') && (
											<p className='text-sm text-red-600 mt-1'>{getFieldError('expected_status_code')}</p>
										)}
									</div>
								</div>
							</div>

							{/* Request Configuration */}
							<div className='space-y-4'>
								<h3 className='text-lg font-medium'>
									Request Configuration
								</h3>

								<JsonEditor
									title='HTTP Headers'
									value={formData.headers}
									onChange={(value) => updateFormData('headers', value)}
									height={200}
									placeholder={{
										"Authorization": "Bearer your-token-here",
										"Content-Type": "application/json",
										"User-Agent": "Watchtower-Monitor/1.0"
									}}
								/>

								{(formData.method === 'POST' ||
									formData.method === 'PUT' ||
									formData.method === 'PATCH') && (
									<JsonEditor
										title='Request Body'
										value={formData.body}
										onChange={(value) => updateFormData('body', value)}
										height={250}
										placeholder={{
											"key": "value",
											"data": {
												"nested": "object"
											}
										}}
										validate={false}
									/>
								)}
							</div>

							{/* Monitoring Configuration */}
							<div className='space-y-4'>
								<h3 className='text-lg font-medium'>
									Monitoring Configuration
								</h3>

								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<Label htmlFor='timeout'>
											Timeout (seconds)
										</Label>
										<Input
											id='timeout'
											type='number'
											value={formData.timeout_seconds}
											onChange={(e) => updateFormData('timeout_seconds', e.target.value)}
											onBlur={() => handleFieldBlur('timeout_seconds')}
											min='1'
											max='300'
											className={hasFieldError('timeout_seconds') ? 'border-red-500 focus:ring-red-500' : ''}
										/>
										{getFieldError('timeout_seconds') && (
											<p className='text-sm text-red-600 mt-1'>{getFieldError('timeout_seconds')}</p>
										)}
									</div>

									<div className='space-y-2'>
										<Label htmlFor='interval'>
											Check Interval (seconds)
										</Label>
										<Input
											id='interval'
											type='number'
											value={formData.check_interval_seconds}
											onChange={(e) => updateFormData('check_interval_seconds', e.target.value)}
											onBlur={() => handleFieldBlur('check_interval_seconds')}
											min='30'
											max='86400'
											className={hasFieldError('check_interval_seconds') ? 'border-red-500 focus:ring-red-500' : ''}
										/>
										{getFieldError('check_interval_seconds') && (
											<p className='text-sm text-red-600 mt-1'>{getFieldError('check_interval_seconds')}</p>
										)}
									</div>
								</div>

								<div className='flex items-center space-x-2'>
									<Switch
										id='enabled'
										checked={formData.enabled}
										onCheckedChange={(checked) =>
											updateFormData('enabled', checked)
										}
									/>
									<Label htmlFor='enabled'>
										Enable monitoring
									</Label>
								</div>
							</div>

							<div className='flex justify-end space-x-2'>
								<Link to='/admin/endpoints'>
									<Button type='button' variant='outline'>
										Cancel
									</Button>
								</Link>
								<Button type='submit' disabled={isSubmitting}>
									{isSubmitting && (
										<LoadingSpinner size='sm' className='mr-2' />
									)}
									{isSubmitting
										? 'Creating...'
										: 'Create Endpoint'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
		</div>
	)
}
