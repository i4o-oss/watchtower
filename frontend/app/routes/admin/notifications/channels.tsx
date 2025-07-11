import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useForm } from '@tanstack/react-form'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Textarea } from '~/components/ui/textarea'
import { ArrowLeft, Mail, MessageSquare, TestTube, Webhook } from 'lucide-react'
import { ButtonLoadingSkeleton } from '~/lib/lazy'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'
import type { Route } from './+types/channels'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Notification Channels - Admin - Watchtower' },
		{ name: 'description', content: 'Configure notification channels' },
	]
}

export async function clientLoader() {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

	try {
		const response = await fetch(
			`${API_BASE_URL}/api/v1/admin/notifications/channels`,
			{
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			},
		)

		if (response.ok) {
			return await response.json()
		}

		return { channels: [], total: 0 }
	} catch (error) {
		console.error('Error loading notification channels:', error)
		return { channels: [], total: 0 }
	}
}

interface EmailFormData {
	enabled: boolean
	smtp_host: string
	smtp_port: number
	username: string
	password: string
	from_email: string
	from_name: string
	to_emails: string
}

interface SlackFormData {
	enabled: boolean
	webhook_url: string
	channel: string
	username: string
}

interface DiscordFormData {
	enabled: boolean
	webhook_url: string
	username: string
}

interface WebhookFormData {
	enabled: boolean
	webhook_url: string
	headers: string
}

