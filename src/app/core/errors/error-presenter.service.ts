import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppError, AppErrorOptions } from './app-error.model';
import { ErrorLoggerService } from './error-logger.service';
import { ErrorMapperService } from './error-mapper.service';

export interface ErrorPresentationOptions extends AppErrorOptions {
  showToUser?: boolean;
  actionLabel?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorPresenterService {
  constructor(
    private snackBar: MatSnackBar,
    private errorMapper: ErrorMapperService,
    private errorLogger: ErrorLoggerService
  ) {}

  handle(error: unknown, options: ErrorPresentationOptions = {}): AppError {
    const appError = this.errorMapper.normalize(error, options);
    this.present(appError, options);
    return appError;
  }

  present(error: AppError, options: ErrorPresentationOptions = {}): void {
    this.errorLogger.log(error);

    if (options.showToUser === false) {
      return;
    }

    this.snackBar.open(error.message, options.actionLabel || 'OK', {
      duration: options.duration || 5000
    });
  }
}