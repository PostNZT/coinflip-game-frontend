/**
 * Debug utilities for accessing logs in production
 * Only available when explicitly called (not automatic)
 */

import { logger } from './logger'

declare global {
  interface Window {
    debugCoinflip?: {
      getLogs: () => void
      getErrorLogs: () => void
      clearLogs: () => void
    }
  }
}

/**
 * Attach debug utilities to window object for manual debugging
 * Call this in browser console: window.debugCoinflip.getLogs()
 */
export function attachDebugUtils(): void {
  if (typeof window !== 'undefined') {
    window.debugCoinflip = {
      getLogs: () => {
        const logs = logger.getRecentLogs(20)
        console.table(logs)
        return logs
      },

      getErrorLogs: () => {
        const errorLogs = logger.getErrorLogs()
        console.table(errorLogs)
        return errorLogs
      },

      clearLogs: () => {
        logger.clearLogs()
        console.log('🧹 Logs cleared')
      }
    }

    console.log('🔧 Debug utilities attached to window.debugCoinflip')
    console.log('Available commands:')
    console.log('  window.debugCoinflip.getLogs() - View recent logs')
    console.log('  window.debugCoinflip.getErrorLogs() - View error logs only')
    console.log('  window.debugCoinflip.clearLogs() - Clear all logs')
  }
}

/**
 * Auto-attach debug utils in development
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  attachDebugUtils()
}