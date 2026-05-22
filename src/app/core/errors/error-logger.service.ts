import { Injectable } from '@angular/core';
import { AppError } from './app-error.model';

@Injectable({ providedIn: 'root' })
export class ErrorLoggerService {
  log(error: AppError): void {
    const parts = [error.context, error.code, error.source].filter(Boolean);
    const header = parts.length ? `[${parts.join('][')}] ${error.title}` : error.title;

    console.groupCollapsed(header);
    console.error('message:', error.message);

    if (error.status !== undefined) {
      console.error('status:', error.status);
    }

    if (error.details) {
      console.error('details:', error.details);
    }

    if (error.correlationId) {
      console.error('correlationId:', error.correlationId);
    }

    if (error.originalError) {
      console.error('originalError:', error.originalError);
    }

    console.groupEnd();
  }
}