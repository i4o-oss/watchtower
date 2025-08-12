import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

interface UptimeSparklineProps {
	data?: { value: number }[]
	color?: string
	className?: string
}

export function UptimeSparkline({
	data = [],
	color = '#10b981',
	className = '',
}: UptimeSparklineProps) {
	// Use provided data or generate stable sample data based on a seed
	// This prevents data from changing on every render
	const chartData =
		data.length > 0
			? data
			: Array.from({ length: 24 }, (_, i) => ({
					// Use index as seed for consistent data
					value: (i * 7 + 13) % 10 > 1 ? 100 : 0,
				}))

	return (
		<ResponsiveContainer width='100%' height='100%' className={className}>
			<LineChart
				data={chartData}
				margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
			>
				<YAxis hide domain={[0, 100]} />
				<Line
					type='stepAfter'
					dataKey='value'
					stroke={color}
					strokeWidth={2}
					dot={false}
					animationDuration={300}
				/>
			</LineChart>
		</ResponsiveContainer>
	)
}
