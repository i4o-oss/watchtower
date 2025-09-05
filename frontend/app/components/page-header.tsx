import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card'

interface PageHeaderProps {
	title: string
	description?: string
	children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
	return (
		<>
			<CardHeader className='flex flex-row items-center justify-between p-4'>
				<div className='flex flex-col gap-1'>
					<CardTitle className='typography-h4'>{title}</CardTitle>
					<CardDescription className='font-mono uppercase'>
						{description}
					</CardDescription>
				</div>
				{children && (
					<div className='flex items-center gap-2 sm:flex-row'>
						{children}
					</div>
				)}
			</CardHeader>
		</>
	)
}
