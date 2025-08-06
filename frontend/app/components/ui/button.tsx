import type * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '~/lib/utils'

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap text-button border-transparent transition-colors duration-[150ms] ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
	{
		variants: {
			variant: {
				// Primary Button - Exact style guide specs: Primary Dark Green bg, white text, hover Secondary Green Medium
				default:
					'bg-primary-dark-green text-white rounded-[6px] px-4 py-3 h-10 hover:bg-secondary-green-medium shadow-xs',
				// Secondary Button - Exact style guide specs: border Primary Dark Green, text Primary Dark Green, transparent bg, hover Secondary Green Pale
				secondary:
					'border border-primary-dark-green text-primary-dark-green bg-transparent rounded-[6px] px-4 py-3 h-10 hover:bg-secondary-green-pale',
				// Destructive Button - Exact style guide specs: Error Red bg, white text, darker red hover
				destructive:
					'bg-error-red text-white rounded-[6px] px-4 py-3 h-10 hover:bg-[#B91C1C] shadow-xs focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
				// Ghost Button - Exact style guide specs: Neutral Dark Gray text, transparent bg, 36px height, Neutral Light Gray hover
				ghost: 'text-neutral-dark-gray bg-transparent rounded-[6px] px-4 py-2 h-9 hover:bg-neutral-light-gray',
				// Link variant using style guide link specs
				link: 'text-primary-dark-green underline-offset-4 hover:underline bg-transparent h-auto p-0',
				// Outline variant for compatibility
				outline:
					'border border-neutral-gray text-neutral-dark-gray bg-transparent rounded-[6px] px-4 py-3 h-10 hover:bg-neutral-light-gray shadow-xs dark:border-dark-border dark:text-dark-text-primary dark:hover:bg-dark-surface',
			},
			size: {
				// Default size matches style guide: height 40px, padding 12px 16px
				default: 'h-10 px-4 py-3 has-[>svg]:px-3',
				// Small size variant
				sm: 'h-8 px-3 py-2 gap-1.5 has-[>svg]:px-2.5',
				// Large size variant
				lg: 'h-12 px-6 py-4 has-[>svg]:px-5',
				// Icon size matches default height
				icon: 'size-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			data-slot='button'
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
