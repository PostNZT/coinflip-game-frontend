'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { logError } from '../utils/logger'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    logError('Global Error caught', error)

    // Show toast notification
    toast.error('A critical error occurred. The application will attempt to recover.', {
      id: 'global-error-page',
    })
  }, [error])

  const handleRetry = () => {
    toast.loading('Attempting to recover...', {
      id: 'global-recovery',
      duration: 2000,
    })

    setTimeout(() => {
      reset()
    }, 1000)
  }

  const handleReload = () => {
    toast.loading('Reloading application...', {
      id: 'global-reload',
    })

    setTimeout(() => {
      window.location.href = '/'
    }, 1000)
  }

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-center text-red-600 mb-4">
              Critical Error
            </h2>
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">
                The application encountered a critical error and needs to recover.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-700">
                  {error.message || 'Unknown critical error occurred'}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            </div>
            <div className="text-center space-x-4">
              <button
                onClick={handleRetry}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Try Again
              </button>
              <button
                onClick={handleReload}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}