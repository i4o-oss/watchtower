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
import { requireAuth } from '~/lib/auth'
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
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
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

		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		try {
			// Parse headers if provided
			let headers = {}
			if (formData.headers.trim()) {
				try {
					headers = JSON.parse(formData.headers)
				} catch {
					// Try to parse as key:value pairs
					const lines = formData.headers.split('\n')
					headers = {}
					for (const line of lines) {
						const [key, ...valueParts] = line.split(':')
						if (key && valueParts.length > 0) {
							headers[key.trim()] = valueParts.join(':').trim()
						}
					}
				}
			}

			const payload = {
				...formData,
				headers,
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
				navigate('/admin/endpoints')
			} else {
				const errorData = await response.json()
				setError(errorData.message || 'Failed to create endpoint')
			}
		} catch (error) {
			console.error('Error creating endpoint:', error)
			setError('Network error occurred')
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateFormData = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	return (
		<div className='min-h-screen bg-background'>
			<div className='container mx-auto px-4 py-8 max-w-2xl'>
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
										onChange={(e) =>
											updateFormData(
												'name',
												e.target.value,
											)
										}
										placeholder='My API Endpoint'
										required
									/>
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
										onChange={(e) =>
											updateFormData(
												'url',
												e.target.value,
											)
										}
										placeholder='https://api.example.com/health'
										required
									/>
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
											value={
												formData.expected_status_code
											}
											onChange={(e) =>
												updateFormData(
													'expected_status_code',
													e.target.value,
												)
											}
											min='100'
											max='599'
										/>
									</div>
								</div>
							</div>

							{/* Request Configuration */}
							<div className='space-y-4'>
								<h3 className='text-lg font-medium'>
									Request Configuration
								</h3>

								<div className='space-y-2'>
									<Label htmlFor='headers'>
										Headers (JSON or key:value format)
									</Label>
									<Textarea
										id='headers'
										value={formData.headers}
										onChange={(e) =>
											updateFormData(
												'headers',
												e.target.value,
											)
										}
										placeholder='{"Authorization": "Bearer token"} or Authorization: Bearer token'
										rows={4}
									/>
								</div>

								{(formData.method === 'POST' ||
									formData.method === 'PUT' ||
									formData.method === 'PATCH') && (
									<div className='space-y-2'>
										<Label htmlFor='body'>
											Request Body
										</Label>
										<Textarea
											id='body'
											value={formData.body}
											onChange={(e) =>
												updateFormData(
													'body',
													e.target.value,
												)
											}
											placeholder='Request body content'
											rows={4}
										/>
									</div>
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
											onChange={(e) =>
												updateFormData(
													'timeout_seconds',
													e.target.value,
												)
											}
											min='1'
											max='300'
										/>
									</div>

									<div className='space-y-2'>
										<Label htmlFor='interval'>
											Check Interval (seconds)
										</Label>
										<Input
											id='interval'
											type='number'
											value={
												formData.check_interval_seconds
											}
											onChange={(e) =>
												updateFormData(
													'check_interval_seconds',
													e.target.value,
												)
											}
											min='30'
											max='86400'
										/>
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
									{isSubmitting
										? 'Creating...'
										: 'Create Endpoint'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
