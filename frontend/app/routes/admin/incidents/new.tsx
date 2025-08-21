import { useNavigate } from 'react-router'
import { useSuccessToast, useErrorToast } from '~/components/toast'
import { requireAuth } from '~/lib/auth'
import { getApiErrorMessage } from '~/lib/validation'
import { IncidentForm, type IncidentFormData } from '~/components/incident-form'
import type { Route } from './+types/new'

export function meta() {
	return [
		{ title: 'New Incident · Watchtower' },
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

export default function NewIncident({ loaderData }: Route.ComponentProps) {
	const { endpoints } = loaderData
	const navigate = useNavigate()
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const handleSubmit = async (data: IncidentFormData) => {
		const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

		const response = await fetch(`${API_BASE_URL}/api/v1/admin/incidents`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		})

		if (response.ok) {
			const actionText = data.save_as_draft ? 'saved as draft' : 'created'
			successToast(
				'Incident Created',
				`Successfully ${actionText} incident "${data.title}"`,
			)
			navigate('/admin/incidents')
		} else {
			const errorData = await response.json()
			const errorMessage = getApiErrorMessage(errorData)
			errorToast('Creation Failed', errorMessage)
			throw new Error(errorMessage)
		}
	}

	return (
		<IncidentForm
			mode='create'
			onSubmit={handleSubmit}
			cancelPath='/admin/incidents'
			title='New Incident'
			description='Report a service incident or schedule maintenance'
			endpoints={endpoints}
		/>
	)
}
