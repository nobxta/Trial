/**
 * PRIORITY 5: Structured logging for webhook processing
 * Provides JSON-formatted logs with correlation fields for production monitoring
 */

interface LogContext {
  payment_id?: string;
  order_id?: string;
  payment_status?: string;
  order_status?: string;
  [key: string]: any;
}

/**
 * Structured logger for webhook operations
 * Outputs JSON-formatted logs suitable for production log aggregation
 */
export const webhookLogger = {
  info: (message: string, context?: LogContext) => {
    const logEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  },

  warn: (message: string, context?: LogContext) => {
    const logEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    console.warn(JSON.stringify(logEntry));
  },

  error: (message: string, error?: Error | any, context?: LogContext) => {
    const logEntry: any = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Include error details without sensitive data
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        // Don't include stack trace or full error object to avoid logging sensitive data
      };
    }

    console.error(JSON.stringify(logEntry));
  },
};

