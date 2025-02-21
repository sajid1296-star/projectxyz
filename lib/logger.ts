import prisma from './prisma';

type LogLevel = 'info' | 'warning' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: any;
}

class Logger {
  private log(entry: LogEntry) {
    console.log(JSON.stringify(entry));

    // Hier könnte man die Logs auch in einen Service wie CloudWatch 
    // oder einen anderen Logging-Service schreiben
  }

  info(message: string, context?: string, metadata?: any) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      metadata,
    });
  }

  warning(message: string, context?: string, metadata?: any) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context,
      metadata,
    });
  }

  error(message: string, context?: string, metadata?: any) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      metadata,
    });
  }
}

export const logger = new Logger();

export async function logSystemEvent(
  level: LogLevel,
  message: string,
  source: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        message,
        source,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to create system log:', error);
    // Fallback auf console.log im Fehlerfall
    console.log(`${level.toUpperCase()}: ${message} (${source})`, metadata);
  }
}

// Hilfsfunktionen für verschiedene Log-Level
export const logger = {
  info: (message: string, source: string, metadata?: Record<string, any>) =>
    logSystemEvent('info', message, source, metadata),
  
  warning: (message: string, source: string, metadata?: Record<string, any>) =>
    logSystemEvent('warning', message, source, metadata),
  
  error: (message: string, source: string, metadata?: Record<string, any>) =>
    logSystemEvent('error', message, source, metadata),
}; 