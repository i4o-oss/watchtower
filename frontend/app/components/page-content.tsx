import { cn } from '~/lib/utils'
import { Card } from './ui/card'

interface PageContentProps {
	children: React.ReactNode
	className?: string
}

export function PageContent({ children, className }: PageContentProps) {
	return <Card className={className}>{children}</Card>
}
