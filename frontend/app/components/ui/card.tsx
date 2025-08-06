import type * as React from 'react'

import { cn } from '~/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card'
			className={cn(
				// Exact style guide specs: white background, 1px border #E5E7EB, shadow, 8px radius, 20px padding
				'bg-white text-neutral-dark-gray flex flex-col gap-6 rounded-[8px] border border-[#E5E7EB] p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary',
				className,
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-header'
			className={cn(
				// Card header with proper spacing and grid layout
				'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
				className,
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-title'
			className={cn(
				// Use H3 typography from style guide: 20px/28px, Semibold
				'text-h3 text-neutral-dark-gray dark:text-dark-text-primary',
				className,
			)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-description'
			className={cn(
				// Use body typography from style guide: 14px/20px, Regular, Neutral Gray color
				'text-body text-neutral-gray dark:text-dark-text-secondary',
				className,
			)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-action'
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-content'
			className={cn(
				// Content area with body text styling
				'text-body text-neutral-dark-gray dark:text-dark-text-primary',
				className,
			)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-footer'
			className={cn(
				// Footer with body text styling and proper spacing
				'flex items-center text-body text-neutral-dark-gray [.border-t]:pt-6 dark:text-dark-text-primary',
				className,
			)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
}
