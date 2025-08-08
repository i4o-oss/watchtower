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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Switch } from '~/components/ui/switch'
import { Checkbox } from '~/components/ui/checkbox'
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
	incident_type: 'unplanned' | 'maintenance'
	public_message: string
	publish_to_status_page: boolean
	notification_channels: string[]
	save_as_draft: boolean
	schedule_publication: boolean
	scheduled_time: string
}

export default function NewIncident({ loaderData }: Route.ComponentProps) {
	const { endpoints } = loaderData
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState('basic')

	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			severity: 'medium',
			status: 'open',
			endpoint_ids: [] as string[],
			incident_type: 'unplanned' as 'unplanned' | 'maintenance',
			public_message: '',
			publish_to_status_page: false,
			notification_channels: [] as string[],
			save_as_draft: false,
			schedule_publication: false,
			scheduled_time: '',
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
					const actionText = value.save_as_draft
						? 'saved as draft'
						: 'created'
					successToast(
						'Incident Created',
						`Successfully ${actionText} incident "${value.title}"`,
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

	const getSeverityBadge = (severity: string) => {
		const severityConfig = {
			critical: {
				variant: 'destructive' as const,
				color: 'bg-red-500',
				description: 'Service completely unavailable',
			},
			high: {
				variant: 'destructive' as const,
				color: 'bg-orange-500',
				description: 'Major functionality impacted',
			},
			medium: {
				variant: 'default' as const,
				color: 'bg-yellow-500',
				description: 'Some functionality affected',
			},
			low: {
				variant: 'secondary' as const,
				color: 'bg-green-500',
				description: 'Minor impact or maintenance',
			},
		}

		return (
			severityConfig[severity as keyof typeof severityConfig] ||
			severityConfig.low
		)
	}

	return (
		<div className='space-y-8'>
			<div className='flex justify-between items-center'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Create New Incident
					</h1>
					<p className='text-lg text-muted-foreground mt-2'>
						Report a service incident or schedule maintenance
					</p>
				</div>
				<Link to='/admin/incidents'>
					<Button variant='outline' size='lg'>
						Cancel
					</Button>
				</Link>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className='space-y-8'
			>
				{error && (
					<Alert variant='destructive'>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className='space-y-6'
				>
					<TabsList className='grid w-full grid-cols-2'>
						<TabsTrigger
							value='basic'
							className='flex items-center gap-2'
						>
							📝 Basic Information
						</TabsTrigger>
						<TabsTrigger
							value='communication'
							className='flex items-center gap-2'
						>
							📢 Communication Settings
						</TabsTrigger>
					</TabsList>

					<TabsContent value='basic' className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									🚨 Incident Type & Details
								</CardTitle>
								<CardDescription>
									Specify the type of incident and provide
									detailed information
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-6'>
								{/* Incident Type Toggle */}
								<form.Field
									name='incident_type'
									children={(field) => (
										<div className='space-y-3'>
											<Label className='text-base font-medium'>
												Incident Type
											</Label>
											<div className='grid grid-cols-2 gap-3'>
												<div
													className={`border rounded-lg p-4 cursor-pointer transition-colors ${
														field.state.value ===
														'unplanned'
															? 'border-red-500 bg-red-50 dark:bg-red-950/20'
															: 'border-border hover:bg-muted'
													}`}
													onClick={() =>
														field.handleChange(
															'unplanned',
														)
													}
												>
													<div className='flex items-center space-x-2'>
														<input
															type='radio'
															checked={
																field.state
																	.value ===
																'unplanned'
															}
															onChange={() =>
																field.handleChange(
																	'unplanned',
																)
															}
															className='text-red-600'
														/>
														<div>
															<div className='font-medium text-red-600'>
																🚨 Unplanned
																Incident
															</div>
															<div className='text-sm text-muted-foreground'>
																Service
																disruption or
																unexpected issue
															</div>
														</div>
													</div>
												</div>
												<div
													className={`border rounded-lg p-4 cursor-pointer transition-colors ${
														field.state.value ===
														'maintenance'
															? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
															: 'border-border hover:bg-muted'
													}`}
													onClick={() =>
														field.handleChange(
															'maintenance',
														)
													}
												>
													<div className='flex items-center space-x-2'>
														<input
															type='radio'
															checked={
																field.state
																	.value ===
																'maintenance'
															}
															onChange={() =>
																field.handleChange(
																	'maintenance',
																)
															}
															className='text-blue-600'
														/>
														<div>
															<div className='font-medium text-blue-600'>
																🔧 Scheduled
																Maintenance
															</div>
															<div className='text-sm text-muted-foreground'>
																Planned service
																maintenance or
																update
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									)}
								/>

								{/* Basic Information */}
								<div className='grid gap-6'>
									<form.Field
										name='title'
										validators={{
											onChange: validators.required,
										}}
										children={(field) => (
											<div className='space-y-3'>
												<Label
													htmlFor='title'
													className='text-base font-medium'
												>
													Incident Title *
												</Label>
												<Input
													id='title'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='Brief, descriptive title for the incident'
													className='text-lg p-4 h-12'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
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
											<div className='space-y-3'>
												<Label
													htmlFor='description'
													className='text-base font-medium'
												>
													Detailed Description *
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
													placeholder='Provide comprehensive details about the incident, including symptoms, impact, and current status...'
													rows={6}
													className='text-base'
												/>
												<div className='text-sm text-muted-foreground'>
													Support for rich text
													formatting. Include any
													relevant technical details.
												</div>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								</div>

								{/* Severity Selection */}
								<form.Field
									name='severity'
									children={(field) => (
										<div className='space-y-3'>
											<Label className='text-base font-medium'>
												Severity Level
											</Label>
											<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
												{Object.entries(
													getSeverityBadge('')
														.constructor === Object
														? {
																critical:
																	getSeverityBadge(
																		'critical',
																	),
																high: getSeverityBadge(
																	'high',
																),
																medium: getSeverityBadge(
																	'medium',
																),
																low: getSeverityBadge(
																	'low',
																),
															}
														: {},
												).map(
													([severity, config]: [
														string,
														any,
													]) => (
														<div
															key={severity}
															className={`border rounded-lg p-4 cursor-pointer transition-colors ${
																field.state
																	.value ===
																severity
																	? `border-current bg-current/5`
																	: 'border-border hover:bg-muted'
															}`}
															onClick={() =>
																field.handleChange(
																	severity,
																)
															}
														>
															<div className='flex items-center space-x-3'>
																<input
																	type='radio'
																	checked={
																		field
																			.state
																			.value ===
																		severity
																	}
																	onChange={() =>
																		field.handleChange(
																			severity,
																		)
																	}
																/>
																<div className='flex-1'>
																	<div className='flex items-center gap-2 mb-1'>
																		<div
																			className={`w-2 h-2 rounded-full ${config.color}`}
																		/>
																		<Badge
																			variant={
																				config.variant
																			}
																			className='capitalize'
																		>
																			{
																				severity
																			}
																		</Badge>
																	</div>
																	<div className='text-sm text-muted-foreground'>
																		{
																			config.description
																		}
																	</div>
																</div>
															</div>
														</div>
													),
												)}
											</div>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								{/* Affected Services */}
								{endpoints.length > 0 && (
									<form.Field
										name='endpoint_ids'
										children={(field) => (
											<div className='space-y-3'>
												<Label className='text-base font-medium'>
													Affected Services
													(Multi-select)
												</Label>
												<Card className='max-h-64 overflow-y-auto'>
													<CardContent className='p-4'>
														<div className='grid grid-cols-1 gap-3'>
															{endpoints.map(
																(
																	endpoint: any,
																) => (
																	<label
																		key={
																			endpoint.id
																		}
																		className='flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer'
																	>
																		<Checkbox
																			checked={field.state.value.includes(
																				endpoint.id,
																			)}
																			onCheckedChange={(
																				checked,
																			) => {
																				const currentIds =
																					field
																						.state
																						.value ||
																					[]
																				if (
																					checked
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
																		/>
																		<div className='flex-1'>
																			<div className='font-medium'>
																				{
																					endpoint.name
																				}
																			</div>
																			<div className='text-sm text-muted-foreground'>
																				{
																					endpoint.url
																				}
																			</div>
																		</div>
																		<Badge
																			variant='outline'
																			className='text-xs'
																		>
																			{endpoint.status ||
																				'Unknown'}
																		</Badge>
																	</label>
																),
															)}
														</div>
													</CardContent>
												</Card>
												<div className='text-sm text-muted-foreground'>
													Select all services that are
													affected by this incident.
													This helps with impact
													assessment.
												</div>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='communication' className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									📢 Public Communication
								</CardTitle>
								<CardDescription>
									Configure how this incident will be
									communicated publicly
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-6'>
								{/* Publication Settings */}
								<div className='grid gap-6'>
									<form.Field
										name='publish_to_status_page'
										children={(field) => (
											<div className='flex items-center justify-between'>
												<div className='space-y-1'>
													<Label
														htmlFor='publish_toggle'
														className='text-base font-medium'
													>
														Publish to Status Page
													</Label>
													<div className='text-sm text-muted-foreground'>
														Make this incident
														visible on your public
														status page
													</div>
												</div>
												<Switch
													id='publish_toggle'
													checked={field.state.value}
													onCheckedChange={
														field.handleChange
													}
												/>
											</div>
										)}
									/>

									<form.Field
										name='public_message'
										children={(field) => (
											<div className='space-y-3'>
												<Label
													htmlFor='public_message'
													className='text-base font-medium'
												>
													Public Message Template
												</Label>
												<Textarea
													id='public_message'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													placeholder='Write a customer-friendly message about this incident...'
													rows={4}
													className='text-base'
												/>
												<div className='text-sm text-muted-foreground'>
													This message will be
													displayed to your users on
													the status page. Keep it
													clear and informative.
												</div>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>

									{/* Notification Channels */}
									<form.Field
										name='notification_channels'
										children={(field) => (
											<div className='space-y-3'>
												<Label className='text-base font-medium'>
													Notification Channels
												</Label>
												<div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
													{[
														'email',
														'slack',
														'discord',
														'webhook',
													].map((channel) => (
														<label
															key={channel}
															className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted'
														>
															<Checkbox
																checked={field.state.value.includes(
																	channel,
																)}
																onCheckedChange={(
																	checked,
																) => {
																	const current =
																		field
																			.state
																			.value ||
																		[]
																	if (
																		checked
																	) {
																		field.handleChange(
																			[
																				...current,
																				channel,
																			],
																		)
																	} else {
																		field.handleChange(
																			current.filter(
																				(
																					c: string,
																				) =>
																					c !==
																					channel,
																			),
																		)
																	}
																}}
															/>
															<div className='capitalize font-medium'>
																{channel ===
																'webhook'
																	? '🔗 Webhook'
																	: channel ===
																			'email'
																		? '📧 Email'
																		: channel ===
																				'slack'
																			? '💬 Slack'
																			: channel ===
																					'discord'
																				? '🎮 Discord'
																				: channel}
															</div>
														</label>
													))}
												</div>
												<div className='text-sm text-muted-foreground'>
													Choose which channels to
													notify about this incident
												</div>
											</div>
										)}
									/>

									{/* Publication Scheduling */}
									<div className='border rounded-lg p-4 space-y-4'>
										<form.Field
											name='schedule_publication'
											children={(field) => (
												<div className='flex items-center justify-between'>
													<div>
														<Label className='text-base font-medium'>
															Schedule Publication
														</Label>
														<div className='text-sm text-muted-foreground'>
															Schedule this
															incident to be
															published later
														</div>
													</div>
													<Switch
														checked={
															field.state.value
														}
														onCheckedChange={
															field.handleChange
														}
													/>
												</div>
											)}
										/>

										<form.Field
											name='scheduled_time'
											children={(field) => (
												<form.Subscribe
													selector={(state) =>
														state.values
															.schedule_publication
													}
													children={(
														scheduleEnabled,
													) =>
														scheduleEnabled ? (
															<div className='space-y-2'>
																<Label htmlFor='scheduled_time'>
																	Publication
																	Time
																</Label>
																<Input
																	id='scheduled_time'
																	type='datetime-local'
																	value={
																		field
																			.state
																			.value
																	}
																	onChange={(
																		e,
																	) =>
																		field.handleChange(
																			e
																				.target
																				.value,
																		)
																	}
																	className='w-full'
																/>
															</div>
														) : null
													}
												/>
											)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Save Options */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							💾 Save Options
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
							<form.Field
								name='save_as_draft'
								children={(field) => (
									<div className='flex items-center space-x-2'>
										<Switch
											id='save_as_draft'
											checked={field.state.value}
											onCheckedChange={field.handleChange}
										/>
										<Label
											htmlFor='save_as_draft'
											className='font-medium'
										>
											Save as draft (don't publish yet)
										</Label>
									</div>
								)}
							/>

							<div className='flex gap-3'>
								<Link to='/admin/incidents'>
									<Button
										type='button'
										variant='outline'
										size='lg'
									>
										Cancel
									</Button>
								</Link>
								<Button
									type='submit'
									disabled={isSubmitting}
									size='lg'
									className='min-w-32'
								>
									{isSubmitting && <ButtonLoadingSkeleton />}
									<form.Subscribe
										selector={(state) =>
											state.values.save_as_draft
										}
										children={(isDraft) =>
											isSubmitting
												? isDraft
													? 'Saving Draft...'
													: 'Creating...'
												: isDraft
													? 'Save Draft'
													: 'Create Incident'
										}
									/>
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	)
}
