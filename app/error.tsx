'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { logError } from '../utils/logger'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error for debugging
    logError('Next.js Error Page caught', error)

    // Check if this is a WebSocket or connection error
    const errorMessage = error.message?.toLowerCase() || ''
    const isConnectionError = errorMessage.includes('websocket') ||
                             errorMessage.includes('socket.io') ||
                             errorMessage.includes('network') ||
                             errorMessage.includes('connection') ||
                             errorMessage.includes('fetch')

    if (isConnectionError) {
      // For connection errors, show a toast and attempt auto-recovery
      toast.error('Connection error detected. Attempting to reconnect...', {
        id: 'connection-error-page',
      })

      // Auto-retry connection errors after a short delay
      setTimeout(() => {
        reset()
      }, 3000)
    } else {
      // For other errors, show a toast but don't auto-retry
      toast.error('An error occurred. You can try to recover below.', {
        id: 'error-page',
      })
    }
  }, [error, reset])

  const handleRetry = () => {
    toast.loading('Attempting to recover...', {
      id: 'error-recovery',
      duration: 2000,
    })

    setTimeout(() => {
      reset()
    }, 1000)
  }

  const handleGoHome = () => {
    toast.loading('Returning to home...', {
      id: 'go-home',
    })

    setTimeout(() => {
      window.location.href = '/'
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-center text-orange-600 mb-4">
          Oops! Something went wrong
        </h2>
        <div className="text-center mb-6">
          <p className="text-gray-700 mb-4">
            The application encountered an error, but we can try to recover.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
            <p className="text-sm text-orange-700">
              {error.message || 'Unknown error occurred'}
            </p>
            {error.digest && (
              <p className="text-xs text-orange-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-gray-600 mb-2">
                Technical Details (Development Mode)
              </summary>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="text-center space-x-4">
          <button
            onClick={handleRetry}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}