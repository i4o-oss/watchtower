import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { X, Plus } from 'lucide-react'

export interface KeyValuePair {
	key: string
	value: string
	id: string
}

interface KeyValueInputProps {
	title: string
	value: Record<string, string>
	onChange: (value: Record<string, string>) => void
	placeholder?: {
		key: string
		value: string
	}
}

export function KeyValueInput({
	title,
	value,
	onChange,
	placeholder = { key: 'Header name', value: 'Header value' },
}: KeyValueInputProps) {
	// Convert object to array of key-value pairs for editing
	const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
		const entries = Object.entries(value)
		if (entries.length === 0) {
			return [{ key: '', value: '', id: crypto.randomUUID() }]
		}
		return entries.map(([key, value]) => ({
			key,
			value,
			id: crypto.randomUUID(),
		}))
	})

	const updatePairs = (newPairs: KeyValuePair[]) => {
		setPairs(newPairs)
		// Convert back to object and call onChange
		const newValue: Record<string, string> = {}
		newPairs.forEach((pair) => {
			if (pair.key.trim()) {
				newValue[pair.key.trim()] = pair.value
			}
		})
		onChange(newValue)
	}

	const updatePair = (
		id: string,
		field: 'key' | 'value',
		newValue: string,
	) => {
		const newPairs = pairs.map((pair) =>
			pair.id === id ? { ...pair, [field]: newValue } : pair,
		)
		updatePairs(newPairs)
	}

	const addPair = () => {
		const newPairs = [
			...pairs,
			{ key: '', value: '', id: crypto.randomUUID() },
		]
		updatePairs(newPairs)
	}

	const removePair = (id: string) => {
		if (pairs.length === 1) {
			// If it's the last pair, just clear it instead of removing
			updatePairs([{ key: '', value: '', id: crypto.randomUUID() }])
		} else {
			const newPairs = pairs.filter((pair) => pair.id !== id)
			updatePairs(newPairs)
		}
	}

	return (
		<div className='space-y-2'>
			<Label>{title}</Label>
			<div className='space-y-2 border border-border rounded-md p-3'>
				{pairs.map((pair, index) => (
					<div key={pair.id} className='flex gap-2 items-center'>
						<Input
							placeholder={placeholder.key}
							value={pair.key}
							onChange={(e) =>
								updatePair(pair.id, 'key', e.target.value)
							}
							className='flex-1'
						/>
						<Input
							placeholder={placeholder.value}
							value={pair.value}
							onChange={(e) =>
								updatePair(pair.id, 'value', e.target.value)
							}
							className='flex-1'
						/>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => removePair(pair.id)}
							className='shrink-0'
							title={pairs.length === 1 ? 'Clear' : 'Remove'}
						>
							<X className='h-4 w-4' />
						</Button>
					</div>
				))}
				<Button
					type='button'
					variant='outline'
					size='sm'
					onClick={addPair}
					className='w-full gap-2'
				>
					<Plus className='h-4 w-4' />
					Add Header
				</Button>
			</div>
		</div>
	)
}
