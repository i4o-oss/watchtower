import { Outlet, useNavigation } from 'react-router'
import { AdminLayout } from '~/components/admin-layout'
import { requireAuth } from '~/lib/auth'

export async function clientLoader() {
	await requireAuth('/login')
	return null
}

export default function AdminLayoutRoute() {
	const navigation = useNavigation()
	const isLoading = navigation.state === 'loading'

	return (
		<AdminLayout isLoading={isLoading}>
			<Outlet />
		</AdminLayout>
	)
}
