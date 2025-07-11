import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from '@tanstack/react-form'
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
import { LazyJsonEditor as JsonEditor } from '~/components/lazy-json-editor'
import { ButtonLoadingSkeleton } from '~/lib/lazy'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'
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

interface EndpointFormData {
	name: string
	description: string
	url: string
	method: string
	headers: string
	body: string
	expected_status_code: number
	timeout_seconds: number
	check_interval_seconds: number
	enabled: boolean
}

export default function NewEndpoint({}: Route.ComponentProps) {
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
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
		} as EndpointFormData,
		onSubmit: async ({ value }) => {
			setError(null)

			// Parse headers if provided
			let headers = {}
			if (value.headers.trim()) {
				try {
					headers = JSON.parse(value.headers)
				} catch {
					setError('Invalid JSON format for headers')
					errorToast('Invalid Headers', 'Headers must be valid JSON')
					return
				}
			}

			// Parse body if provided
			let body = null
			if (value.body.trim()) {
				try {
					body = JSON.parse(value.body)
				} catch {
					setError('Invalid JSON format for request body')
					errorToast(
						'Invalid Request Body',
						'Request body must be valid JSON',
					)
					return
				}
			}

			const payload = {
				...value,
				headers,
				body,
				expected_status_code: Number(value.expected_status_code),
				timeout_seconds: Number(value.timeout_seconds),
				check_interval_seconds: Number(value.check_interval_seconds),
			}

			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

			try {
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
					successToast(
						'Endpoint Created',
						`Successfully created endpoint "${value.name}"`,
					)
					navigate('/admin/endpoints')
				} else {
					const errorData = await response.json()
					const errorMessage = getApiErrorMessage(errorData)
					setError(errorMessage)
					errorToast('Creation Failed', errorMessage)
				}
			} catch (error) {
				console.error('Error creating endpoint:', error)
				const errorMessage =
					'Network error occurred. Please check your connection and try again.'
				setError(errorMessage)
				errorToast('Network Error', errorMessage)
			} finally {
				// Form submission complete
			}
		},
	})

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
					<form
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='space-y-6'
					>
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

							<form.Field
								name='name'
								validators={{
									onChange: validators.required,
								}}
								children={(field) => (
									<div className='space-y-2'>
										<Label htmlFor='name'>Name *</Label>
										<Input
											id='name'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											placeholder='My API Endpoint'
											required
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<form.Field
								name='description'
								children={(field) => (
									<div className='space-y-2'>
										<Label htmlFor='description'>
											Description
										</Label>
										<Textarea
											id='description'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											placeholder='Optional description of what this endpoint monitors'
											rows={3}
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<form.Field
								name='url'
								validators={{
									onChange: combineValidators(
										validators.required,
										validators.url,
									),
								}}
								children={(field) => (
									<div className='space-y-2'>
										<Label htmlFor='url'>URL *</Label>
										<Input
											id='url'
											type='url'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											placeholder='https://api.example.com/health'
											required
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
								<form.Field
									name='method'
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='method'>
												HTTP Method
											</Label>
											<Select
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange(value)
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
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<form.Field
									name='expected_status_code'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.number,
											validators.positive,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='status'>
												Expected Status Code
											</Label>
											<Input
												id='status'
												type='number'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														Number(e.target.value),
													)
												}
												onBlur={field.handleBlur}
												min='100'
												max='599'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>
							</div>
						</div>

						{/* Request Configuration */}
						<div className='space-y-4'>
							<h3 className='text-lg font-medium'>
								Request Configuration
							</h3>

							<form.Field
								name='headers'
								children={(field) => (
									<div className='space-y-2'>
										<JsonEditor
											title='HTTP Headers'
											value={field.state.value}
											onChange={(value) =>
												field.handleChange(value)
											}
											height={200}
											placeholder={{
												Authorization:
													'Bearer your-token-here',
												'Content-Type':
													'application/json',
												'User-Agent':
													'Watchtower-Monitor/1.0',
											}}
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<form.Field
								name='method'
								children={(methodField) => (
									<>
										{(methodField.state.value === 'POST' ||
											methodField.state.value === 'PUT' ||
											methodField.state.value ===
												'PATCH') && (
											<form.Field
												name='body'
												children={(field) => (
													<div className='space-y-2'>
														<JsonEditor
															title='Request Body'
															value={
																field.state
																	.value
															}
															onChange={(value) =>
																field.handleChange(
																	value,
																)
															}
															height={250}
															placeholder={{
																key: 'value',
																data: {
																	nested: 'object',
																},
															}}
															validate={false}
														/>
														<FieldError
															errors={
																field.state.meta
																	.errors
															}
														/>
													</div>
												)}
											/>
										)}
									</>
								)}
							/>
						</div>

						{/* Monitoring Configuration */}
						<div className='space-y-4'>
							<h3 className='text-lg font-medium'>
								Monitoring Configuration
							</h3>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
								<form.Field
									name='timeout_seconds'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.number,
											validators.positive,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='timeout'>
												Timeout (seconds)
											</Label>
											<Input
												id='timeout'
												type='number'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														Number(e.target.value),
													)
												}
												onBlur={field.handleBlur}
												min='1'
												max='300'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<form.Field
									name='check_interval_seconds'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.number,
											validators.positive,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='interval'>
												Check Interval (seconds)
											</Label>
											<Input
												id='interval'
												type='number'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														Number(e.target.value),
													)
												}
												onBlur={field.handleBlur}
												min='1'
												max='86400'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>
							</div>

							<form.Field
								name='enabled'
								children={(field) => (
									<div className='flex items-center space-x-2'>
										<Switch
											id='enabled'
											checked={field.state.value}
											onCheckedChange={(checked) =>
												field.handleChange(checked)
											}
										/>
										<Label htmlFor='enabled'>
											Enable monitoring
										</Label>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>
						</div>

						<div className='flex justify-end space-x-2'>
							<Link to='/admin/endpoints'>
								<Button type='button' variant='outline'>
									Cancel
								</Button>
							</Link>
							<Button
								type='submit'
								disabled={form.state.isSubmitting}
							>
								{form.state.isSubmitting && (
									<ButtonLoadingSkeleton />
								)}
								{form.state.isSubmitting
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
