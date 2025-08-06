import type * as React from 'react'

import { cn } from '~/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot='input'
			className={cn(
				// Exact style guide specs: height 40px, corner radius 6px, border Neutral Gray, background white, text Neutral Dark Gray, placeholder Neutral Gray, padding 8px 12px
				'flex h-10 w-full min-w-0 rounded-[6px] border border-[#D1D5DB] bg-white px-3 py-2 text-body text-neutral-dark-gray placeholder:text-neutral-gray shadow-none transition-colors duration-[150ms] ease-out outline-none',
				// Active border: 2px Primary Dark Green
				'focus-visible:border-2 focus-visible:border-primary-dark-green',
				// File input styling
				'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-dark-gray',
				// Selection styling using style guide colors
				'selection:bg-primary-dark-green selection:text-white',
				// Disabled state
				'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
				// Invalid state with error styling
				'aria-invalid:border-error-red aria-invalid:border-2 aria-invalid:ring-0',
				// Dark mode support
				'dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary dark:placeholder:text-dark-text-secondary dark:focus-visible:border-dark-primary-green',
				className,
			)}
			{...props}
		/>
	)
}

export { Input }
