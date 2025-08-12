import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { Separator } from '~/components/ui/separator'
import {
	Activity,
	AlertTriangle,
	BarChart3,
	Bell,
	ChevronDown,
	Globe,
	HomeIcon,
	Menu,
	Settings,
	User,
	UserIcon,
	X,
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuItem,
} from '~/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import { requireAuth } from '~/lib/auth'
import { useSSE } from '~/hooks/useSSE'

interface AdminLayoutProps {
	children: React.ReactNode
	isLoading?: boolean
}

const navigation = [
	{
		name: 'Dashboard',
		href: '/admin',
		icon: HomeIcon,
		description: 'Overview and quick stats',
	},
	{
		name: 'Endpoints',
		href: '/admin/endpoints',
		icon: Globe,
		description: 'Manage monitoring endpoints',
	},
	{
		name: 'Monitoring',
		href: '/admin/monitoring',
		icon: BarChart3,
		description: 'View logs and analytics',
	},
	{
		name: 'Incidents',
		href: '/admin/incidents',
		icon: AlertTriangle,
		description: 'Track and manage incidents',
	},
	{
		name: 'Notifications',
		href: '/admin/notifications',
		icon: Bell,
		description: 'Configure alert channels',
	},
]

const breadcrumbMap: Record<string, string> = {
	admin: 'Dashboard',
	endpoints: 'Endpoints',
	monitoring: 'Monitoring',
	incidents: 'Incidents',
	notifications: 'Notifications',
	channels: 'Channels',
	new: 'New',
	edit: 'Edit',
}

