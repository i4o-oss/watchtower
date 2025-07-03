import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { CheckCircle, XCircle, Copy, RotateCcw } from 'lucide-react'

interface JsonEditorProps {
	value: string
	onChange: (value: string) => void
	title?: string
	height?: number
	placeholder?: object
	validate?: boolean
}

export function JsonEditor({
	value,
	onChange,
	title = 'JSON Configuration',
	height = 300,
	placeholder = {},
	validate = true,
}: JsonEditorProps) {
	const [isValid, setIsValid] = useState(true)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [editorValue, setEditorValue] = useState(value)

	useEffect(() => {
		setEditorValue(value)
	}, [value])

	const validateJson = (jsonString: string) => {
		if (!validate) return true

		if (!jsonString.trim()) {
			setIsValid(true)
			setErrorMessage(null)
			return true
		}

		try {
			JSON.parse(jsonString)
			setIsValid(true)
			setErrorMessage(null)
			return true
		} catch (error) {
			setIsValid(false)
			setErrorMessage(
				error instanceof Error ? error.message : 'Invalid JSON',
			)
			return false
		}
	}

	const handleEditorChange = (newValue: string | undefined) => {
		const val = newValue || ''
		setEditorValue(val)

		if (validateJson(val)) {
			onChange(val)
		}
	}

	const formatJson = () => {
		try {
			if (editorValue.trim()) {
				const parsed = JSON.parse(editorValue)
				const formatted = JSON.stringify(parsed, null, 2)
				setEditorValue(formatted)
				onChange(formatted)
			}
		} catch (error) {
			// Already handled by validation
		}
	}

	const resetToPlaceholder = () => {
		const placeholderJson = JSON.stringify(placeholder, null, 2)
		setEditorValue(placeholderJson)
		onChange(placeholderJson)
		setIsValid(true)
		setErrorMessage(null)
	}

	const copyToClipboard = () => {
		navigator.clipboard.writeText(editorValue)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<CardTitle className='text-base'>{title}</CardTitle>
						{validate && (
							<Badge
								variant={isValid ? 'default' : 'destructive'}
							>
								{isValid ? (
									<CheckCircle className='w-3 h-3 mr-1' />
								) : (
									<XCircle className='w-3 h-3 mr-1' />
								)}
								{isValid ? 'Valid' : 'Invalid'}
							</Badge>
						)}
					</div>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={copyToClipboard}
							title='Copy to clipboard'
						>
							<Copy className='w-4 h-4' />
						</Button>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={formatJson}
							disabled={!isValid}
							title='Format JSON'
						>
							Format
						</Button>
						{Object.keys(placeholder).length > 0 && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={resetToPlaceholder}
								title='Reset to template'
							>
								<RotateCcw className='w-4 h-4' />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{errorMessage && (
					<Alert variant='destructive' className='mb-4'>
						<XCircle className='h-4 w-4' />
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				<div className='border rounded-md overflow-hidden'>
					<Editor
						height={height}
						defaultLanguage='json'
						value={editorValue}
						onChange={handleEditorChange}
						options={{
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
							fontSize: 14,
							lineNumbers: 'on',
							roundedSelection: false,
							scrollbar: {
								vertical: 'auto',
								horizontal: 'auto',
							},
							automaticLayout: true,
							tabSize: 2,
							insertSpaces: true,
							formatOnPaste: true,
							formatOnType: true,
						}}
						theme='vs-dark'
					/>
				</div>

				{Object.keys(placeholder).length > 0 && (
					<div className='mt-4'>
						<details className='text-sm'>
							<summary className='cursor-pointer text-muted-foreground hover:text-foreground'>
								View example template
							</summary>
							<pre className='mt-2 p-3 bg-muted rounded-md overflow-x-auto text-xs'>
								{JSON.stringify(placeholder, null, 2)}
							</pre>
						</details>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
