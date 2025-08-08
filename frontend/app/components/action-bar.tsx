import { cn } from '~/lib/utils'

interface ActionBarProps {
	children: React.ReactNode
	className?: string
}

export function ActionBar({ children, className }: ActionBarProps) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-lg shadow-sm',
				className,
			)}
		>
			{children}
		</div>
	)
}
