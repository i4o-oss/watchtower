import type { Route } from './+types/home'
import { Welcome } from '../welcome/welcome'

// biome-ignore lint: lint/correctness/noEmptyPattern
export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New React Router App' },
		{ name: 'description', content: 'Welcome to React Router!' },
	]
}

export default function Home() {
	return <Welcome />
}
