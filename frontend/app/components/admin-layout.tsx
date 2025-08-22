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
	BookOpenIcon,
	ChevronDown,
	ExternalLinkIcon,
	GithubIcon,
	Globe,
	HomeIcon,
	InfoIcon,
	LogOutIcon,
	Menu,
	Settings,
	SettingsIcon,
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
		name: 'Endpoints',
		href: '/admin/endpoints',
		icon: Globe,
		description: 'Manage monitoring endpoints',
	},
	{
		name: 'Incidents',
		href: '/admin/incidents',
		icon: AlertTriangle,
		description: 'Track and manage incidents',
	},
	// {
	//   name: "Notifications",
	//   href: "/admin/notifications",
	//   icon: Bell,
	//   description: "Configure alert channels",
	// },
]

const breadcrumbMap: Record<string, string> = {
	admin: 'Dashboard',
	endpoints: 'Endpoints',
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
			<header className='sticky top-4 z-30 h-16'>
				<div className='w-full h-full max-w-4xl bg-card mx-auto px-6 border border-border rounded'>
					<div className='flex h-full items-center justify-between'>
						<div className='flex items-center gap-4'>
							<Link
								to='/admin'
								className='flex items-center gap-2'
							>
								<Activity className='h-4 w-4 text-primary' />
								<span className='text-sm font-mono uppercase'>
									Watchtower
								</span>
							</Link>
						</div>

						{/* Right - Header Actions */}
						<div className='flex items-center gap-4'>
							{navigation.map((item) => {
								const Icon = item.icon
								const active = isActive(item.href)

								return (
									<Link key={item.href} to={item.href}>
										<Button
											className='cursor-pointer'
											size='sm'
											variant={
												active ? 'default' : 'ghost'
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
										className='w-8 h-8 cursor-pointer'
										size='sm'
										variant='secondary'
									>
										<UserIcon className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align='end'
									className='w-64'
								>
									<DropdownMenuLabel>
										My Account
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem className='cursor-pointer'>
										<SettingsIcon className='h-4 w-4' />
										Settings
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem>
										<a
											className='w-full flex items-center justify-between'
											href='https://github.com/i4o-oss/watchtower'
											rel='noopener noreferrer'
											target='_blank'
										>
											<span className='flex items-center gap-2'>
												<BookOpenIcon className='h-4 w-4' />
												Docs
											</span>
											<ExternalLinkIcon className='h-4 w-4' />
										</a>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<a
											className='w-full flex items-center justify-between'
											href='https://github.com/i4o-oss/watchtower'
											rel='noopener noreferrer'
											target='_blank'
										>
											<span className='flex items-center gap-2'>
												<GithubIcon className='h-4 w-4' />
												Github
											</span>
											<ExternalLinkIcon className='h-4 w-4' />
										</a>
									</DropdownMenuItem>
									<DropdownMenuItem className='flex justify-between cursor-pointer'>
										<span className='flex items-center gap-2'>
											<InfoIcon className='h-4 w-4' />
											About
										</span>
										<span className='text-xs'>v0.1.0</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem className='cursor-pointer'>
										<LogOutIcon className='h-4 w-4' />
										Logout
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</header>

			<div className='sticky top-24 h-16 z-30 bg-card'>
				<div className='w-full h-full max-w-4xl mx-auto flex items-center justify-between px-6 py-3 rounded border border-border'>
					<div className='flex items-center text-sm text-muted-foreground'>
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
											{breadcrumbMap[segment] ===
											'Dashboard' ? (
												<HomeIcon className='w-4 h-4' />
											) : (
												breadcrumbMap[segment] ||
												segment
											)}
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
											{breadcrumbMap[segment] ===
											'Dashboard' ? (
												<HomeIcon className='w-4 h-4' />
											) : (
												breadcrumbMap[segment] ||
												segment
											)}
										</Link>
									)}
								</span>
							),
						)}
					</div>
					<div className='flex items-center gap-2'>
						<Badge
							className='px-4 py-2 font-mono uppercase'
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
			<div className='max-w-4xl mx-auto flex mt-8'>
				{/* Main Content Area */}
				<main className='flex-1 min-w-0'>
					<div className='px-0 py-4'>
						{isLoading ? (
							<div className='space-y-4'>
								<div className='space-y-2'>
									<Skeleton className='h-8 w-64' />
									<Skeleton className='h-4 w-96' />
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton
											// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
		</div>
	)
}
