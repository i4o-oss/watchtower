import {
	useState,
	useEffect,
	createContext,
	useContext,
	useCallback,
} from 'react'
import { cn } from '~/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
	id: string
	title: string
	message?: string
	type: ToastType
	duration?: number
}

interface ToastContextType {
	toasts: Toast[]
	addToast: (toast: Omit<Toast, 'id'>) => void
	removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
		const id = Math.random().toString(36).substr(2, 9)
		const newToast = { ...toast, id }
		setToasts((prev) => [...prev, newToast])

		// Auto remove after duration (default 5 seconds)
		const duration = toast.duration || 5000
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id))
		}, duration)
	}, [])

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<ToastContainer toasts={toasts} removeToast={removeToast} />
		</ToastContext.Provider>
	)
}

export function useToast() {
	const context = useContext(ToastContext)
	if (context === undefined) {
		throw new Error('useToast must be used within a ToastProvider')
	}
	return context
}

interface ToastContainerProps {
	toasts: Toast[]
	removeToast: (id: string) => void
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
	return (
		<div className='fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full'>
			{toasts.map((toast) => (
				<ToastItem
					key={toast.id}
					toast={toast}
					onRemove={removeToast}
				/>
			))}
		</div>
	)
}

interface ToastItemProps {
	toast: Toast
	onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Trigger animation after mount
		const timer = setTimeout(() => setIsVisible(true), 50)
		return () => clearTimeout(timer)
	}, [])

	const handleRemove = () => {
		setIsVisible(false)
		setTimeout(() => onRemove(toast.id), 150)
	}

	const getIcon = () => {
		switch (toast.type) {
			case 'success':
				return <CheckCircle className='h-5 w-5 text-green-500' />
			case 'error':
				return <AlertCircle className='h-5 w-5 text-red-500' />
			case 'warning':
				return <AlertTriangle className='h-5 w-5 text-yellow-500' />
			case 'info':
				return <Info className='h-5 w-5 text-blue-500' />
		}
	}

	const getBackgroundColor = () => {
		switch (toast.type) {
			case 'success':
				return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
			case 'error':
				return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
			case 'info':
				return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
		}
	}

	return (
		<div
			className={cn(
				'rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
				getBackgroundColor(),
				isVisible
					? 'translate-x-0 opacity-100'
					: 'translate-x-full opacity-0',
			)}
		>
			<div className='flex items-start gap-3'>
				{getIcon()}
				<div className='flex-1 min-w-0'>
					<h4 className='text-sm font-medium text-foreground'>
						{toast.title}
					</h4>
					{toast.message && (
						<p className='text-sm text-muted-foreground mt-1'>
							{toast.message}
						</p>
					)}
				</div>
				<button
					onClick={handleRemove}
					className='flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors'
				>
					<X className='h-4 w-4' />
				</button>
			</div>
		</div>
	)
}

// Convenience hooks for different toast types
export function useSuccessToast() {
	const { addToast } = useToast()
	return useCallback(
		(title: string, message?: string) =>
			addToast({ title, message, type: 'success' }),
		[addToast],
	)
}

export function useErrorToast() {
	const { addToast } = useToast()
	return useCallback(
		(title: string, message?: string) =>
			addToast({ title, message, type: 'error', duration: 7000 }),
		[addToast],
	)
}

export function useWarningToast() {
	const { addToast } = useToast()
	return useCallback(
		(title: string, message?: string) =>
			addToast({ title, message, type: 'warning' }),
		[addToast],
	)
}

export function useInfoToast() {
	const { addToast } = useToast()
	return useCallback(
		(title: string, message?: string) =>
			addToast({ title, message, type: 'info' }),
		[addToast],
	)
}
