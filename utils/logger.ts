/**
 * Logging utility that handles development vs production logging
 * In production, errors are logged silently (no console output)
 * In development, full error details are shown
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []
  private maxLogs = 100 // Keep last 100 logs for debugging

  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    }
  }

  private addToLogs(entry: LogEntry): void {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest log
    }
  }

  /**
   * Log error messages
   * In development: Shows in console with full details
   * In production: Logs silently for debugging
   */
  error(message: string, data?: unknown): void {
    const entry = this.createLogEntry('error', message, data)
    this.addToLogs(entry)

    if (this.isDevelopment) {
      if (data) {
        console.log(`🚨 ${message}`, data)
      } else {
        console.log(`🚨 ${message}`)
      }
    }
    // // In production, errors are logged silently to this.logs
  }

  /**
   * Log warning messages
   * In development: Shows in console
   * In production: Logs silently
   */
  warn(message: string, data?: unknown): void {
    const entry = this.createLogEntry('warn', message, data)
    this.addToLogs(entry)

    if (this.isDevelopment) {
      if (data) {
        console.warn(`⚠️ ${message}`, data)
      } else {
        console.warn(`⚠️ ${message}`)
      }
    }
  }

  /**
   * Log info messages
   * In development: Shows in console
   * In production: Logs silently
   */
  info(message: string, data?: unknown): void {
    const entry = this.createLogEntry('info', message, data)
    this.addToLogs(entry)

    if (this.isDevelopment) {
      if (data) {
        console.log(`ℹ️ ${message}`, data)
      } else {
        console.log(`ℹ️ ${message}`)
      }
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: unknown): void {
    const entry = this.createLogEntry('debug', message, data)
    this.addToLogs(entry)

    if (this.isDevelopment) {
      if (data) {
        console.debug(`🔍 ${message}`, data)
      } else {
        console.debug(`🔍 ${message}`)
      }
    }
  }

  /**
   * Get recent logs (useful for error reporting)
   */
  getRecentLogs(count = 10): LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Get all error logs
   */
  getErrorLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error')
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Force console output (for critical errors that should always be visible)
   */
  forceError(message: string, data?: unknown): void {
    const entry = this.createLogEntry('error', message, data)
    this.addToLogs(entry)

    // Always log to console regardless of environment
    if (data) {
      console.error(`🚨 CRITICAL: ${message}`, data)
    } else {
      console.error(`🚨 CRITICAL: ${message}`)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const logError = (message: string, data?: unknown) => logger.error(message, data)
export const logWarn = (message: string, data?: unknown) => logger.warn(message, data)
export const logInfo = (message: string, data?: unknown) => logger.info(message, data)
export const logDebug = (message: string, data?: unknown) => logger.debug(message, data)
export const forceLogError = (message: string, data?: unknown) => logger.forceError(message, data)