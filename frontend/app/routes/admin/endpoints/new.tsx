import { useNavigate } from 'react-router'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { EndpointForm, type EndpointFormData } from '~/components/endpoint-form'
import type { Route } from './+types/new'

export function meta() {
	return [
		{ title: 'New Endpoint · Watchtower' },
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

	const handleSubmit = async (data: EndpointFormData) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		const response = await fetch(`${API_BASE_URL}/api/v1/admin/endpoints`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		})

		if (response.ok) {
			successToast(
				'Endpoint Created',
				`Successfully created endpoint "${data.name}"`,
			)
			navigate('/admin/endpoints')
		} else {
			const errorData = await response.json()
			const errorMessage = getApiErrorMessage(errorData)
			errorToast('Creation Failed', errorMessage)
			throw new Error(errorMessage)
		}
	}

	return (
		<EndpointForm
			mode='create'
			onSubmit={handleSubmit}
			cancelPath='/admin/endpoints'
			title='New Endpoint'
			description='Create a new monitoring endpoint to track your services'
		/>
	)
}
