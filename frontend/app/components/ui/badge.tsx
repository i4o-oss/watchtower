import type * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '~/lib/utils'

const badgeVariants = cva(
	'inline-flex items-center justify-center border-transparent w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors duration-[150ms] ease-out overflow-hidden',
	{
		variants: {
			variant: {
				// Default using primary brand color
				default:
					'bg-primary-dark-green text-primary-white rounded-[12px] px-2 py-1 text-caption [a&]:hover:bg-secondary-green-medium',
				// Secondary using secondary brand color
				secondary:
					'bg-secondary-green-pale text-primary-dark-green rounded-[12px] px-2 py-1 text-caption [a&]:hover:bg-secondary-green-light [a&]:hover:text-primary-white',
				// Status indicators - Exact style guide specs: 12px radius (pill), 4px 8px padding, caption style
				operational:
					'bg-success-green text-white rounded-[12px] px-2 py-1 text-caption',
				degraded:
					'bg-warning-amber text-white rounded-[12px] px-2 py-1 text-caption',
				down: 'bg-error-red text-white rounded-[12px] px-2 py-1 text-caption',
				maintenance:
					'bg-info-blue text-white rounded-[12px] px-2 py-1 text-caption',
				// Destructive using error color
				destructive:
					'bg-error-red text-white rounded-[12px] px-2 py-1 text-caption [a&]:hover:bg-[#B91C1C] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
				// Outline variant
				outline:
					'border border-neutral-gray text-neutral-dark-gray rounded-[12px] px-2 py-1 text-caption [a&]:hover:bg-neutral-light-gray dark:border-dark-border dark:text-dark-text-primary dark:[a&]:hover:bg-dark-surface',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<'span'> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'span'

	return (
		<Comp
			data-slot='badge'
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	)
}

export { Badge, badgeVariants }
