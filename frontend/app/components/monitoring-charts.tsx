import { useState, useEffect } from 'react'
import {
	LineChart,
	Line,
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'

interface MonitoringData {
	timestamp: string
	success: boolean
	response_time_ms: number | null
	status_code: number | null
	endpoint_name: string
	endpoint_id: string
}

interface ChartDataPoint {
	time: string
	responseTime: number
	success: number
	failure: number
	timestamp: string
}

interface UptimeDataPoint {
	date: string
	uptime: number
	total: number
	successful: number
}

interface StatusDistribution {
	name: string
	value: number
	color: string
}

const COLORS = {
	success: '#22c55e',
	failure: '#ef4444',
	warning: '#f59e0b',
	info: '#3b82f6',
}

export function MonitoringCharts({ 
	logs, 
	endpoints, 
	timeRange 
}: { 
	logs: MonitoringData[]
	endpoints: any[]
	timeRange: string 
}) {
	const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all')
	const [chartData, setChartData] = useState<ChartDataPoint[]>([])
	const [uptimeData, setUptimeData] = useState<UptimeDataPoint[]>([])
	const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([])

	useEffect(() => {
		processChartData()
	}, [logs, selectedEndpoint, timeRange])

	const processChartData = () => {
		let filteredLogs = logs
		
		if (selectedEndpoint !== 'all') {
			filteredLogs = logs.filter(log => log.endpoint_id === selectedEndpoint)
		}

		// Group by hour for response time chart
		const hourlyData = new Map<string, { success: number; failure: number; responseTimes: number[] }>()
		
		filteredLogs.forEach(log => {
			const hour = new Date(log.timestamp).toISOString().slice(0, 13) + ':00:00'
			const existing = hourlyData.get(hour) || { success: 0, failure: 0, responseTimes: [] }
			
			if (log.success) {
				existing.success++
				if (log.response_time_ms) {
					existing.responseTimes.push(log.response_time_ms)
				}
			} else {
				existing.failure++
			}
			
			hourlyData.set(hour, existing)
		})

		// Convert to chart data
		const chartPoints: ChartDataPoint[] = Array.from(hourlyData.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-24) // Last 24 hours
			.map(([time, data]) => ({
				time: new Date(time).toLocaleTimeString('en-US', { 
					hour: '2-digit', 
					minute: '2-digit',
					hour12: false 
				}),
				timestamp: time,
				responseTime: data.responseTimes.length > 0 
					? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
					: 0,
				success: data.success,
				failure: data.failure,
			}))

		setChartData(chartPoints)

		// Calculate daily uptime
		const dailyData = new Map<string, { total: number; successful: number }>()
		
		filteredLogs.forEach(log => {
			const date = new Date(log.timestamp).toISOString().slice(0, 10)
			const existing = dailyData.get(date) || { total: 0, successful: 0 }
			
			existing.total++
			if (log.success) {
				existing.successful++
			}
			
			dailyData.set(date, existing)
		})

		const uptimePoints: UptimeDataPoint[] = Array.from(dailyData.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-30) // Last 30 days
			.map(([date, data]) => ({
				date: new Date(date).toLocaleDateString('en-US', { 
					month: 'short', 
					day: 'numeric' 
				}),
				uptime: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 100,
				total: data.total,
				successful: data.successful,
			}))

		setUptimeData(uptimePoints)

		// Status code distribution
		const statusCodes = new Map<string, number>()
		filteredLogs.forEach(log => {
			if (log.status_code) {
				const category = log.status_code >= 500 ? '5xx Server Error'
					: log.status_code >= 400 ? '4xx Client Error'
					: log.status_code >= 300 ? '3xx Redirect'
					: log.status_code >= 200 ? '2xx Success'
					: 'Other'
				
				statusCodes.set(category, (statusCodes.get(category) || 0) + 1)
			}
		})

		const distribution: StatusDistribution[] = Array.from(statusCodes.entries()).map(([name, value]) => ({
			name,
			value,
			color: name.startsWith('2xx') ? COLORS.success
				: name.startsWith('3xx') ? COLORS.info
				: name.startsWith('4xx') ? COLORS.warning
				: COLORS.failure
		}))

		setStatusDistribution(distribution)
	}

	return (
		<div className='space-y-6'>
			{/* Endpoint Filter */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center justify-between'>
						<span>Monitoring Analytics</span>
						<Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
							<SelectTrigger className='w-48'>
								<SelectValue placeholder='Select endpoint' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Endpoints</SelectItem>
								{endpoints.map((endpoint: any) => (
									<SelectItem key={endpoint.id} value={endpoint.id}>
										{endpoint.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</CardTitle>
					<CardDescription>
						Visualizing {selectedEndpoint === 'all' ? 'all endpoints' : endpoints.find(e => e.id === selectedEndpoint)?.name || 'selected endpoint'} over the last {timeRange} hours
					</CardDescription>
				</CardHeader>
			</Card>

			{/* Charts Grid */}
			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Response Time Chart */}
				<Card>
					<CardHeader>
						<CardTitle>Average Response Time</CardTitle>
						<CardDescription>Response time trends over the last 24 hours</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='h-80'>
							<ResponsiveContainer width='100%' height='100%'>
								<LineChart data={chartData}>
									<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
									<XAxis 
										dataKey='time' 
										className='text-xs' 
										tick={{ fontSize: 12 }}
									/>
									<YAxis 
										className='text-xs'
										tick={{ fontSize: 12 }}
										label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
									/>
									<Tooltip 
										labelClassName='text-foreground'
										contentStyle={{
											backgroundColor: 'hsl(var(--background))',
											border: '1px solid hsl(var(--border))',
											borderRadius: '6px'
										}}
										formatter={(value) => [`${value}ms`, 'Response Time']}
									/>
									<Line 
										type='monotone' 
										dataKey='responseTime' 
										stroke={COLORS.info}
										strokeWidth={2}
										dot={{ fill: COLORS.info, strokeWidth: 0, r: 3 }}
										activeDot={{ r: 5, stroke: COLORS.info, strokeWidth: 2 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Success/Failure Chart */}
				<Card>
					<CardHeader>
						<CardTitle>Success vs Failure Rate</CardTitle>
						<CardDescription>Hourly success and failure counts</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='h-80'>
							<ResponsiveContainer width='100%' height='100%'>
								<BarChart data={chartData}>
									<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
									<XAxis 
										dataKey='time' 
										className='text-xs'
										tick={{ fontSize: 12 }}
									/>
									<YAxis 
										className='text-xs'
										tick={{ fontSize: 12 }}
									/>
									<Tooltip 
										contentStyle={{
											backgroundColor: 'hsl(var(--background))',
											border: '1px solid hsl(var(--border))',
											borderRadius: '6px'
										}}
									/>
									<Bar dataKey='success' stackId='status' fill={COLORS.success} name='Success' />
									<Bar dataKey='failure' stackId='status' fill={COLORS.failure} name='Failure' />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Uptime Trend */}
				<Card>
					<CardHeader>
						<CardTitle>Daily Uptime Percentage</CardTitle>
						<CardDescription>Uptime trends over the last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='h-80'>
							<ResponsiveContainer width='100%' height='100%'>
								<AreaChart data={uptimeData}>
									<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
									<XAxis 
										dataKey='date' 
										className='text-xs'
										tick={{ fontSize: 12 }}
									/>
									<YAxis 
										domain={[0, 100]}
										className='text-xs'
										tick={{ fontSize: 12 }}
										label={{ value: '%', angle: -90, position: 'insideLeft' }}
									/>
									<Tooltip 
										contentStyle={{
											backgroundColor: 'hsl(var(--background))',
											border: '1px solid hsl(var(--border))',
											borderRadius: '6px'
										}}
										formatter={(value, name, props) => [
											`${value}%`,
											'Uptime',
											`${props.payload.successful}/${props.payload.total} requests`
										]}
									/>
									<Area 
										type='monotone' 
										dataKey='uptime' 
										stroke={COLORS.success}
										strokeWidth={2}
										fill={COLORS.success}
										fillOpacity={0.3}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Status Code Distribution */}
				<Card>
					<CardHeader>
						<CardTitle>HTTP Status Code Distribution</CardTitle>
						<CardDescription>Breakdown of response status codes</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='h-80'>
							<ResponsiveContainer width='100%' height='100%'>
								<PieChart>
									<Pie
										data={statusDistribution}
										cx='50%'
										cy='50%'
										labelLine={false}
										label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
										outerRadius={80}
										fill='#8884d8'
										dataKey='value'
									>
										{statusDistribution.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} />
										))}
									</Pie>
									<Tooltip 
										contentStyle={{
											backgroundColor: 'hsl(var(--background))',
											border: '1px solid hsl(var(--border))',
											borderRadius: '6px'
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>
						{statusDistribution.length > 0 && (
							<div className='flex flex-wrap gap-2 mt-4'>
								{statusDistribution.map((item, index) => (
									<div key={index} className='flex items-center gap-2'>
										<div 
											className='w-3 h-3 rounded-full' 
											style={{ backgroundColor: item.color }}
										/>
										<span className='text-sm'>{item.name}</span>
										<Badge variant='outline'>{item.value}</Badge>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}