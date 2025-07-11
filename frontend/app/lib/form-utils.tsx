/**
 * TanStack Form utilities for React Router v7 integration
 */
import React from 'react'
import { useForm, type FormApi } from '@tanstack/react-form'
import { useActionData, useNavigation } from 'react-router'
import { useEffect } from 'react'

/**
 * Hook to integrate TanStack Form with React Router v7 clientAction
 * Handles form submission to clientAction and manages loading states
 */
export function useFormWithAction<
	TFormData extends Record<string, any>,
>(formOptions: {
	defaultValues: TFormData
	onSubmit?: (props: { value: TFormData }) => void | Promise<void>
}) {
	const navigation = useNavigation()
	const actionData = useActionData()
	const isSubmitting = navigation.state === 'submitting'

	const form = useForm({
		defaultValues: formOptions.defaultValues,
		onSubmit: async ({ value }) => {
			// Form submission is handled by React Router Form component
			formOptions.onSubmit?.({ value })
		},
	})

	// Handle server-side validation errors
	useEffect(() => {
		if (actionData?.errors) {
			// Set field errors from server response
			Object.entries(actionData.errors).forEach(([field, error]) => {
				form.setFieldMeta(field as any, (prev) => ({
					...prev,
					errors: [error as string],
				}))
			})
		}
	}, [actionData, form])

	return {
		form,
		isSubmitting,
		actionData,
	}
}

/**
 * Helper component to render field errors
 */
export function FieldError({ errors }: { errors?: any[] }) {
	if (!errors || errors.length === 0) return null

	const validErrors = errors.filter(Boolean)
	if (validErrors.length === 0) return null

	return (
		<div className='text-sm text-red-600 mt-1'>
			{validErrors.map((error, index) => (
				<div key={index}>{error}</div>
			))}
		</div>
	)
}

/**
 * Validation helper for common form fields
 */
export const validators = {
	required: ({ value }: { value: any }) => {
		if (!value || (typeof value === 'string' && value.trim() === '')) {
			return 'This field is required'
		}
		return undefined
	},

	email: ({ value }: { value: string }) => {
		if (!value) return undefined
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(value)) {
			return 'Please enter a valid email address'
		}
		return undefined
	},

	minLength:
		(min: number) =>
		({ value }: { value: string }) => {
			if (!value) return undefined
			if (value.length < min) {
				return `Must be at least ${min} characters`
			}
			return undefined
		},

	maxLength:
		(max: number) =>
		({ value }: { value: string }) => {
			if (!value) return undefined
			if (value.length > max) {
				return `Must be no more than ${max} characters`
			}
			return undefined
		},

	url: ({ value }: { value: string }) => {
		if (!value) return undefined
		try {
			new URL(value)
			return undefined
		} catch {
			return 'Please enter a valid URL'
		}
	},

	number: ({ value }: { value: string }) => {
		if (!value) return undefined
		if (isNaN(Number(value))) {
			return 'Please enter a valid number'
		}
		return undefined
	},

	integer: ({ value }: { value: string }) => {
		if (!value) return undefined
		if (!Number.isInteger(Number(value))) {
			return 'Please enter a valid integer'
		}
		return undefined
	},

	positive: ({ value }: { value: string }) => {
		if (!value) return undefined
		if (Number(value) <= 0) {
			return 'Must be a positive number'
		}
		return undefined
	},
}

/**
 * Helper to combine multiple validators
 */
export function combineValidators<T>(
	...validators: Array<(props: { value: T }) => string | undefined>
) {
	return (props: { value: T }) => {
		for (const validator of validators) {
			const error = validator(props)
			if (error) return error
		}
		return undefined
	}
}

/**
 * Helper to create form options with default values from loader data
 */
export function createFormOptions<T extends Record<string, any>>(
	defaultValues: Partial<T>,
	validation?: Record<keyof T, (value: any) => string | undefined>,
) {
	return {
		defaultValues,
		validators: validation,
	}
}
