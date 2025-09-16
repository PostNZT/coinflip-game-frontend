'use client'

import React from 'react'
import toast from 'react-hot-toast'
import { logError, logWarn } from '../utils/logger'

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
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-center text-red-600 mb-4">
              Something went wrong
            </h2>
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">
                The application encountered an unexpected error.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-700 font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2 text-xs text-red-600">
                    <summary className="cursor-pointer">Error Details (Dev Mode)</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-left">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
              {this.state.retryCount > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  Retry attempts: {this.state.retryCount}
                </p>
              )}
            </div>
            <div className="text-center space-x-4">
              <button
                onClick={this.handleRetry}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
                disabled={this.state.retryCount >= 3}
              >
                {this.state.retryCount >= 3 ? 'Max Retries' : 'Try Again'}
              </button>
              <button
                onClick={this.handleReload}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}