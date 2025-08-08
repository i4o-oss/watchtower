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
	Home,
	Menu,
	Settings,
	User,
	X,
} from 'lucide-react'

interface AdminLayoutProps {
	children: React.ReactNode
	isLoading?: boolean
}

const navigation = [
	{
		name: 'Dashboard',
		href: '/admin',
		icon: Home,
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

export function AdminLayout({ children, isLoading = false }: AdminLayoutProps) {
	const location = useLocation()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	const isActive = (href: string) => {
		if (href === '/admin') {
			return location.pathname === '/admin'
		}
		return location.pathname.startsWith(href)
	}

	const closeMobileMenu = () => setIsMobileMenuOpen(false)

	// Generate breadcrumbs based on current path
	const getBreadcrumbs = (pathname: string) => {
		const segments = pathname.split('/').filter(Boolean)
		if (segments.length <= 1) return 'Dashboard'

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

		return segments
			.map((segment) => breadcrumbMap[segment] || segment)
			.join(' > ')
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Top Header Bar */}
			<header className='sticky top-0 z-30 h-16 bg-white border-b border-gray-200'>
				<div className='max-w-[94rem] mx-auto px-6'>
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
								<Activity className='h-6 w-6 text-emerald-600' />
								<span className='text-h4 font-semibold text-gray-900'>
									Watchtower
								</span>
							</Link>
						</div>

						{/* Right - Header Actions */}
						<div className='flex items-center gap-3'>
							<Button
								variant='outline'
								size='sm'
								className='hidden sm:flex'
							>
								<Settings className='h-4 w-4 mr-2' />
								Settings
							</Button>
							<Link to='/dashboard'>
								<Button variant='ghost' size='sm'>
									<span className='hidden sm:inline'>
										User Dashboard
									</span>
									<span className='sm:hidden'>Dashboard</span>
								</Button>
							</Link>
							{/* User Profile */}
							<div className='hidden lg:flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors'>
								<div className='h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center'>
									<User className='h-4 w-4 text-emerald-600' />
								</div>
								<div className='text-sm'>
									<div className='font-medium text-gray-900'>
										Admin
									</div>
								</div>
								<ChevronDown className='h-4 w-4 text-gray-400' />
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Breadcrumb Bar */}
			<div className='bg-white border-b border-gray-100 hidden lg:block'>
				<div className='max-w-[94rem] mx-auto px-6 py-3'>
					<div className='text-sm text-gray-500'>
						{getBreadcrumbs(location.pathname)}
					</div>
				</div>
			</div>

			{/* Layout Container */}
			<div className='max-w-[94rem] mx-auto flex'>
				{/* Desktop Sidebar */}
				<aside className='hidden lg:block w-60 shrink-0'>
					<div className='sticky top-[129px] h-[calc(100vh-129px)] px-6 py-6'>
						{/* Navigation */}
						<nav className='space-y-1'>
							{navigation.map((item) => {
								const Icon = item.icon
								const active = isActive(item.href)

								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-out',
											active
												? 'bg-emerald-600 text-white shadow-sm'
												: 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
										)}
									>
										<Icon
											className={cn(
												'h-5 w-5',
												active
													? 'text-white'
													: 'text-gray-500',
											)}
										/>
										<span>{item.name}</span>
									</Link>
								)
							})}
						</nav>
					</div>
				</aside>

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
					<div
						className='fixed inset-0 bg-gray-900/50 backdrop-blur-sm'
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
									<Activity className='h-6 w-6 text-emerald-600' />
									<span className='text-h4 font-medium text-gray-900'>
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
													? 'bg-emerald-600 text-white shadow-sm'
													: 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
											)}
										>
											<Icon
												className={cn(
													'h-5 w-5 flex-shrink-0',
													active
														? 'text-white'
														: 'text-gray-500',
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
							<div className='p-4 border-t bg-gray-50'>
								<h4 className='text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide'>
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
