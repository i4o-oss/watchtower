import { createLazyComponent, ChartsSkeleton } from '~/lib/lazy'

// Lazy load the Monitoring Charts component since Recharts is heavy
export const LazyMonitoringCharts = createLazyComponent(
	() =>
		import('./monitoring-charts').then((module) => ({
			default: module.MonitoringCharts,
		})),
	<ChartsSkeleton />,
)
