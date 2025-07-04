import { createLazyComponent, JsonEditorSkeleton } from '~/lib/lazy'

// Lazy load the JSON Editor component since Monaco Editor is heavy
export const LazyJsonEditor = createLazyComponent(
	() =>
		import('./json-editor').then((module) => ({
			default: module.JsonEditor,
		})),
	<JsonEditorSkeleton />,
)
