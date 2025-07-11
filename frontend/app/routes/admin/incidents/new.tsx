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
import { Alert, AlertDescription } from '~/components/ui/alert'
import { ButtonLoadingSkeleton } from '~/lib/lazy'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'
import type { Route } from './+types/new'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New Incident - Admin - Watchtower' },
		{ name: 'description', content: 'Create a new system incident' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	// Load endpoints for incident association
	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
			method: 'GET',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.ok) {
			const data = await response.json()
			return { endpoints: data.endpoints }
		}

		return { endpoints: [] }
	} catch (error) {
		console.error('Error loading endpoints:', error)
		return { endpoints: [] }
	}
}

interface IncidentFormData {
	title: string
	description: string
	severity: string
	status: string
	endpoint_ids: string[]
}

export default function NewIncident({ loaderData }: Route.ComponentProps) {
	const { endpoints } = loaderData
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			severity: 'medium',
			status: 'open',
			endpoint_ids: [] as string[],
		} as IncidentFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			setError(null)

			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

			try {
				const response = await fetch(
					`${API_BASE_URL}/api/v1/admin/incidents`,
					{
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(value),
					},
				)

				if (response.ok) {
					successToast(
						'Incident Created',
						`Successfully created incident "${value.title}"`,
					)
					navigate('/admin/incidents')
				} else {
					const errorData = await response.json()
					const errorMessage = getApiErrorMessage(errorData)
					setError(errorMessage)
					errorToast('Creation Failed', errorMessage)
				}
			} catch (error) {
				console.error('Error creating incident:', error)
				const errorMessage =
					'Network error occurred. Please check your connection and try again.'
				setError(errorMessage)
				errorToast('Network Error', errorMessage)
			} finally {
				setIsSubmitting(false)
			}
		},
	})

	return (
		<div className='max-w-2xl'>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold'>New Incident</h1>
					<p className='text-muted-foreground'>
						Create a new system incident
					</p>
				</div>
				<Link to='/admin/incidents'>
					<Button variant='outline'>Cancel</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Incident Details</CardTitle>
					<CardDescription>
						Provide information about the incident
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

						<div className='space-y-4'>
							<form.Field
								name='title'
								validators={{
									onChange: validators.required,
								}}
								children={(field) => (
									<div className='space-y-2'>
										<Label htmlFor='title'>Title *</Label>
										<Input
											id='title'
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(
													e.target.value,
												)
											}
											onBlur={field.handleBlur}
											placeholder='Brief description of the incident'
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<form.Field
								name='description'
								validators={{
									onChange: validators.required,
								}}
								children={(field) => (
									<div className='space-y-2'>
										<Label htmlFor='description'>
											Description *
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
											placeholder='Detailed description of what happened and current status'
											rows={4}
										/>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							/>

							<div className='grid grid-cols-2 gap-4'>
								<form.Field
									name='severity'
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='severity'>
												Severity
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
													<SelectItem value='low'>
														Low
													</SelectItem>
													<SelectItem value='medium'>
														Medium
													</SelectItem>
													<SelectItem value='high'>
														High
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
									name='status'
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='status'>
												Status
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
													<SelectItem value='open'>
														Open
													</SelectItem>
													<SelectItem value='investigating'>
														Investigating
													</SelectItem>
													<SelectItem value='resolved'>
														Resolved
													</SelectItem>
												</SelectContent>
											</Select>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>
							</div>

							{endpoints.length > 0 && (
								<form.Field
									name='endpoint_ids'
									children={(field) => (
										<div className='space-y-2'>
											<Label>
												Affected Endpoints (Optional)
											</Label>
											<div className='grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-3'>
												{endpoints.map(
													(endpoint: any) => (
														<label
															key={endpoint.id}
															className='flex items-center space-x-2 cursor-pointer'
														>
															<input
																type='checkbox'
																checked={field.state.value.includes(
																	endpoint.id,
																)}
																onChange={(
																	e,
																) => {
																	const currentIds =
																		field
																			.state
																			.value ||
																		[]
																	if (
																		e.target
																			.checked
																	) {
																		field.handleChange(
																			[
																				...currentIds,
																				endpoint.id,
																			],
																		)
																	} else {
																		field.handleChange(
																			currentIds.filter(
																				(
																					id: string,
																				) =>
																					id !==
																					endpoint.id,
																			),
																		)
																	}
																}}
																className='rounded'
															/>
															<span className='text-sm'>
																{endpoint.name}{' '}
																({endpoint.url})
															</span>
														</label>
													),
												)}
											</div>
											<p className='text-xs text-muted-foreground'>
												Select endpoints that are
												affected by this incident
											</p>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>
							)}
						</div>

						<div className='flex justify-end space-x-2'>
							<Link to='/admin/incidents'>
								<Button type='button' variant='outline'>
									Cancel
								</Button>
							</Link>
							<Button type='submit' disabled={isSubmitting}>
								{isSubmitting && <ButtonLoadingSkeleton />}
								{isSubmitting
									? 'Creating...'
									: 'Create Incident'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
