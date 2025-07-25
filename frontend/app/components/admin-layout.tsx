import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import {
	Activity,
	AlertTriangle,
	BarChart3,
	Bell,
	Globe,
	Home,
	Menu,
	Settings,
	Users,
	X,
} from 'lucide-react'

interface AdminLayoutProps {
	children: React.ReactNode
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

export function AdminLayout({ children }: AdminLayoutProps) {
	const location = useLocation()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	const isActive = (href: string) => {
		if (href === '/admin') {
			return location.pathname === '/admin'
		}
		return location.pathname.startsWith(href)
	}

	const closeMobileMenu = () => setIsMobileMenuOpen(false)

	return (
		<div className='min-h-screen bg-background'>
			{/* Header */}
			<header className='sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
				<div className='container mx-auto px-4'>
					<div className='flex h-16 items-center justify-between'>
						<div className='flex items-center gap-4'>
							{/* Mobile menu button */}
							<Button
								variant='ghost'
								size='sm'
								className='lg:hidden'
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
							>
								{isMobileMenuOpen ? (
									<X className='h-5 w-5' />
								) : (
									<Menu className='h-5 w-5' />
								)}
							</Button>

							<Link
								to='/admin'
								className='flex items-center gap-2 font-semibold'
							>
								<Activity className='h-6 w-6' />
								<span className='hidden sm:inline'>
									Watchtower Admin
								</span>
								<span className='sm:hidden'>Admin</span>
							</Link>
						</div>

						<div className='flex items-center gap-2'>
							<Badge variant='outline' className='hidden md:flex'>
								Admin Panel
							</Badge>
							<Link to='/dashboard'>
								<Button variant='ghost' size='sm'>
									<span className='hidden sm:inline'>
										User Dashboard
									</span>
									<span className='sm:hidden'>Dashboard</span>
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile Navigation Overlay */}
			{isMobileMenuOpen && (
				<div className='fixed inset-0 z-50 lg:hidden'>
					<div
						className='fixed inset-0 bg-black/50'
						onClick={closeMobileMenu}
					/>
					<div className='fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg'>
						<div className='p-4'>
							<div className='flex items-center justify-between mb-6'>
								<div className='flex items-center gap-2'>
									<Activity className='h-5 w-5' />
									<span className='font-semibold'>Admin</span>
								</div>
								<Button
									variant='ghost'
									size='sm'
									onClick={closeMobileMenu}
								>
									<X className='h-4 w-4' />
								</Button>
							</div>

							<nav className='space-y-2'>
								{navigation.map((item) => {
									const Icon = item.icon
									const active = isActive(item.href)

									return (
										<Link
											key={item.name}
											to={item.href}
											onClick={closeMobileMenu}
											className={cn(
												'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full',
												'hover:bg-accent hover:text-accent-foreground',
												active
													? 'bg-accent text-accent-foreground font-medium'
													: 'text-muted-foreground',
											)}
										>
											<Icon className='h-4 w-4' />
											<span>{item.name}</span>
										</Link>
									)
								})}
							</nav>

							{/* Mobile Quick Actions */}
							<div className='mt-6 pt-4 border-t'>
								<h4 className='text-sm font-medium mb-3'>
									Quick Actions
								</h4>
								<div className='space-y-2'>
									<Link
										to='/admin/endpoints/new'
										onClick={closeMobileMenu}
									>
										<Button
											variant='outline'
											size='sm'
											className='w-full justify-start'
										>
											<Globe className='h-4 w-4 mr-2' />
											Add Endpoint
										</Button>
									</Link>
									<Link
										to='/admin/incidents/new'
										onClick={closeMobileMenu}
									>
										<Button
											variant='outline'
											size='sm'
											className='w-full justify-start'
										>
											<AlertTriangle className='h-4 w-4 mr-2' />
											Create Incident
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className='container mx-auto px-4 py-6'>
				<div className='flex gap-6'>
					{/* Desktop Sidebar Navigation */}
					<aside className='hidden lg:block w-64 shrink-0'>
						<Card className='p-4'>
							<nav className='space-y-2'>
								{navigation.map((item) => {
									const Icon = item.icon
									const active = isActive(item.href)

									return (
										<Link
											key={item.name}
											to={item.href}
											className={cn(
												'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
												'hover:bg-accent hover:text-accent-foreground',
												active
													? 'bg-accent text-accent-foreground font-medium'
													: 'text-muted-foreground',
											)}
										>
											<Icon className='h-4 w-4' />
											<div className='flex-1'>
												<div className='font-medium'>
													{item.name}
												</div>
												<div className='text-xs text-muted-foreground'>
													{item.description}
												</div>
											</div>
										</Link>
									)
								})}
							</nav>

							{/* Desktop Quick Actions */}
							<div className='mt-6 pt-4 border-t'>
								<h4 className='text-sm font-medium mb-3'>
									Quick Actions
								</h4>
								<div className='space-y-2'>
									<Link
										to='/admin/endpoints/new'
										className='block'
									>
										<Button
											variant='outline'
											size='sm'
											className='w-full justify-start'
										>
											<Globe className='h-4 w-4 mr-2' />
											Add Endpoint
										</Button>
									</Link>
									<Link
										to='/admin/incidents/new'
										className='block'
									>
										<Button
											variant='outline'
											size='sm'
											className='w-full justify-start'
										>
											<AlertTriangle className='h-4 w-4 mr-2' />
											Create Incident
										</Button>
									</Link>
								</div>
							</div>
						</Card>
					</aside>

					{/* Main Content */}
					<main className='flex-1 min-w-0'>{children}</main>
				</div>
			</div>
		</div>
	)
}
