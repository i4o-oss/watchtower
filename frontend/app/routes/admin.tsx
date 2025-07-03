import { Outlet } from 'react-router'
import { AdminLayout } from '~/components/admin-layout'
import { requireAuth } from '~/lib/auth'
import type { Route } from './+types/admin'

export async function clientLoader() {
	await requireAuth('/login')
	return null
}

export default function AdminLayoutRoute() {
	return (
		<AdminLayout>
			<Outlet />
		</AdminLayout>
	)
}
