import { PageHeader } from '~/components/page-header'
import { PageContent } from '~/components/page-content'
import { SettingsForm } from '~/components/settings-form'
import { CardContent } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

export default function SettingsPage() {
	return (
		<PageContent className='flex flex-grow gap-0 p-0 overflow-hidden rounded shadow-none'>
			<PageHeader
				title='Settings'
				description='Configure site settings and admin credentials'
			/>
			<Separator />
			<SettingsForm />
		</PageContent>
	)
}
