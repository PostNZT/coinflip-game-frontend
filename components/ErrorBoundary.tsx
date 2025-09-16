'use client'

import React from 'react'
import toast from 'react-hot-toast'
import { logError, logWarn } from '../utils/logger'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }

    // Global error handlers for unhandled promise rejections and errors
    this.setupGlobalErrorHandlers()
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
      window.addEventListener('error', this.handleGlobalError)
    }
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    logError('Unhandled Promise Rejection', event.reason)

    // Show toast notification instead of crashing
    toast.error('Connection error occurred. Please try again.', {
      id: 'unhandled-rejection',
    })

    // Prevent the error from causing a crash
    event.preventDefault()
  }

  private handleGlobalError = (event: ErrorEvent): void => {
    logError('Global Error', event.error)

    // Show toast notification for global errors
    toast.error('An unexpected error occurred. Please refresh if issues persist.', {
      id: 'global-error',
    })

    // Prevent the error from causing a crash
    event.preventDefault()
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Filter out WebSocket-related errors that should be handled gracefully
    const errorMessage = error.message?.toLowerCase() || ''

    if (
      errorMessage.includes('websocket') ||
      errorMessage.includes('socket.io') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    ) {
      // These are connection-related errors that shouldn't crash the app
      logWarn('Connection error caught by Error Boundary, handling gracefully:', error)
      toast.error('Connection issue detected. Please check your internet connection.', {
        id: 'connection-error-boundary',
      })
      return { hasError: false } // Don't show error boundary for connection errors
    }

    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError('Error Boundary caught an error', { error, errorInfo })

    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Show toast notification
    toast.error('An error occurred. You can try to recover or reload the page.', {
      id: 'error-boundary',
    })
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      retryCount: this.state.retryCount + 1
    })

    // Show loading toast
    toast.loading('Recovering...', {
      id: 'error-recovery',
      duration: 2000,
    })
  }

  private handleReload = (): void => {
    // Clear any existing timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Show loading toast
    toast.loading('Reloading application...', {
      id: 'app-reload',
    })

    // Delay reload slightly to show the toast
    this.retryTimeoutId = setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  override componentWillUnmount(): void {
    // Clean up global error handlers
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
      window.removeEventListener('error', this.handleGlobalError)
    }

    // Clear timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  override render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
          <div className="card w-full max-w-md bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl justify-center text-error">
                <AlertTriangle className="h-6 w-6" />
                Something went wrong
              </h2>
              <p className="text-base-content/70 text-center">
                The application encountered an unexpected error.
              </p>

              <div className="alert alert-error mt-4">
                <AlertTriangle className="h-4 w-4" />
                <div className="space-y-2">
                  <p className="font-mono text-sm">
                    {this.state.error?.message || 'Unknown error occurred'}
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">Error Details (Dev Mode)</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-left bg-base-300 p-2 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {this.state.retryCount > 0 && (
                <p className="text-sm text-base-content/70 text-center">
                  Retry attempts: {this.state.retryCount}
                </p>
              )}

              <div className="card-actions justify-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= 3}
                    className={`btn flex-1 ${this.state.retryCount >= 3 ? 'btn-disabled' : 'btn-primary'}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {this.state.retryCount >= 3 ? 'Max Retries' : 'Try Again'}
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="btn btn-outline flex-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}