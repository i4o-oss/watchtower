import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from '@tanstack/react-form'
import { Button } from '~/components/ui/button'
import { CardContent } from '~/components/ui/card'
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
import { KeyValueInput } from '~/components/key-value-input'
import { ButtonLoadingSkeleton } from '~/lib/lazy'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { getApiErrorMessage } from '~/lib/validation'
import { validators, combineValidators, FieldError } from '~/lib/form-utils'
import { Check } from 'lucide-react'

export interface EndpointFormData {
	name: string
	description: string
	url: string
	method: string
	headers: Record<string, string>
	body: string
	expected_status_code: number
	timeout_seconds: number
	check_interval_seconds: number
	enabled: boolean
}

interface EndpointFormProps {
	mode: 'create' | 'edit'
	initialValues?: Partial<EndpointFormData>
	onSubmit: (data: EndpointFormData) => Promise<void>
	cancelPath: string
	title: string
	description: string
}

export function EndpointForm({
	mode,
	initialValues = {},
	onSubmit,
	cancelPath,
	title,
	description,
}: EndpointFormProps) {
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			name: initialValues.name || '',
			description: initialValues.description || '',
			url: initialValues.url || '',
			method: initialValues.method || 'GET',
			headers: initialValues.headers || {},
			body: initialValues.body || '',
			expected_status_code: initialValues.expected_status_code || 200,
			timeout_seconds: initialValues.timeout_seconds || 30,
			check_interval_seconds: initialValues.check_interval_seconds || 300,
			enabled:
				initialValues.enabled !== undefined
					? initialValues.enabled
					: true,
		} as EndpointFormData,
		onSubmit: async ({ value }) => {
			setError(null)

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
				headers: value.headers, // Already a Record<string, string>
				body: body ? JSON.stringify(body) : '',
				expected_status_code: Number(value.expected_status_code),
				timeout_seconds: Number(value.timeout_seconds),
				check_interval_seconds: Number(value.check_interval_seconds),
			}

			try {
				await onSubmit(payload)
			} catch (error) {
				console.error('Error submitting endpoint form:', error)
				const errorMessage =
					'Network error occurred. Please check your connection and try again.'
				setError(errorMessage)
				errorToast('Network Error', errorMessage)
			}
		},
	})

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

						<form.Field
							name='name'
							validators={{
								onChange: validators.required,
							}}
						>
							{(field) => (
								<div className='space-y-2'>
									<Label htmlFor='name'>Name *</Label>
									<Input
										id='name'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
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
						</form.Field>

						<form.Field name='description'>
							{(field) => (
								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description
									</Label>
									<Textarea
										id='description'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
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
						</form.Field>

						<form.Field
							name='url'
							validators={{
								onChange: combineValidators(
									validators.required,
									validators.url,
								),
							}}
						>
							{(field) => (
								<div className='space-y-2'>
									<Label htmlFor='url'>URL *</Label>
									<Input
										id='url'
										type='url'
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
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
						</form.Field>

						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
							<form.Field name='method'>
								{(field) => (
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
											<SelectTrigger className='w-full'>
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
							</form.Field>

							<form.Field
								name='expected_status_code'
								validators={{
									onChange: (props: { value: number }) => {
										if (!props.value)
											return 'This field is required'
										if (props.value <= 0)
											return 'Must be a positive number'
										return undefined
									},
								}}
							>
								{(field) => (
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
							</form.Field>
							<form.Field
								name='timeout_seconds'
								validators={{
									onChange: (props: { value: number }) => {
										if (!props.value)
											return 'This field is required'
										if (props.value <= 0)
											return 'Must be a positive number'
										return undefined
									},
								}}
							>
								{(field) => (
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
							</form.Field>

							<form.Field
								name='check_interval_seconds'
								validators={{
									onChange: (props: { value: number }) => {
										if (!props.value)
											return 'This field is required'
										if (props.value <= 0)
											return 'Must be a positive number'
										return undefined
									},
								}}
							>
								{(field) => (
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
							</form.Field>
						</div>

						<form.Field name='headers'>
							{(field) => (
								<div className='space-y-2'>
									<KeyValueInput
										title='Request Headers'
										value={field.state.value}
										onChange={(value) =>
											field.handleChange(value)
										}
										placeholder={{
											key: 'Authorization',
											value: 'Bearer your-token-here',
										}}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name='method'>
							{(methodField) => (
								<>
									{(methodField.state.value === 'POST' ||
										methodField.state.value === 'PUT' ||
										methodField.state.value ===
											'PATCH') && (
										<form.Field name='body'>
											{(field) => (
												<div className='space-y-2'>
													<JsonEditor
														title='Request Body'
														value={
															field.state.value
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
										</form.Field>
									)}
								</>
							)}
						</form.Field>

						<div className='flex flex-col sm:flex-row justify-center sm:justify-between gap-4 pt-8 border-t border-border/50'>
							<form.Field name='enabled'>
								{(field) => (
									<div className='flex items-center space-x-2'>
										<Switch
											id='enabled'
											checked={field.state.value}
											onCheckedChange={(checked) =>
												field.handleChange(checked)
											}
										/>
										<Label htmlFor='enabled'>
											Enable Monitoring
										</Label>
										<FieldError
											errors={field.state.meta.errors}
										/>
									</div>
								)}
							</form.Field>
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
											{mode === 'create'
												? 'Creating...'
												: 'Updating...'}
										</>
									) : (
										<>
											<Check className='h-4 w-4' />
											{mode === 'create'
												? 'Create Endpoint'
												: 'Update Endpoint'}
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