export function AdminLayout({ children, isLoading = false }: AdminLayoutProps) {
	const location = useLocation()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [incidents, setIncidents] = useState([])

	useSSE({
		incident_created: (event) => {
			try {
				const newIncident = JSON.parse(event.data)
				setIncidents((prev: any) => ({
					...prev,
					incidents: [...prev.incidents, newIncident],
					total: prev.total + 1,
				}))
			} catch (error) {
				console.error('Error parsing incident_created event:', error)
			}
		},
		incident_updated: (event) => {
			try {
				const updatedIncident = JSON.parse(event.data)
				setIncidents((prev: any) => {
					// If incident is now resolved, remove it from the list
					if (updatedIncident.status === 'resolved') {
						return {
							...prev,
							incidents: prev.incidents.filter(
								(incident: any) =>
									incident.id !== updatedIncident.id,
							),
							total: prev.total - 1,
						}
					}

					// Check if incident exists in current list
					const existingIncidentIndex = prev.incidents.findIndex(
						(incident: any) => incident.id === updatedIncident.id,
					)

					if (existingIncidentIndex !== -1) {
						// Update existing incident
						return {
							...prev,
							incidents: prev.incidents.map((incident: any) =>
								incident.id === updatedIncident.id
									? updatedIncident
									: incident,
							),
						}
					}
					// Add new incident if it should be visible (open or investigating)
					if (
						updatedIncident.status === 'open' ||
						updatedIncident.status === 'investigating'
					) {
						return {
							...prev,
							incidents: [...prev.incidents, updatedIncident],
							total: prev.total + 1,
						}
					}
					return prev
				})
			} catch (error) {
				console.error('Error parsing incident_updated event:', error)
			}
		},
		incident_deleted: (event) => {
			try {
				const deletedIncident = JSON.parse(event.data)
				setIncidents((prev: any) => ({
					...prev,
					incidents: prev.incidents.filter(
						(incident: any) => incident.id !== deletedIncident.id,
					),
					total: prev.total - 1,
				}))
			} catch (error) {
				console.error('Error parsing incident_deleted event:', error)
			}
		},
	})

	const isActive = (href: string) => {
		if (href === '/admin') {
			return location.pathname === '/admin'
		}
		return location.pathname.startsWith(href)
	}

	const closeMobileMenu = () => setIsMobileMenuOpen(false)

	// Generate breadcrumbs based on current path
	const getBreadcrumbs = (pathname: string) => {
		return pathname.split('/').filter(Boolean)
	}

	return (
		<div className='min-h-screen bg-background'>
			{/* Top Header Bar */}
			<header className='sticky top-0 z-30 h-16 bg-card border-b border-border'>
				<div className='w-full h-full max-w-6xl mx-auto px-6'>
					<div className='flex h-full items-center justify-between'>
						{/* Left - Logo and Mobile Menu */}
						<div className='flex items-center gap-4'>
							<Button
								variant='ghost'
								size='sm'
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
								className='h-9 w-9 p-0 lg:hidden'
							>
								{isMobileMenuOpen ? (
									<X className='h-5 w-5' />
								) : (
									<Menu className='h-5 w-5' />
								)}
							</Button>
							<Link
								to='/admin'
								className='flex items-center gap-3'
							>
								<Activity className='h-6 w-6 text-primary' />
								<span className='text-lg font-semibold text-foreground'>
									Watchtower
								</span>
							</Link>
						</div>

						{/* Right - Header Actions */}
						<div className='flex items-center gap-3'>
							{navigation.map((item) => {
								const Icon = item.icon
								const active = isActive(item.href)

								return (
									<Link key={item.href} to={item.href}>
										<Button
											className='cursor-pointer'
											size='sm'
											variant={
												location.pathname === item.href
													? 'default'
													: 'ghost'
											}
										>
											<Icon className='h-4 w-4' />
											{item.name}
										</Button>
									</Link>
								)
							})}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										className='cursor-pointer rounded-full'
										size='sm'
										variant='secondary'
									>
										<UserIcon className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align='end'
									className='w-48'
								>
									<DropdownMenuLabel>
										My Account
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem>Profile</DropdownMenuItem>
									<DropdownMenuItem>Billing</DropdownMenuItem>
									<DropdownMenuItem>Team</DropdownMenuItem>
									<DropdownMenuItem>
										Subscription
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</header>

			{/* Breadcrumb Bar */}
			<div className='h-16 bg-card border-b border-border hidden lg:block'>
				<div className='w-full h-full max-w-6xl mx-auto flex items-center justify-between px-6 py-3'>
					<div className='text-sm text-muted-foreground'>
						{getBreadcrumbs(location.pathname).map(
							(segment, index) => (
								<span key={segment}>
									{index > 0 && (
										<span className='mx-2'>/</span>
									)}
									{index ===
									getBreadcrumbs(location.pathname).length -
										1 ? (
										<span>
											{breadcrumbMap[segment] || segment}
										</span>
									) : (
										<Link
											to={
												navigation.find(
													(n) =>
														n.name ===
														breadcrumbMap[segment],
												)?.href as string
											}
											className='text-primary hover:underline'
										>
											{breadcrumbMap[segment] || segment}
										</Link>
									)}
								</span>
							),
						)}
					</div>
					<div className='flex items-center gap-2'>
						<Badge
							className='px-4 py-2'
							variant={
								incidents.length === 0
									? 'outline'
									: 'destructive'
							}
						>
							{incidents.length === 0 ? (
								<span className='bg-green-500 w-2 h-2 rounded-full -ml-1 mr-2' />
							) : (
								<span className='bg-red-500 w-2 h-2 rounded-full -ml-1 mr-2' />
							)}
							{incidents.length === 0
								? 'All Systems Operational'
								: 'Issues'}
						</Badge>
					</div>
				</div>
			</div>

			{/* Layout Container */}
			<div className='max-w-6xl mx-auto flex'>
				{/* Main Content Area */}
				<main className='flex-1 min-w-0'>
					<div className='px-6 py-6'>
						{isLoading ? (
							<div className='space-y-6'>
								<div className='space-y-2'>
									<Skeleton className='h-8 w-64' />
									<Skeleton className='h-4 w-96' />
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton
											key={i}
											className='h-32 w-full'
										/>
									))}
								</div>
							</div>
						) : (
							children
						)}
					</div>
				</main>
			</div>

			{/* Mobile Navigation Overlay */}
			{isMobileMenuOpen && (
				<div className='fixed inset-0 z-50 lg:hidden'>
					{/* Backdrop */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<div
						className='fixed inset-0 bg-background/80 backdrop-blur-sm'
						onClick={closeMobileMenu}
					/>

					{/* Mobile Menu */}
					<div className='fixed left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-200 ease-out'>
						<div className='flex flex-col h-full'>
							{/* Mobile Header */}
							<div className='flex items-center justify-between p-4 border-b'>
								<Link
									to='/admin'
									onClick={closeMobileMenu}
									className='flex items-center gap-3'
								>
									<Activity className='h-6 w-6 text-primary' />
									<span className='text-lg font-medium text-foreground'>
										Watchtower
									</span>
								</Link>
								<Button
									variant='ghost'
									size='sm'
									onClick={closeMobileMenu}
									className='h-9 w-9 p-0'
								>
									<X className='h-4 w-4' />
								</Button>
							</div>

							{/* Mobile Navigation */}
							<nav className='flex-1 p-4 space-y-2'>
								{navigation.map((item) => {
									const Icon = item.icon
									const active = isActive(item.href)

									return (
										<Link
											key={item.name}
											to={item.href}
											onClick={closeMobileMenu}
											className={cn(
												'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-150 ease-out min-h-[44px]',
												active
													? 'bg-primary text-primary-foreground shadow-sm'
													: 'text-foreground hover:bg-accent hover:text-accent-foreground',
											)}
										>
											<Icon
												className={cn(
													'h-5 w-5 flex-shrink-0',
													active
														? 'text-white'
														: 'text-muted-foreground',
												)}
											/>
											<div>
												<div className='font-medium'>
													{item.name}
												</div>
												<div className='text-xs opacity-75'>
													{item.description}
												</div>
											</div>
										</Link>
									)
								})}
							</nav>

							{/* Mobile Quick Actions */}
							<div className='p-4 border-t bg-muted/50'>
								<h4 className='text-sm font-semibold text-foreground mb-3 uppercase tracking-wide'>
									Quick Actions
								</h4>
								<div className='grid grid-cols-2 gap-2'>
									<Link
										to='/admin/endpoints/new'
										onClick={closeMobileMenu}
									>
										<Button
											variant='outline'
											className='w-full h-12 text-xs flex-col gap-1'
										>
											<Globe className='h-4 w-4' />
											Add Endpoint
										</Button>
									</Link>
									<Link
										to='/admin/incidents/new'
										onClick={closeMobileMenu}
									>
										<Button
											variant='outline'
											className='w-full h-12 text-xs flex-col gap-1'
										>
											<AlertTriangle className='h-4 w-4' />
											Create Incident
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
