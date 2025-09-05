import { useNavigate } from 'react-router'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { EndpointForm, type EndpointFormData } from '~/components/endpoint-form'
import type { Route } from './+types/[id].edit'

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: 'Edit Endpoint - Admin - Watchtower' },
		{
			name: 'description',
			content: 'Edit monitoring endpoint configuration',
		},
	]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	await requireAuth('/login')

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	const { id } = params

	try {
		const response = await fetch(
			`${API_BASE_URL}/api/v1/admin/endpoints/${id}`,
			{
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			},
		)

		if (!response.ok) {
			throw new Response('Endpoint not found', { status: 404 })
		}

		const endpoint = await response.json()
		return { endpoint }
	} catch (error) {
		throw new Response('Error loading endpoint', { status: 500 })
	}
}

export default function EditEndpoint({
	loaderData,
	params,
}: Route.ComponentProps) {
	const { endpoint } = loaderData
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const handleSubmit = async (data: EndpointFormData) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		const response = await fetch(
			`${API_BASE_URL}/api/v1/admin/endpoints/${params.id}`,
			{
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			},
		)

		if (response.ok) {
			successToast(
				'Endpoint Updated',
				`Successfully updated endpoint "${data.name}"`,
			)
			navigate('/admin/endpoints')
		} else {
			const errorData = await response.json()
			const errorMessage = getApiErrorMessage(errorData)
			errorToast('Update Failed', errorMessage)
			throw new Error(errorMessage)
		}
	}

	const initialValues = {
		name: endpoint.name || '',
		description: endpoint.description || '',
		url: endpoint.url || '',
		method: endpoint.method || 'GET',
		headers: endpoint.headers || {},
		body: endpoint.body || '',
		expected_status_code: endpoint.expected_status_code || 200,
		timeout_seconds: endpoint.timeout_seconds || 30,
		check_interval_seconds: endpoint.check_interval_seconds || 300,
		enabled: endpoint.enabled !== undefined ? endpoint.enabled : true,
	}

	return (
		<EndpointForm
			mode='edit'
			initialValues={initialValues}
			onSubmit={handleSubmit}
			cancelPath='/admin/endpoints'
			title='Edit Endpoint'
			description={`Update "${endpoint.name}" monitoring configuration`}
		/>
	)
}