export default function NotificationChannels({
	loaderData,
}: Route.ComponentProps) {
	const { channels } = loaderData
	const [activeTab, setActiveTab] = useState('email')
	const [testStatus, setTestStatus] = useState<
		Record<string, 'idle' | 'testing'>
	>({})
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	// Email Form
	const emailForm = useForm({
		defaultValues: {
			enabled: false,
			smtp_host: '',
			smtp_port: 587,
			username: '',
			password: '',
			from_email: '',
			from_name: 'Watchtower',
			to_emails: '',
		} as EmailFormData,
		onSubmit: async ({ value }) => {
			const emailData = {
				...value,
				to_emails: value.to_emails
					.split(',')
					.map((email) => email.trim()),
			}
			await saveChannelConfiguration('email', emailData)
		},
	})

	// Slack Form
	const slackForm = useForm({
		defaultValues: {
			enabled: false,
			webhook_url: '',
			channel: '',
			username: 'Watchtower',
		} as SlackFormData,
		onSubmit: async ({ value }) => {
			await saveChannelConfiguration('slack', value)
		},
	})

	// Discord Form
	const discordForm = useForm({
		defaultValues: {
			enabled: false,
			webhook_url: '',
			username: 'Watchtower',
		} as DiscordFormData,
		onSubmit: async ({ value }) => {
			await saveChannelConfiguration('discord', value)
		},
	})

	// Webhook Form
	const webhookForm = useForm({
		defaultValues: {
			enabled: false,
			webhook_url: '',
			headers: '{}',
		} as WebhookFormData,
		onSubmit: async ({ value }) => {
			let headers = {}
			try {
				headers = JSON.parse(value.headers || '{}')
			} catch {
				errorToast('Invalid Headers', 'Headers must be valid JSON')
				return
			}

			const webhookData = {
				...value,
				headers,
			}
			await saveChannelConfiguration('webhook', webhookData)
		},
	})

	const testChannel = async (providerType: string) => {
		setTestStatus((prev) => ({ ...prev, [providerType]: 'testing' }))

		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/notifications/test`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						provider_type: providerType,
					}),
				},
			)

			if (response.ok) {
				successToast(
					'Test Successful',
					`Test notification sent successfully via ${providerType}`,
				)
			} else {
				const error = await response.json()
				errorToast('Test Failed', `Test failed: ${error.error}`)
			}
		} catch (error) {
			errorToast(
				'Network Error',
				`Network error testing ${providerType} channel`,
			)
		} finally {
			setTestStatus((prev) => ({ ...prev, [providerType]: 'idle' }))
		}
	}

	const saveChannelConfiguration = async (type: string, data: any) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/admin/notifications/channels`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type,
						name: type,
						enabled: data.enabled,
						settings: data,
					}),
				},
			)

			if (response.ok) {
				successToast(
					'Configuration Saved',
					`${type} configuration saved successfully`,
				)
				return true
			} else {
				const error = await response.json()
				const errorMessage = getApiErrorMessage(error)
				errorToast(
					'Save Failed',
					`Failed to save ${type} configuration: ${errorMessage}`,
				)
				return false
			}
		} catch (error) {
			errorToast(
				'Network Error',
				`Network error saving ${type} configuration`,
			)
			return false
		}
	}

	return (
		<div>
			<div className='flex items-center gap-4 mb-8'>
				<Link to='/admin/notifications'>
					<Button variant='ghost' size='sm'>
						<ArrowLeft className='h-4 w-4' />
					</Button>
				</Link>
				<div>
					<h1 className='text-3xl font-bold'>
						Notification Channels
					</h1>
					<p className='text-muted-foreground'>
						Configure email, Slack, Discord, and webhook
						notifications
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Channel Configuration</CardTitle>
					<CardDescription>
						Configure your notification channels and test them
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className='grid w-full grid-cols-4'>
							<TabsTrigger value='email'>
								<Mail className='h-4 w-4 mr-2' />
								Email
							</TabsTrigger>
							<TabsTrigger value='slack'>
								<MessageSquare className='h-4 w-4 mr-2' />
								Slack
							</TabsTrigger>
							<TabsTrigger value='discord'>
								<MessageSquare className='h-4 w-4 mr-2' />
								Discord
							</TabsTrigger>
							<TabsTrigger value='webhook'>
								<Webhook className='h-4 w-4 mr-2' />
								Webhook
							</TabsTrigger>
						</TabsList>

						{/* Email Configuration */}
						<TabsContent value='email' className='space-y-4'>
							<div className='flex items-center justify-between'>
								<div>
									<h3 className='text-lg font-medium'>
										Email Configuration
									</h3>
									<p className='text-sm text-muted-foreground'>
										Configure SMTP settings for email
										notifications
									</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={() => testChannel('email')}
									disabled={testStatus.email === 'testing'}
								>
									{testStatus.email === 'testing' ? (
										<>
											<ButtonLoadingSkeleton />
											Testing...
										</>
									) : (
										<>
											<TestTube className='h-4 w-4 mr-2' />
											Test
										</>
									)}
								</Button>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									emailForm.handleSubmit()
								}}
								className='space-y-4'
							>
								<emailForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-2'>
											<Switch
												id='email-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label htmlFor='email-enabled'>
												Enable Email Notifications
											</Label>
										</div>
									)}
								/>

								<div className='grid grid-cols-2 gap-4'>
									<emailForm.Field
										name='smtp_host'
										validators={{
											onChange: validators.required,
										}}
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='smtp-host'>
													SMTP Host *
												</Label>
												<Input
													id='smtp-host'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='smtp.gmail.com'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>

									<emailForm.Field
										name='smtp_port'
										validators={{
											onChange: combineValidators(
												validators.required,
												validators.number,
												validators.positive,
											),
										}}
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='smtp-port'>
													SMTP Port *
												</Label>
												<Input
													id='smtp-port'
													type='number'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															Number(
																e.target.value,
															),
														)
													}
													onBlur={field.handleBlur}
													placeholder='587'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<emailForm.Field
										name='username'
										validators={{
											onChange: validators.required,
										}}
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='smtp-username'>
													Username *
												</Label>
												<Input
													id='smtp-username'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='your-email@gmail.com'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>

									<emailForm.Field
										name='password'
										validators={{
											onChange: validators.required,
										}}
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='smtp-password'>
													Password *
												</Label>
												<Input
													id='smtp-password'
													type='password'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='your-app-password'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<emailForm.Field
										name='from_email'
										validators={{
											onChange: combineValidators(
												validators.required,
												validators.email,
											),
										}}
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='from-email'>
													From Email *
												</Label>
												<Input
													id='from-email'
													type='email'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='watchtower@yourdomain.com'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>

									<emailForm.Field
										name='from_name'
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='from-name'>
													From Name
												</Label>
												<Input
													id='from-name'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='Watchtower'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								</div>

								<emailForm.Field
									name='to_emails'
									validators={{
										onChange: validators.required,
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='to-emails'>
												To Emails *
											</Label>
											<Input
												id='to-emails'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='admin@yourdomain.com, alerts@yourdomain.com'
											/>
											<p className='text-xs text-muted-foreground'>
												Separate multiple emails with
												commas
											</p>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<Button
									type='submit'
									disabled={emailForm.state.isSubmitting}
								>
									{emailForm.state.isSubmitting && (
										<ButtonLoadingSkeleton />
									)}
									{emailForm.state.isSubmitting
										? 'Saving...'
										: 'Save Email Configuration'}
								</Button>
							</form>
						</TabsContent>

						{/* Slack Configuration */}
						<TabsContent value='slack' className='space-y-4'>
							<div className='flex items-center justify-between'>
								<div>
									<h3 className='text-lg font-medium'>
										Slack Configuration
									</h3>
									<p className='text-sm text-muted-foreground'>
										Configure Slack webhook for
										notifications
									</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={() => testChannel('slack')}
									disabled={testStatus.slack === 'testing'}
								>
									{testStatus.slack === 'testing' ? (
										<>
											<ButtonLoadingSkeleton />
											Testing...
										</>
									) : (
										<>
											<TestTube className='h-4 w-4 mr-2' />
											Test
										</>
									)}
								</Button>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									slackForm.handleSubmit()
								}}
								className='space-y-4'
							>
								<slackForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-2'>
											<Switch
												id='slack-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label htmlFor='slack-enabled'>
												Enable Slack Notifications
											</Label>
										</div>
									)}
								/>

								<slackForm.Field
									name='webhook_url'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.url,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='slack-webhook'>
												Webhook URL *
											</Label>
											<Input
												id='slack-webhook'
												type='url'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='https://hooks.slack.com/services/...'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<div className='grid grid-cols-2 gap-4'>
									<slackForm.Field
										name='channel'
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='slack-channel'>
													Channel
												</Label>
												<Input
													id='slack-channel'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='#alerts'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>

									<slackForm.Field
										name='username'
										children={(field) => (
											<div className='space-y-2'>
												<Label htmlFor='slack-username'>
													Username
												</Label>
												<Input
													id='slack-username'
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(
															e.target.value,
														)
													}
													onBlur={field.handleBlur}
													placeholder='Watchtower'
												/>
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											</div>
										)}
									/>
								</div>

								<Button
									type='submit'
									disabled={slackForm.state.isSubmitting}
								>
									{slackForm.state.isSubmitting && (
										<ButtonLoadingSkeleton />
									)}
									{slackForm.state.isSubmitting
										? 'Saving...'
										: 'Save Slack Configuration'}
								</Button>
							</form>
						</TabsContent>

						{/* Discord Configuration */}
						<TabsContent value='discord' className='space-y-4'>
							<div className='flex items-center justify-between'>
								<div>
									<h3 className='text-lg font-medium'>
										Discord Configuration
									</h3>
									<p className='text-sm text-muted-foreground'>
										Configure Discord webhook for
										notifications
									</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={() => testChannel('discord')}
									disabled={testStatus.discord === 'testing'}
								>
									{testStatus.discord === 'testing' ? (
										<>
											<ButtonLoadingSkeleton />
											Testing...
										</>
									) : (
										<>
											<TestTube className='h-4 w-4 mr-2' />
											Test
										</>
									)}
								</Button>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									discordForm.handleSubmit()
								}}
								className='space-y-4'
							>
								<discordForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-2'>
											<Switch
												id='discord-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label htmlFor='discord-enabled'>
												Enable Discord Notifications
											</Label>
										</div>
									)}
								/>

								<discordForm.Field
									name='webhook_url'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.url,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='discord-webhook'>
												Webhook URL *
											</Label>
											<Input
												id='discord-webhook'
												type='url'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='https://discord.com/api/webhooks/...'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<discordForm.Field
									name='username'
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='discord-username'>
												Username
											</Label>
											<Input
												id='discord-username'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='Watchtower'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<Button
									type='submit'
									disabled={discordForm.state.isSubmitting}
								>
									{discordForm.state.isSubmitting && (
										<ButtonLoadingSkeleton />
									)}
									{discordForm.state.isSubmitting
										? 'Saving...'
										: 'Save Discord Configuration'}
								</Button>
							</form>
						</TabsContent>

						{/* Webhook Configuration */}
						<TabsContent value='webhook' className='space-y-4'>
							<div className='flex items-center justify-between'>
								<div>
									<h3 className='text-lg font-medium'>
										Webhook Configuration
									</h3>
									<p className='text-sm text-muted-foreground'>
										Configure custom webhook for
										notifications
									</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={() => testChannel('webhook')}
									disabled={testStatus.webhook === 'testing'}
								>
									{testStatus.webhook === 'testing' ? (
										<>
											<ButtonLoadingSkeleton />
											Testing...
										</>
									) : (
										<>
											<TestTube className='h-4 w-4 mr-2' />
											Test
										</>
									)}
								</Button>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									webhookForm.handleSubmit()
								}}
								className='space-y-4'
							>
								<webhookForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-2'>
											<Switch
												id='webhook-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label htmlFor='webhook-enabled'>
												Enable Webhook Notifications
											</Label>
										</div>
									)}
								/>

								<webhookForm.Field
									name='webhook_url'
									validators={{
										onChange: combineValidators(
											validators.required,
											validators.url,
										),
									}}
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='webhook-url'>
												Webhook URL *
											</Label>
											<Input
												id='webhook-url'
												type='url'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='https://your-webhook-endpoint.com/webhook'
											/>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<webhookForm.Field
									name='headers'
									children={(field) => (
										<div className='space-y-2'>
											<Label htmlFor='webhook-headers'>
												Headers (JSON)
											</Label>
											<Textarea
												id='webhook-headers'
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(
														e.target.value,
													)
												}
												onBlur={field.handleBlur}
												placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
												rows={4}
											/>
											<p className='text-xs text-muted-foreground'>
												Optional HTTP headers as JSON
												object
											</p>
											<FieldError
												errors={field.state.meta.errors}
											/>
										</div>
									)}
								/>

								<Button
									type='submit'
									disabled={webhookForm.state.isSubmitting}
								>
									{webhookForm.state.isSubmitting && (
										<ButtonLoadingSkeleton />
									)}
									{webhookForm.state.isSubmitting
										? 'Saving...'
										: 'Save Webhook Configuration'}
								</Button>
							</form>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
