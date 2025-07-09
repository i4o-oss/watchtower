// Form validation utilities and rules

export interface ValidationRule {
	validate: (value: any) => boolean
	message: string
}

export interface FieldValidation {
	[key: string]: ValidationRule[]
}

export interface ValidationResult {
	isValid: boolean
	errors: { [key: string]: string }
}

// Common validation rules
export const validationRules = {
	required: (message = 'This field is required'): ValidationRule => ({
		validate: (value) => {
			if (typeof value === 'string') return value.trim().length > 0
			return value !== null && value !== undefined && value !== ''
		},
		message,
	}),

	email: (
		message = 'Please enter a valid email address',
	): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return emailRegex.test(value)
		},
		message,
	}),

	url: (message = 'Please enter a valid URL'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			try {
				new URL(value)
				return true
			} catch {
				return false
			}
		},
		message,
	}),

	minLength: (min: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			return value.toString().length >= min
		},
		message: message || `Must be at least ${min} characters`,
	}),

	maxLength: (max: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			return value.toString().length <= max
		},
		message: message || `Must be no more than ${max} characters`,
	}),

	number: (message = 'Must be a valid number'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			return !isNaN(Number(value))
		},
		message,
	}),

	positiveNumber: (
		message = 'Must be a positive number',
	): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const num = Number(value)
			return !isNaN(num) && num > 0
		},
		message,
	}),

	min: (minimum: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const num = Number(value)
			return !isNaN(num) && num >= minimum
		},
		message: message || `Must be at least ${minimum}`,
	}),

	max: (maximum: number, message?: string): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const num = Number(value)
			return !isNaN(num) && num <= maximum
		},
		message: message || `Must be no more than ${maximum}`,
	}),

	validJson: (message = 'Must be valid JSON'): ValidationRule => ({
		validate: (value) => {
			if (!value || value.trim() === '') return true // Optional field validation
			try {
				JSON.parse(value)
				return true
			} catch {
				return false
			}
		},
		message,
	}),

	httpMethod: (message = 'Must be a valid HTTP method'): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const validMethods = [
				'GET',
				'POST',
				'PUT',
				'PATCH',
				'DELETE',
				'HEAD',
				'OPTIONS',
			]
			return validMethods.includes(value.toUpperCase())
		},
		message,
	}),

	statusCode: (
		message = 'Must be a valid HTTP status code',
	): ValidationRule => ({
		validate: (value) => {
			if (!value) return true // Optional field validation
			const num = Number(value)
			return !isNaN(num) && num >= 100 && num <= 599
		},
		message,
	}),
}

// Endpoint-specific validation schemas
export const endpointValidationSchema: FieldValidation = {
	name: [
		validationRules.required('Endpoint name is required'),
		validationRules.minLength(2, 'Name must be at least 2 characters'),
		validationRules.maxLength(
			100,
			'Name must be no more than 100 characters',
		),
	],
	url: [
		validationRules.required('URL is required'),
		validationRules.url(
			'Please enter a valid URL (e.g., https://api.example.com)',
		),
	],
	method: [
		validationRules.required('HTTP method is required'),
		validationRules.httpMethod(),
	],
	expected_status_code: [
		validationRules.required('Expected status code is required'),
		validationRules.statusCode(),
	],
	timeout_seconds: [
		validationRules.required('Timeout is required'),
		validationRules.positiveNumber('Timeout must be a positive number'),
		validationRules.min(1, 'Timeout must be at least 1 second'),
		validationRules.max(300, 'Timeout must be no more than 300 seconds'),
	],
	check_interval_seconds: [
		validationRules.required('Check interval is required'),
		validationRules.positiveNumber('Interval must be a positive number'),
		validationRules.min(1, 'Interval must be at least 1 second'),
		validationRules.max(86400, 'Interval must be no more than 24 hours'),
	],
	headers: [validationRules.validJson('Headers must be valid JSON')],
	body: [validationRules.validJson('Request body must be valid JSON')],
}

// Incident validation schema
export const incidentValidationSchema: FieldValidation = {
	title: [
		validationRules.required('Incident title is required'),
		validationRules.minLength(5, 'Title must be at least 5 characters'),
		validationRules.maxLength(
			200,
			'Title must be no more than 200 characters',
		),
	],
	description: [
		validationRules.required('Description is required'),
		validationRules.minLength(
			10,
			'Description must be at least 10 characters',
		),
		validationRules.maxLength(
			2000,
			'Description must be no more than 2000 characters',
		),
	],
	severity: [validationRules.required('Severity is required')],
}

// Validate form data against schema
export function validateForm(
	data: any,
	schema: FieldValidation,
): ValidationResult {
	const errors: { [key: string]: string } = {}

	for (const field in schema) {
		const rules = schema[field]
		const value = data[field]

		for (const rule of rules) {
			if (!rule.validate(value)) {
				errors[field] = rule.message
				break // Stop at first error for this field
			}
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	}
}

// Validate a single field
export function validateField(
	value: any,
	rules: ValidationRule[],
): string | null {
	for (const rule of rules) {
		if (!rule.validate(value)) {
			return rule.message
		}
	}
	return null
}

// API error handling utilities
export function getApiErrorMessage(error: any): string {
	if (typeof error === 'string') return error

	// Handle structured API errors
	if (error?.message) return error.message
	if (error?.error) return error.error

	// Handle validation errors from API
	if (error?.details && Array.isArray(error.details)) {
		return error.details
			.map((detail: any) => detail.message || detail)
			.join(', ')
	}

	// Handle field-specific errors
	if (error?.errors && typeof error.errors === 'object') {
		const firstError = Object.values(error.errors)[0]
		if (Array.isArray(firstError)) {
			return firstError[0] as string
		}
		return firstError as string
	}

	// Default error messages by status code
	if (error?.status) {
		switch (error.status) {
			case 400:
				return 'Invalid request. Please check your input and try again.'
			case 401:
				return 'Authentication required. Please log in and try again.'
			case 403:
				return 'You do not have permission to perform this action.'
			case 404:
				return 'The requested resource was not found.'
			case 409:
				return 'A conflict occurred. The resource may already exist.'
			case 422:
				return 'The submitted data is invalid. Please review and correct any errors.'
			case 429:
				return 'Too many requests. Please wait a moment and try again.'
			case 500:
				return 'A server error occurred. Please try again later.'
			case 503:
				return 'Service temporarily unavailable. Please try again later.'
			default:
				return `Request failed with status ${error.status}. Please try again.`
		}
	}

	return 'An unexpected error occurred. Please try again.'
}

// Format field name for display
export function formatFieldName(fieldName: string): string {
	return fieldName
		.replace(/_/g, ' ')
		.replace(/([A-Z])/g, ' $1')
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase())
}
