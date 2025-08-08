import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { Badge } from '~/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Play,
	Pause,
	Edit,
	Trash2,
	Activity,
	CheckCircle2,
	XCircle,
	Clock,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Settings2,
} from 'lucide-react'

export interface Endpoint {
	id: string
	name: string
	url: string
	method: string
	enabled: boolean
	expected_status_code: number
	timeout_seconds: number
	check_interval_seconds: number
	created_at: string
	updated_at: string
	description?: string
}

interface EndpointsTableProps {
	data: Endpoint[]
	isLoading?: boolean
	onToggleEndpoint: (endpoint: Endpoint) => void
	onDeleteEndpoint: (endpoint: Endpoint) => void
}

export function EndpointsTable({
	data,
	isLoading = false,
	onToggleEndpoint,
	onDeleteEndpoint,
}: EndpointsTableProps) {
	const navigate = useNavigate()
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		{},
	)
	const [rowSelection, setRowSelection] = useState({})
	const [globalFilter, setGlobalFilter] = useState('')

	const columns: ColumnDef<Endpoint>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() =>
								column.toggleSorting(
									column.getIsSorted() === 'asc',
								)
							}
							className='h-auto p-0 font-medium hover:bg-transparent'
						>
							Name
							{column.getIsSorted() === 'asc' ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === 'desc' ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4 opacity-50' />
							)}
						</Button>
					)
				},
				cell: ({ row }) => {
					const endpoint = row.original
					return (
						<div className='space-y-1'>
							<div className='font-semibold text-base'>
								{endpoint.name}
							</div>
							{endpoint.description && (
								<div className='text-sm text-muted-foreground line-clamp-1'>
									{endpoint.description}
								</div>
							)}
						</div>
					)
				},
			},
			{
				accessorKey: 'url',
				header: 'URL',
				cell: ({ row }) => (
					<div className='font-mono text-sm bg-muted/50 px-2 py-1 rounded max-w-xs truncate'>
						{row.getValue('url')}
					</div>
				),
			},
			{
				accessorKey: 'method',
				header: 'Method',
				cell: ({ row }) => (
					<Badge
						variant='outline'
						className='font-mono text-xs font-semibold'
					>
						{row.getValue('method')}
					</Badge>
				),
			},
			{
				accessorKey: 'enabled',
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() =>
								column.toggleSorting(
									column.getIsSorted() === 'asc',
								)
							}
							className='h-auto p-0 font-medium hover:bg-transparent'
						>
							Status
							{column.getIsSorted() === 'asc' ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === 'desc' ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4 opacity-50' />
							)}
						</Button>
					)
				},
				cell: ({ row }) => {
					const enabled = row.getValue('enabled') as boolean
					return (
						<Badge
							variant={enabled ? 'default' : 'secondary'}
							className='gap-1.5'
						>
							{enabled ? (
								<CheckCircle2 className='h-3 w-3' />
							) : (
								<XCircle className='h-3 w-3' />
							)}
							{enabled ? 'Active' : 'Disabled'}
						</Badge>
					)
				},
				filterFn: (row, id, value) => {
					if (value === 'all') return true
					return value === 'active'
						? row.getValue(id)
						: !row.getValue(id)
				},
			},
			{
				accessorKey: 'expected_status_code',
				header: 'Status Code',
				cell: ({ row }) => (
					<div className='text-center font-medium'>
						{row.getValue('expected_status_code')}
					</div>
				),
			},
			{
				accessorKey: 'timeout_seconds',
				header: ({ column }) => (
					<div className='flex items-center gap-1'>
						<Clock className='h-3 w-3' />
						Timeout
					</div>
				),
				cell: ({ row }) => (
					<div className='text-center'>
						{row.getValue('timeout_seconds')}s
					</div>
				),
			},
			{
				accessorKey: 'check_interval_seconds',
				header: 'Interval',
				cell: ({ row }) => (
					<div className='text-center'>
						{row.getValue('check_interval_seconds')}s
					</div>
				),
			},
			{
				accessorKey: 'created_at',
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() =>
								column.toggleSorting(
									column.getIsSorted() === 'asc',
								)
							}
							className='h-auto p-0 font-medium hover:bg-transparent'
						>
							Created
							{column.getIsSorted() === 'asc' ? (
								<ArrowUp className='ml-2 h-4 w-4' />
							) : column.getIsSorted() === 'desc' ? (
								<ArrowDown className='ml-2 h-4 w-4' />
							) : (
								<ArrowUpDown className='ml-2 h-4 w-4 opacity-50' />
							)}
						</Button>
					)
				},
				cell: ({ row }) => {
					const date = new Date(row.getValue('created_at'))
					return (
						<div className='text-sm'>
							{date.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</div>
					)
				},
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({ row }) => {
					const endpoint = row.original
					return (
						<div className='flex items-center gap-1'>
							<Button
								variant='ghost'
								size='sm'
								className='h-8 w-8 p-0'
								onClick={() =>
									navigate(`/admin/endpoints/${endpoint.id}`)
								}
							>
								<Activity className='h-4 w-4' />
							</Button>
							<Button
								variant='ghost'
								size='sm'
								className='h-8 w-8 p-0'
								onClick={() =>
									navigate(
										`/admin/endpoints/${endpoint.id}/edit`,
									)
								}
							>
								<Edit className='h-4 w-4' />
							</Button>
							<Button
								variant='ghost'
								size='sm'
								className='h-8 w-8 p-0'
								onClick={() => onToggleEndpoint(endpoint)}
							>
								{endpoint.enabled ? (
									<Pause className='h-4 w-4' />
								) : (
									<Play className='h-4 w-4' />
								)}
							</Button>
							<Button
								variant='ghost'
								size='sm'
								className='h-8 w-8 p-0 text-destructive hover:text-destructive'
								onClick={() => onDeleteEndpoint(endpoint)}
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						</div>
					)
				},
			},
		],
		[navigate, onToggleEndpoint, onDeleteEndpoint],
	)

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: 'includesString',
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	})

	return (
		<div className='space-y-4'>
			{/* Filters and Controls */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex flex-1 items-center gap-4'>
					<div className='relative flex-1 max-w-sm'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder='Search all columns...'
							value={globalFilter ?? ''}
							onChange={(event) =>
								setGlobalFilter(String(event.target.value))
							}
							className='pl-10'
						/>
					</div>
					<Select
						value={
							(table
								.getColumn('enabled')
								?.getFilterValue() as string) ?? 'all'
						}
						onValueChange={(value) =>
							table
								.getColumn('enabled')
								?.setFilterValue(
									value === 'all' ? undefined : value,
								)
						}
					>
						<SelectTrigger className='w-36'>
							<SelectValue placeholder='All Status' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All Status</SelectItem>
							<SelectItem value='active'>Active</SelectItem>
							<SelectItem value='disabled'>Disabled</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='flex items-center gap-2'>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								size='sm'
								className='gap-2'
							>
								<Settings2 className='h-4 w-4' />
								View
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end' className='w-48'>
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className='capitalize'
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									)
								})}
						</DropdownMenuContent>
					</DropdownMenu>
					<div className='text-sm text-muted-foreground'>
						{table.getFilteredRowModel().rows.length} of{' '}
						{data.length} endpoint(s)
					</div>
				</div>
			</div>

			{/* Table */}
			<div className='rounded-md border bg-background'>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											className='text-left'
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef
															.header,
														header.getContext(),
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, index) => (
								<TableRow key={index}>
									{columns.map((_, cellIndex) => (
										<TableCell key={cellIndex}>
											<div className='h-4 bg-muted animate-pulse rounded' />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={
										row.getIsSelected() && 'selected'
									}
									className='cursor-pointer hover:bg-muted/50'
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className='py-4'
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-24 text-center'
								>
									<div className='flex flex-col items-center justify-center py-12'>
										<Activity
											className='h-12 w-12 text-muted-foreground mb-4'
											strokeWidth={1}
										/>
										<p className='text-lg font-semibold mb-2'>
											No endpoints found
										</p>
										<p className='text-sm text-muted-foreground'>
											{globalFilter ||
											columnFilters.length > 0
												? 'Try adjusting your search terms or filters'
												: 'Get started by creating your first monitoring endpoint'}
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center space-x-2'>
					<p className='text-sm font-medium'>Rows per page</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value))
						}}
					>
						<SelectTrigger className='h-8 w-[70px]'>
							<SelectValue
								placeholder={
									table.getState().pagination.pageSize
								}
							/>
						</SelectTrigger>
						<SelectContent side='top'>
							{[5, 10, 20, 30, 50].map((pageSize) => (
								<SelectItem
									key={pageSize}
									value={`${pageSize}`}
								>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className='flex items-center space-x-6 lg:space-x-8'>
					<div className='flex items-center space-x-2'>
						<p className='text-sm font-medium'>
							Page {table.getState().pagination.pageIndex + 1} of{' '}
							{table.getPageCount()}
						</p>
					</div>
					<div className='flex items-center space-x-2'>
						<Button
							variant='outline'
							className='hidden h-8 w-8 p-0 lg:flex'
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<span className='sr-only'>Go to first page</span>
							<ChevronsLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							className='h-8 w-8 p-0'
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<span className='sr-only'>Go to previous page</span>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							className='h-8 w-8 p-0'
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<span className='sr-only'>Go to next page</span>
							<ChevronRight className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							className='hidden h-8 w-8 p-0 lg:flex'
							onClick={() =>
								table.setPageIndex(table.getPageCount() - 1)
							}
							disabled={!table.getCanNextPage()}
						>
							<span className='sr-only'>Go to last page</span>
							<ChevronsRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
