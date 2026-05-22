export type AppErrorSource = 'http' | 'supabase' | 'auth' | 'validation' | 'runtime' | 'unknown';

export type AppErrorSeverity = 'error' | 'warning' | 'info';

export interface AppError {
  code: string;
  title: string;
  message: string;
  details?: string;
  status?: number;
  source: AppErrorSource;
  severity: AppErrorSeverity;
  context?: string;
  correlationId?: string;
  originalError?: unknown;
}

export interface AppErrorOptions {
  context?: string;
  fallbackMessage?: string;
  source?: AppErrorSource;
  code?: string;
  title?: string;
  severity?: AppErrorSeverity;
}