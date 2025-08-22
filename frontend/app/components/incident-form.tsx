import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from '@tanstack/react-form'
import { Button } from '~/components/ui/button'
import { CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
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
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { getApiErrorMessage } from '~/lib/validation'
import { validators, FieldError } from '~/lib/form-utils'
import { Check } from 'lucide-react'

export interface IncidentFormData {
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

interface IncidentFormProps {
	mode: 'create' | 'edit'
	initialValues?: Partial<IncidentFormData>
	onSubmit: (data: IncidentFormData) => Promise<void>
	cancelPath: string
	title: string
	description: string
	endpoints?: any[]
}

export function IncidentForm({
	mode,
	initialValues = {},
	onSubmit,
	cancelPath,
	title,
	description,
	endpoints = [],
}: IncidentFormProps) {
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			title: initialValues.title || '',
			description: initialValues.description || '',
			severity: initialValues.severity || 'medium',
			status: initialValues.status || 'open',
			endpoint_ids: initialValues.endpoint_ids || [],
			incident_type: initialValues.incident_type || 'unplanned',
			public_message: initialValues.public_message || '',
			publish_to_status_page:
				initialValues.publish_to_status_page || false,
			notification_channels: initialValues.notification_channels || [],
			save_as_draft: initialValues.save_as_draft || false,
			schedule_publication: initialValues.schedule_publication || false,
			scheduled_time: initialValues.scheduled_time || '',
		} as IncidentFormData,
		onSubmit: async ({ value }) => {
			setError(null)

			try {
				await onSubmit(value)
			} catch (error) {
				console.error('Error submitting incident form:', error)
				const errorMessage =
					'Network error occurred. Please check your connection and try again.'
				setError(errorMessage)
				errorToast('Network Error', errorMessage)
			}
		},
	})

	const getSeverityConfig = (severity: string) => {
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
		<main className='flex flex-col gap-6'>
			<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
				<PageHeader title={title} description={description} />

				<CardContent className='p-0 gap-0 flex flex-col'>
					<form
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='p-6 space-y-6'
					>
						{error && (
							<Alert variant='destructive'>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Incident Type */}
						<form.Field name='incident_type'>
							{(field) => (
								<div className='space-y-3'>
									<Label className='text-base font-medium'>
										Incident Type
									</Label>
									<div className='grid grid-cols-2 gap-4'>
										<div
											className={`border rounded-lg p-4 cursor-pointer transition-colors ${
												field.state.value ===
												'unplanned'
													? 'border-red-500 bg-red-50 dark:bg-red-950/20'
													: 'border-border hover:bg-muted'
											}`}
											onClick={() =>
												field.handleChange('unplanned')
											}
											onKeyDown={() =>
												field.handleChange('unplanned')
											}
										>
											<div className='flex items-center space-x-2'>
												<input
													type='radio'
													checked={
														field.state.value ===
														'unplanned'
													}
													onChange={() =>
														field.handleChange(
															'unplanned',
														)
													}
													className='text-red-600 hidden'
												/>
												<div>
													<div className='font-medium text-red-600'>
														Unplanned Incident
													</div>
													<div className='text-sm text-muted-foreground'>
														Service disruption or
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
											onKeyDown={() =>
												field.handleChange(
													'maintenance',
												)
											}
										>
											<div className='flex items-center space-x-2'>
												<input
													type='radio'
													checked={
														field.state.value ===
														'maintenance'
													}
													onChange={() =>
														field.handleChange(
															'maintenance',
														)
													}
													className='text-blue-600 hidden'
												/>
												<div>
													<div className='font-medium text-blue-600'>
														Scheduled Maintenance
													</div>
													<div className='text-sm text-muted-foreground'>
														Planned service
														maintenance or update
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							)}
						</form.Field>

						{/* Basic Information */}
						<form.Field
							name='title'
							validators={{
								onChange: validators.required,
							}}
						>
							{(field) => (
								<div className='space-y-2'>
									<Label htmlFor='title'>Title *</Label>
									<Input
										id='title'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder='Brief, descriptive title for the incident'
										required
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>

						<form.Field
							name='description'
							validators={{
								onChange: validators.required,
							}}
						>
							{(field) => (
								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description *
									</Label>
									<Textarea
										id='description'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder='Provide comprehensive details about the incident...'
										rows={4}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>

						{/* Severity Selection */}
						<form.Field name='severity'>
							{(field) => (
								<div className='space-y-3'>
									<Label className='text-base font-medium'>
										Severity Level
									</Label>
									<div className='grid grid-cols-2 gap-3'>
										{Object.entries({
											critical:
												getSeverityConfig('critical'),
											high: getSeverityConfig('high'),
											medium: getSeverityConfig('medium'),
											low: getSeverityConfig('low'),
										}).map(([severity, config]) => (
											<div
												key={severity}
												className={`border rounded-lg p-4 cursor-pointer transition-colors ${
													field.state.value ===
													severity
														? 'border-current bg-current/5'
														: 'border-border hover:bg-muted'
												}`}
												onClick={() =>
													field.handleChange(severity)
												}
												onKeyDown={() =>
													field.handleChange(severity)
												}
											>
												<div className='flex items-center space-x-3'>
													<input
														className='hidden'
														type='radio'
														checked={
															field.state
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
															<Badge
																variant={
																	config.variant
																}
																className='font-mono uppercase'
															>
																{severity}
															</Badge>
														</div>
														<div className='text-sm text-muted-foreground'>
															{config.description}
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</form.Field>

						{/* Affected Services */}
						{endpoints.length > 0 && (
							<form.Field name='endpoint_ids'>
								{(field) => (
									<div className='space-y-3'>
										<Label className='text-base font-medium'>
											Affected Services
										</Label>
										<div className='max-h-48 overflow-y-auto'>
											<div className='space-y-2'>
												{endpoints.map(
													(endpoint: any) => (
														<div
															key={endpoint.id}
															className='flex items-center space-x-3 py-2 rounded hover:bg-muted cursor-pointer'
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
																<div className='text-sm text-muted-foreground font-mono'>
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
														</div>
													),
												)}
											</div>
										</div>
									</div>
								)}
							</form.Field>
						)}

						{/* Public Message */}
						{/*<form.Field name="public_message">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="public_message">Public Message</Label>
                  <Textarea
                    id="public_message"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Write a customer-friendly message about this incident..."
                    rows={3}
                  />
                  <div className="text-sm text-muted-foreground">
                    This message will be displayed to users on the status page
                  </div>
                </div>
              )}
            </form.Field>*/}

						{/* Communication Settings */}
						{/*<div className="space-y-4">
              <form.Field name="publish_to_status_page">
                {(field) => (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">
                        Publish to Status Page
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        Make this incident visible on your public status page
                      </div>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="notification_channels">
                {(field) => (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      Notification Channels
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          id: "email",
                          label: "📧 Email",
                        },
                        {
                          id: "slack",
                          label: "💬 Slack",
                        },
                        {
                          id: "discord",
                          label: "🎮 Discord",
                        },
                        {
                          id: "webhook",
                          label: "🔗 Webhook",
                        },
                      ].map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted"
                        >
                          <Checkbox
                            checked={field.state.value.includes(channel.id)}
                            onCheckedChange={(checked) => {
                              const current = field.state.value || [];
                              if (checked) {
                                field.handleChange([...current, channel.id]);
                              } else {
                                field.handleChange(
                                  current.filter(
                                    (c: string) => c !== channel.id
                                  )
                                );
                              }
                            }}
                          />
                          <div className="font-medium">{channel.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name="schedule_publication">
                {(field) => (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">
                          Schedule Publication
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          Schedule this incident to be published later
                        </div>
                      </div>
                      <Switch
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                    {field.state.value && (
                      <form.Field name="scheduled_time">
                        {(timeField) => (
                          <div className="space-y-2">
                            <Label htmlFor="scheduled_time">
                              Publication Time
                            </Label>
                            <Input
                              id="scheduled_time"
                              type="datetime-local"
                              value={timeField.state.value}
                              onChange={(e) =>
                                timeField.handleChange(e.target.value)
                              }
                            />
                          </div>
                        )}
                      </form.Field>
                    )}
                  </div>
                )}
              </form.Field>
            </div>*/}

						{/*<div className="flex flex-col sm:flex-row justify-center sm:justify-between gap-3 pt-8 border-t border-border/50">*/}
						<div className='flex flex-col sm:flex-row justify-end gap-4'>
							{/*<form.Field name="save_as_draft">
                {(field) => (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="save_as_draft"
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                    />
                    <Label htmlFor="save_as_draft">Save as draft</Label>
                  </div>
                )}
              </form.Field>*/}
							<div className='flex items-center gap-2'>
								<Link to={cancelPath}>
									<Button
										type='button'
										variant='outline'
										size='lg'
										className='w-full sm:w-auto'
									>
										Cancel
									</Button>
								</Link>
								<Button
									type='submit'
									size='lg'
									className='gap-2 shadow-lg w-full sm:w-auto'
									disabled={form.state.isSubmitting}
								>
									{form.state.isSubmitting ? (
										<>
											<ButtonLoadingSkeleton />
											<form.Subscribe
												selector={(state) =>
													state.values.save_as_draft
												}
											>
												{(isDraft) =>
													isDraft
														? 'Saving Draft...'
														: mode === 'create'
															? 'Creating...'
															: 'Updating...'
												}
											</form.Subscribe>
										</>
									) : (
										<>
											<Check className='h-4 w-4' />
											<form.Subscribe
												selector={(state) =>
													state.values.save_as_draft
												}
											>
												{(isDraft) =>
													isDraft
														? 'Save Draft'
														: mode === 'create'
															? 'Create Incident'
															: 'Update Incident'
												}
											</form.Subscribe>
										</>
									)}
								</Button>
							</div>
						</div>
					</form>
				</CardContent>
			</PageContent>
		</main>
	)
}
