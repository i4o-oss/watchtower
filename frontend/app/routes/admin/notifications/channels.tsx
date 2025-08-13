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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	ArrowLeft,
	Mail,
	MessageSquare,
	TestTube,
	Webhook,
	Eye,
	EyeOff,
	Shield,
	AlertCircle,
	CheckCircle2,
	Clock,
	Zap,
	Settings,
} from 'lucide-react'
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
		Record<string, 'idle' | 'testing' | 'success' | 'error'>
	>({})
	const [showPassword, setShowPassword] = useState(false)
	const [showWebhookUrl, setShowWebhookUrl] = useState<
		Record<string, boolean>
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
			headers: JSON.stringify(
				{
					'Content-Type': 'application/json',
					'User-Agent': 'Watchtower/1.0',
				},
				null,
				2,
			),
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
				setTestStatus((prev) => ({
					...prev,
					[providerType]: 'success',
				}))
				successToast(
					'Test Successful',
					`Test notification sent successfully via ${providerType}`,
				)
			} else {
				const error = await response.json()
				setTestStatus((prev) => ({ ...prev, [providerType]: 'error' }))
				errorToast('Test Failed', `Test failed: ${error.error}`)
			}
		} catch (error) {
			setTestStatus((prev) => ({ ...prev, [providerType]: 'error' }))
			errorToast(
				'Network Error',
				`Network error testing ${providerType} channel`,
			)
		} finally {
			setTimeout(() => {
				setTestStatus((prev) => ({ ...prev, [providerType]: 'idle' }))
			}, 3000)
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
		<div className='space-y-6'>
			<div className='flex items-center gap-4'>
				<Link to='/admin/notifications'>
					<Button variant='ghost' size='sm'>
						<ArrowLeft className='h-4 w-4' />
					</Button>
				</Link>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Channel Configuration
					</h1>
					<p className='text-muted-foreground'>
						Set up and test your notification channels
					</p>
				</div>
			</div>

			<Card className='overflow-hidden'>
				<CardContent className='p-0'>
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<div className='border-b bg-muted/30'>
							<TabsList className='grid w-full grid-cols-4 h-auto bg-transparent p-0'>
								<TabsTrigger
									value='email'
									className='flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500'
								>
									<div className='p-2 rounded-lg bg-blue-100'>
										<Mail className='h-4 w-4 text-blue-600' />
									</div>
									<div className='text-left'>
										<div className='font-medium'>Email</div>
										<div className='text-xs text-muted-foreground'>
											SMTP Configuration
										</div>
									</div>
								</TabsTrigger>
								<TabsTrigger
									value='slack'
									className='flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-green-500'
								>
									<div className='p-2 rounded-lg bg-green-100'>
										<MessageSquare className='h-4 w-4 text-green-600' />
									</div>
									<div className='text-left'>
										<div className='font-medium'>Slack</div>
										<div className='text-xs text-muted-foreground'>
											Webhook Integration
										</div>
									</div>
								</TabsTrigger>
								<TabsTrigger
									value='discord'
									className='flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500'
								>
									<div className='p-2 rounded-lg bg-purple-100'>
										<MessageSquare className='h-4 w-4 text-purple-600' />
									</div>
									<div className='text-left'>
										<div className='font-medium'>
											Discord
										</div>
										<div className='text-xs text-muted-foreground'>
											Webhook Integration
										</div>
									</div>
								</TabsTrigger>
								<TabsTrigger
									value='webhook'
									className='flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500'
								>
									<div className='p-2 rounded-lg bg-orange-100'>
										<Webhook className='h-4 w-4 text-orange-600' />
									</div>
									<div className='text-left'>
										<div className='font-medium'>
											Webhook
										</div>
										<div className='text-xs text-muted-foreground'>
											Generic HTTP
										</div>
									</div>
								</TabsTrigger>
							</TabsList>
						</div>

						{/* Email Configuration */}
						<TabsContent value='email' className='space-y-6 p-6'>
							<div className='flex items-center justify-between'>
								<div className='space-y-1'>
									<h3 className='text-xl font-semibold'>
										Email SMTP Setup
									</h3>
									<p className='text-muted-foreground'>
										Configure SMTP settings for reliable
										email delivery
									</p>
								</div>
								<div className='flex items-center gap-2'>
									{testStatus.email === 'success' && (
										<Badge
											variant='default'
											className='bg-green-100 text-green-800 border-green-200'
										>
											<CheckCircle2 className='h-3 w-3 mr-1' />
											Test Passed
										</Badge>
									)}
									{testStatus.email === 'error' && (
										<Badge variant='destructive'>
											<AlertCircle className='h-3 w-3 mr-1' />
											Test Failed
										</Badge>
									)}
									<Button
										variant='outline'
										size='sm'
										onClick={() => testChannel('email')}
										disabled={
											testStatus.email === 'testing'
										}
									>
										{testStatus.email === 'testing' ? (
											<>
												<ButtonLoadingSkeleton />
												Testing...
											</>
										) : (
											<>
												<TestTube className='h-4 w-4' />
												Test Delivery
											</>
										)}
									</Button>
								</div>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									emailForm.handleSubmit()
								}}
								className='space-y-6'
							>
								<emailForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-3'>
											<Switch
												id='email-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label
												htmlFor='email-enabled'
												className='text-base font-medium'
											>
												Enable Email Notifications
											</Label>
										</div>
									)}
								/>

								{/* SMTP Configuration */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											SMTP Configuration
										</CardTitle>
										<CardDescription>
											Server settings and authentication
										</CardDescription>
									</CardHeader>
									<CardContent className='space-y-4'>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											<emailForm.Field
												name='smtp_host'
												validators={{
													onChange:
														validators.required,
												}}
												children={(field) => (
													<div className='space-y-2'>
														<Label htmlFor='smtp-host'>
															SMTP Host *
														</Label>
														<Input
															id='smtp-host'
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='smtp.gmail.com'
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

											<emailForm.Field
												name='smtp_port'
												validators={{
													onChange: combineValidators(
														validators.required,
														validators.smtpPort,
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
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	Number(
																		e.target
																			.value,
																	),
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='587'
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
										</div>

										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											<emailForm.Field
												name='username'
												validators={{
													onChange:
														validators.required,
												}}
												children={(field) => (
													<div className='space-y-2'>
														<Label htmlFor='smtp-username'>
															Username *
														</Label>
														<Input
															id='smtp-username'
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='your-email@gmail.com'
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

											<emailForm.Field
												name='password'
												validators={{
													onChange:
														validators.required,
												}}
												children={(field) => (
													<div className='space-y-2'>
														<Label htmlFor='smtp-password'>
															Password *
														</Label>
														<div className='relative'>
															<Input
																id='smtp-password'
																type={
																	showPassword
																		? 'text'
																		: 'password'
																}
																value={
																	field.state
																		.value
																}
																onChange={(e) =>
																	field.handleChange(
																		e.target
																			.value,
																	)
																}
																onBlur={
																	field.handleBlur
																}
																placeholder='your-app-password'
																className='pr-10'
															/>
															<Button
																type='button'
																variant='ghost'
																size='sm'
																className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
																onClick={() =>
																	setShowPassword(
																		!showPassword,
																	)
																}
															>
																{showPassword ? (
																	<EyeOff className='h-4 w-4' />
																) : (
																	<Eye className='h-4 w-4' />
																)}
															</Button>
														</div>
														<FieldError
															errors={
																field.state.meta
																	.errors
															}
														/>
													</div>
												)}
											/>
										</div>

										{/* Security Options */}
										<div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
											<div className='flex items-center gap-2 mb-2'>
												<Shield className='h-4 w-4 text-green-600' />
												<span className='font-medium text-green-800'>
													Security Recommendations
												</span>
											</div>
											<ul className='text-sm text-green-700 space-y-1'>
												<li>
													• Port 587 with STARTTLS is
													recommended
												</li>
												<li>
													• Port 465 for SSL/TLS, Port
													25 for unencrypted (not
													recommended)
												</li>
												<li>
													• Use App Passwords for
													Gmail, Yahoo, and other
													providers when 2FA is
													enabled
												</li>
											</ul>
										</div>
									</CardContent>
								</Card>

								{/* Sender Configuration */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Sender Information
										</CardTitle>
										<CardDescription>
											Configure how emails appear to
											recipients
										</CardDescription>
									</CardHeader>
									<CardContent className='space-y-4'>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='watchtower@yourdomain.com'
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

											<emailForm.Field
												name='from_name'
												children={(field) => (
													<div className='space-y-2'>
														<Label htmlFor='from-name'>
															From Name
														</Label>
														<Input
															id='from-name'
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='Watchtower'
														/>
													</div>
												)}
											/>
										</div>

										<emailForm.Field
											name='to_emails'
											validators={{
												onChange: combineValidators(
													validators.required,
													validators.emailList,
												),
											}}
											children={(field) => (
												<div className='space-y-2'>
													<Label htmlFor='to-emails'>
														Recipient Emails *
													</Label>
													<Textarea
														id='to-emails'
														value={
															field.state.value
														}
														onChange={(e) =>
															field.handleChange(
																e.target.value,
															)
														}
														onBlur={
															field.handleBlur
														}
														placeholder='admin@yourdomain.com, alerts@yourdomain.com'
														rows={3}
													/>
													<p className='text-xs text-muted-foreground'>
														Separate multiple emails
														with commas. These
														emails will receive all
														notifications.
													</p>
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												</div>
											)}
										/>
									</CardContent>
								</Card>

								<div className='flex items-center gap-3 pt-4'>
									<Button
										type='submit'
										disabled={emailForm.state.isSubmitting}
										className='px-6'
									>
										{emailForm.state.isSubmitting && (
											<ButtonLoadingSkeleton />
										)}
										{emailForm.state.isSubmitting
											? 'Saving...'
											: 'Save Configuration'}
									</Button>
									<Button variant='outline' type='button'>
										Reset to Defaults
									</Button>
								</div>
							</form>
						</TabsContent>

						{/* Slack Configuration */}
						<TabsContent value='slack' className='space-y-6 p-6'>
							<div className='flex items-center justify-between'>
								<div className='space-y-1'>
									<h3 className='text-xl font-semibold'>
										Slack Integration
									</h3>
									<p className='text-muted-foreground'>
										Connect Slack for instant team
										notifications
									</p>
								</div>
								<div className='flex items-center gap-2'>
									{testStatus.slack === 'success' && (
										<Badge
											variant='default'
											className='bg-green-100 text-green-800 border-green-200'
										>
											<CheckCircle2 className='h-3 w-3 mr-1' />
											Test Passed
										</Badge>
									)}
									{testStatus.slack === 'error' && (
										<Badge variant='destructive'>
											<AlertCircle className='h-3 w-3 mr-1' />
											Test Failed
										</Badge>
									)}
									<Button
										variant='outline'
										size='sm'
										onClick={() => testChannel('slack')}
										disabled={
											testStatus.slack === 'testing'
										}
									>
										{testStatus.slack === 'testing' ? (
											<>
												<ButtonLoadingSkeleton />
												Testing...
											</>
										) : (
											<>
												<TestTube className='h-4 w-4' />
												Test Message
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Setup Instructions */}
							<Card>
								<CardHeader>
									<CardTitle className='text-lg'>
										Webhook Setup
									</CardTitle>
									<CardDescription>
										Follow these steps to create a Slack
										webhook
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='space-y-4'>
										<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600'>
													1
												</div>
												<div>
													<h4 className='font-medium'>
														Create App
													</h4>
													<p className='text-sm text-muted-foreground'>
														Go to api.slack.com and
														create a new app
													</p>
												</div>
											</div>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600'>
													2
												</div>
												<div>
													<h4 className='font-medium'>
														Enable Webhooks
													</h4>
													<p className='text-sm text-muted-foreground'>
														Activate incoming
														webhooks in your app
														settings
													</p>
												</div>
											</div>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600'>
													3
												</div>
												<div>
													<h4 className='font-medium'>
														Copy URL
													</h4>
													<p className='text-sm text-muted-foreground'>
														Copy the webhook URL and
														paste it below
													</p>
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									slackForm.handleSubmit()
								}}
								className='space-y-6'
							>
								<slackForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-3'>
											<Switch
												id='slack-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label
												htmlFor='slack-enabled'
												className='text-base font-medium'
											>
												Enable Slack Notifications
											</Label>
										</div>
									)}
								/>

								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Webhook Configuration
										</CardTitle>
										<CardDescription>
											Enter your Slack webhook details
										</CardDescription>
									</CardHeader>
									<CardContent className='space-y-4'>
										<slackForm.Field
											name='webhook_url'
											validators={{
												onChange: combineValidators(
													validators.required,
													validators.slackWebhookUrl,
												),
											}}
											children={(field) => (
												<div className='space-y-2'>
													<Label htmlFor='slack-webhook'>
														Webhook URL *
													</Label>
													<div className='relative'>
														<Input
															id='slack-webhook'
															type={
																showWebhookUrl.slack
																	? 'text'
																	: 'password'
															}
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='https://hooks.slack.com/services/...'
															className='pr-10'
														/>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
															onClick={() =>
																setShowWebhookUrl(
																	(prev) => ({
																		...prev,
																		slack:
																			!prev.slack,
																	}),
																)
															}
														>
															{showWebhookUrl.slack ? (
																<EyeOff className='h-4 w-4' />
															) : (
																<Eye className='h-4 w-4' />
															)}
														</Button>
													</div>
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												</div>
											)}
										/>

										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											<slackForm.Field
												name='channel'
												validators={{
													onChange:
														validators.slackChannel,
												}}
												children={(field) => (
													<div className='space-y-2'>
														<Label htmlFor='slack-channel'>
															Channel Selection
														</Label>
														<Input
															id='slack-channel'
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='#alerts'
														/>
														<p className='text-xs text-muted-foreground'>
															Optional: Override
															webhook default
															channel
														</p>
														<FieldError
															errors={
																field.state.meta
																	.errors
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
															Bot Username
														</Label>
														<Input
															id='slack-username'
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='Watchtower'
														/>
														<p className='text-xs text-muted-foreground'>
															How the bot appears
															in Slack
														</p>
													</div>
												)}
											/>
										</div>
									</CardContent>
								</Card>

								{/* Message Preview */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Message Formatting
										</CardTitle>
										<CardDescription>
											Preview how notifications appear in
											Slack
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='p-4 bg-slate-900 rounded-lg text-white font-mono text-sm'>
											<div className='flex items-center gap-2 mb-2'>
												<div className='w-6 h-6 bg-green-500 rounded flex items-center justify-center text-xs font-bold'>
													W
												</div>
												<span className='font-medium'>
													Watchtower
												</span>
												<span className='text-slate-400 text-xs'>
													BOT
												</span>
												<span className='text-slate-500 text-xs ml-auto'>
													just now
												</span>
											</div>
											<div className='ml-8 space-y-1'>
												<div className='flex items-center gap-2'>
													<span className='text-red-400'>
														🔴
													</span>
													<span>
														<strong>
															Service Down:
														</strong>{' '}
														API Endpoint
													</span>
												</div>
												<div className='text-slate-300 text-sm'>
													https://api.example.com/health
													is unreachable
												</div>
												<div className='text-slate-400 text-xs'>
													Duration: 00:02:34 •
													Response: Timeout
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								<div className='flex items-center gap-3 pt-4'>
									<Button
										type='submit'
										disabled={slackForm.state.isSubmitting}
										className='px-6'
									>
										{slackForm.state.isSubmitting && (
											<ButtonLoadingSkeleton />
										)}
										{slackForm.state.isSubmitting
											? 'Saving...'
											: 'Save Configuration'}
									</Button>
									<Button variant='outline' type='button'>
										Reset to Defaults
									</Button>
								</div>
							</form>
						</TabsContent>

						{/* Discord Configuration */}
						<TabsContent value='discord' className='space-y-6 p-6'>
							<div className='flex items-center justify-between'>
								<div className='space-y-1'>
									<h3 className='text-xl font-semibold'>
										Discord Integration
									</h3>
									<p className='text-muted-foreground'>
										Connect Discord for instant team
										notifications
									</p>
								</div>
								<div className='flex items-center gap-2'>
									{testStatus.discord === 'success' && (
										<Badge
											variant='default'
											className='bg-green-100 text-green-800 border-green-200'
										>
											<CheckCircle2 className='h-3 w-3 mr-1' />
											Test Passed
										</Badge>
									)}
									{testStatus.discord === 'error' && (
										<Badge variant='destructive'>
											<AlertCircle className='h-3 w-3 mr-1' />
											Test Failed
										</Badge>
									)}
									<Button
										variant='outline'
										size='sm'
										onClick={() => testChannel('discord')}
										disabled={
											testStatus.discord === 'testing'
										}
									>
										{testStatus.discord === 'testing' ? (
											<>
												<ButtonLoadingSkeleton />
												Testing...
											</>
										) : (
											<>
												<TestTube className='h-4 w-4' />
												Test Message
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Setup Instructions */}
							<Card>
								<CardHeader>
									<CardTitle className='text-lg'>
										Webhook Setup
									</CardTitle>
									<CardDescription>
										Follow these steps to create a Discord
										webhook
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='space-y-4'>
										<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600'>
													1
												</div>
												<div>
													<h4 className='font-medium'>
														Open Server Settings
													</h4>
													<p className='text-sm text-muted-foreground'>
														Right-click your server
														and select Server
														Settings
													</p>
												</div>
											</div>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600'>
													2
												</div>
												<div>
													<h4 className='font-medium'>
														Create Webhook
													</h4>
													<p className='text-sm text-muted-foreground'>
														Go to Integrations →
														Webhooks → New Webhook
													</p>
												</div>
											</div>
											<div className='flex items-start gap-3'>
												<div className='w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600'>
													3
												</div>
												<div>
													<h4 className='font-medium'>
														Copy URL
													</h4>
													<p className='text-sm text-muted-foreground'>
														Copy the webhook URL and
														paste it below
													</p>
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									discordForm.handleSubmit()
								}}
								className='space-y-6'
							>
								<discordForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-3'>
											<Switch
												id='discord-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label
												htmlFor='discord-enabled'
												className='text-base font-medium'
											>
												Enable Discord Notifications
											</Label>
										</div>
									)}
								/>

								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Webhook Configuration
										</CardTitle>
										<CardDescription>
											Enter your Discord webhook details
										</CardDescription>
									</CardHeader>
									<CardContent className='space-y-4'>
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
													<div className='relative'>
														<Input
															id='discord-webhook'
															type={
																showWebhookUrl.discord
																	? 'text'
																	: 'password'
															}
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='https://discord.com/api/webhooks/...'
															className='pr-10'
														/>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
															onClick={() =>
																setShowWebhookUrl(
																	(prev) => ({
																		...prev,
																		discord:
																			!prev.discord,
																	}),
																)
															}
														>
															{showWebhookUrl.discord ? (
																<EyeOff className='h-4 w-4' />
															) : (
																<Eye className='h-4 w-4' />
															)}
														</Button>
													</div>
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												</div>
											)}
										/>

										<discordForm.Field
											name='username'
											children={(field) => (
												<div className='space-y-2'>
													<Label htmlFor='discord-username'>
														Bot Username
													</Label>
													<Input
														id='discord-username'
														value={
															field.state.value
														}
														onChange={(e) =>
															field.handleChange(
																e.target.value,
															)
														}
														onBlur={
															field.handleBlur
														}
														placeholder='Watchtower'
													/>
													<p className='text-xs text-muted-foreground'>
														How the bot appears in
														Discord (optional)
													</p>
												</div>
											)}
										/>
									</CardContent>
								</Card>

								{/* Message Preview */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Message Preview
										</CardTitle>
										<CardDescription>
											Preview how notifications appear in
											Discord
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='p-4 bg-[#36393f] rounded-lg text-white font-sans text-sm'>
											<div className='flex items-start gap-3'>
												<div className='w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold'>
													W
												</div>
												<div className='flex-1'>
													<div className='flex items-center gap-2 mb-1'>
														<span className='font-semibold'>
															Watchtower
														</span>
														<span className='text-[#72767d] text-xs'>
															BOT
														</span>
														<span className='text-[#72767d] text-xs'>
															Today at 12:34 PM
														</span>
													</div>
													<div className='bg-[#2f3136] border-l-4 border-red-500 rounded p-3 space-y-2'>
														<div className='font-semibold text-base'>
															🔴 Service Down: API
															Endpoint
														</div>
														<div className='text-[#dcddde] text-sm'>
															The monitored
															endpoint is not
															responding
														</div>
														<div className='space-y-1 text-xs'>
															<div>
																<span className='text-[#8e9297]'>
																	URL:
																</span>{' '}
																<span className='text-[#00b0f4]'>
																	https://api.example.com/health
																</span>
															</div>
															<div>
																<span className='text-[#8e9297]'>
																	Severity:
																</span>{' '}
																<span className='text-orange-400'>
																	High
																</span>
															</div>
														</div>
														<div className='text-[#72767d] text-xs pt-2'>
															Watchtower •
															Monitoring Alert
														</div>
													</div>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								<div className='flex items-center gap-3 pt-4'>
									<Button
										type='submit'
										disabled={
											discordForm.state.isSubmitting
										}
										className='px-6'
									>
										{discordForm.state.isSubmitting && (
											<ButtonLoadingSkeleton />
										)}
										{discordForm.state.isSubmitting
											? 'Saving...'
											: 'Save Configuration'}
									</Button>
									<Button variant='outline' type='button'>
										Reset to Defaults
									</Button>
								</div>
							</form>
						</TabsContent>

						{/* Webhook Configuration */}
						<TabsContent value='webhook' className='space-y-6 p-6'>
							<div className='flex items-center justify-between'>
								<div className='space-y-1'>
									<h3 className='text-xl font-semibold'>
										Generic Webhook
									</h3>
									<p className='text-muted-foreground'>
										Connect to any service that accepts HTTP
										webhooks
									</p>
								</div>
								<div className='flex items-center gap-2'>
									{testStatus.webhook === 'success' && (
										<Badge
											variant='default'
											className='bg-green-100 text-green-800 border-green-200'
										>
											<CheckCircle2 className='h-3 w-3 mr-1' />
											Test Passed
										</Badge>
									)}
									{testStatus.webhook === 'error' && (
										<Badge variant='destructive'>
											<AlertCircle className='h-3 w-3 mr-1' />
											Test Failed
										</Badge>
									)}
									<Button
										variant='outline'
										size='sm'
										onClick={() => testChannel('webhook')}
										disabled={
											testStatus.webhook === 'testing'
										}
									>
										{testStatus.webhook === 'testing' ? (
											<>
												<ButtonLoadingSkeleton />
												Testing...
											</>
										) : (
											<>
												<TestTube className='h-4 w-4' />
												Test Payload
											</>
										)}
									</Button>
								</div>
							</div>

							<form
								onSubmit={(e) => {
									e.preventDefault()
									webhookForm.handleSubmit()
								}}
								className='space-y-6'
							>
								<webhookForm.Field
									name='enabled'
									children={(field) => (
										<div className='flex items-center space-x-3'>
											<Switch
												id='webhook-enabled'
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked)
												}
											/>
											<Label
												htmlFor='webhook-enabled'
												className='text-base font-medium'
											>
												Enable Webhook Notifications
											</Label>
										</div>
									)}
								/>

								{/* Endpoint Configuration */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Endpoint Configuration
										</CardTitle>
										<CardDescription>
											Configure the target webhook
											endpoint
										</CardDescription>
									</CardHeader>
									<CardContent className='space-y-4'>
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
													<div className='relative'>
														<Input
															id='webhook-url'
															type={
																showWebhookUrl.webhook
																	? 'text'
																	: 'password'
															}
															value={
																field.state
																	.value
															}
															onChange={(e) =>
																field.handleChange(
																	e.target
																		.value,
																)
															}
															onBlur={
																field.handleBlur
															}
															placeholder='https://your-webhook-endpoint.com/webhook'
															className='pr-10'
														/>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
															onClick={() =>
																setShowWebhookUrl(
																	(prev) => ({
																		...prev,
																		webhook:
																			!prev.webhook,
																	}),
																)
															}
														>
															{showWebhookUrl.webhook ? (
																<EyeOff className='h-4 w-4' />
															) : (
																<Eye className='h-4 w-4' />
															)}
														</Button>
													</div>
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												</div>
											)}
										/>
									</CardContent>
								</Card>

								{/* Headers and Authentication */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Security Settings
										</CardTitle>
										<CardDescription>
											Authentication headers and security
											options
										</CardDescription>
									</CardHeader>
									<CardContent>
										<webhookForm.Field
											name='headers'
											validators={{
												onChange:
													validators.webhookHeaders,
											}}
											children={(field) => (
												<div className='space-y-2'>
													<Label htmlFor='webhook-headers'>
														Headers (JSON)
													</Label>
													<Textarea
														id='webhook-headers'
														value={
															field.state.value
														}
														onChange={(e) =>
															field.handleChange(
																e.target.value,
															)
														}
														onBlur={
															field.handleBlur
														}
														rows={8}
														className='font-mono text-sm'
													/>
													<p className='text-xs text-muted-foreground'>
														HTTP headers as JSON
														object. Commonly used
														for Authorization, API
														keys, etc.
													</p>
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												</div>
											)}
										/>

										{/* Security Recommendations */}
										<div className='mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg'>
											<div className='flex items-center gap-2 mb-2'>
												<Shield className='h-4 w-4 text-amber-600' />
												<span className='font-medium text-amber-800'>
													Security Best Practices
												</span>
											</div>
											<ul className='text-sm text-amber-700 space-y-1'>
												<li>
													• Use HTTPS endpoints only
													for secure transmission
												</li>
												<li>
													• Include authentication
													headers (API keys, Bearer
													tokens)
												</li>
												<li>
													• Consider implementing HMAC
													signature verification
												</li>
												<li>
													• Validate webhook responses
													(2xx status codes)
												</li>
											</ul>
										</div>
									</CardContent>
								</Card>

								{/* Payload Template */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Payload Template
										</CardTitle>
										<CardDescription>
											JSON payload structure with variable
											substitution
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='space-y-4'>
											<div className='p-4 bg-slate-900 rounded-lg overflow-x-auto'>
												<pre className='text-sm text-green-400 font-mono'>
													{`{
  "event": "{{event_type}}",
  "service": {
    "name": "{{service_name}}",
    "url": "{{service_url}}",
    "status": "{{status}}"
  },
  "alert": {
    "message": "{{alert_message}}",
    "severity": "{{severity}}",
    "timestamp": "{{timestamp}}",
    "duration": "{{duration}}"
  },
  "metadata": {
    "response_time": "{{response_time}}",
    "response_code": "{{response_code}}",
    "source": "Watchtower"
  }
}`}
												</pre>
											</div>

											<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
												<div>
													<h4 className='font-medium mb-1'>
														Event Variables
													</h4>
													<ul className='space-y-1 text-muted-foreground'>
														<li>• event_type</li>
														<li>• timestamp</li>
														<li>• severity</li>
													</ul>
												</div>
												<div>
													<h4 className='font-medium mb-1'>
														Service Variables
													</h4>
													<ul className='space-y-1 text-muted-foreground'>
														<li>• service_name</li>
														<li>• service_url</li>
														<li>• status</li>
													</ul>
												</div>
												<div>
													<h4 className='font-medium mb-1'>
														Response Variables
													</h4>
													<ul className='space-y-1 text-muted-foreground'>
														<li>• response_time</li>
														<li>• response_code</li>
														<li>• duration</li>
													</ul>
												</div>
												<div>
													<h4 className='font-medium mb-1'>
														Alert Variables
													</h4>
													<ul className='space-y-1 text-muted-foreground'>
														<li>• alert_message</li>
														<li>• incident_id</li>
														<li>• escalation</li>
													</ul>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Response Handling */}
								<Card>
									<CardHeader>
										<CardTitle className='text-lg'>
											Response Handling
										</CardTitle>
										<CardDescription>
											Expected response codes and error
											handling
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
											<div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
												<div className='flex items-center gap-2 mb-1'>
													<CheckCircle2 className='h-4 w-4 text-green-600' />
													<span className='font-medium text-green-800'>
														Success (2xx)
													</span>
												</div>
												<p className='text-sm text-green-700'>
													Webhook delivered
													successfully
												</p>
											</div>
											<div className='p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
												<div className='flex items-center gap-2 mb-1'>
													<Clock className='h-4 w-4 text-yellow-600' />
													<span className='font-medium text-yellow-800'>
														Retry (4xx/5xx)
													</span>
												</div>
												<p className='text-sm text-yellow-700'>
													Will retry up to 3 times
												</p>
											</div>
											<div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
												<div className='flex items-center gap-2 mb-1'>
													<AlertCircle className='h-4 w-4 text-red-600' />
													<span className='font-medium text-red-800'>
														Failed
													</span>
												</div>
												<p className='text-sm text-red-700'>
													Logged for investigation
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								<div className='flex items-center gap-3 pt-4'>
									<Button
										type='submit'
										disabled={
											webhookForm.state.isSubmitting
										}
										className='px-6'
									>
										{webhookForm.state.isSubmitting && (
											<ButtonLoadingSkeleton />
										)}
										{webhookForm.state.isSubmitting
											? 'Saving...'
											: 'Save Configuration'}
									</Button>
									<Button variant='outline' type='button'>
										Reset to Defaults
									</Button>
								</div>
							</form>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
