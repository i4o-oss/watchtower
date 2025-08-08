import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'

interface PageHeaderProps {
	title: string
	description?: string
	children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
	return (
		<div className='space-y-4'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold text-foreground'>
						{title}
					</h1>
					{description && (
						<p className='text-sm text-muted-foreground'>
							{description}
						</p>
					)}
				</div>
				{children && (
					<div className='flex items-center gap-2 sm:flex-row'>
						{children}
					</div>
				)}
			</div>
			<Separator />
		</div>
	)
}
