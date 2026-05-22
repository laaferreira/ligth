import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppError, AppErrorOptions, AppErrorSource } from './app-error.model';

@Injectable({ providedIn: 'root' })
export class ErrorMapperService {
  normalize(error: unknown, options: AppErrorOptions = {}): AppError {
    if (error instanceof HttpErrorResponse) {
      return this.fromHttpError(error, options);
    }

    if (this.isErrorLike(error)) {
      return this.fromObject(error, options);
    }

    return {
      code: options.code || 'UNKNOWN_ERROR',
      title: options.title || 'Erro inesperado',
      message: options.fallbackMessage || 'Ocorreu um erro inesperado.',
      source: options.source || 'unknown',
      severity: options.severity || 'error',
      context: options.context,
      originalError: error
    };
  }

  private fromHttpError(error: HttpErrorResponse, options: AppErrorOptions): AppError {
    const body = this.unwrapErrorBody(error.error);
    const message = this.firstText(
      body['message'],
      body['error_description'],
      body['error'],
      body['msg'],
      error.message,
      options.fallbackMessage,
      this.messageByStatus(error.status)
    );

    return {
      code: options.code || this.firstText(body['code'], this.codeByStatus(error.status), 'HTTP_ERROR'),
      title: options.title || 'Falha na requisição',
      message,
      details: this.firstText(body['details'], body['hint'], body['hint_message']),
      status: error.status,
      source: options.source || 'http',
      severity: options.severity || 'error',
      context: options.context,
      correlationId: error.headers.get('x-request-id') || undefined,
      originalError: error
    };
  }

  private fromObject(error: Record<string, unknown>, options: AppErrorOptions): AppError {
    const source = options.source || this.detectSource(error);
    const message = this.firstText(
      this.asString(error['message']),
      this.asString(error['error_description']),
      this.asString(error['details']),
      options.fallbackMessage,
      'Ocorreu um erro inesperado.'
    );

    return {
      code: options.code || this.firstText(this.asString(error['code']), this.defaultCodeBySource(source), 'APP_ERROR'),
      title: options.title || this.titleBySource(source),
      message,
      details: this.firstText(this.asString(error['hint']), this.asString(error['details'])),
      status: this.asNumber(error['status']),
      source,
      severity: options.severity || 'error',
      context: options.context,
      correlationId: this.asString(error['correlationId']) || this.asString(error['requestId']),
      originalError: error
    };
  }

  private unwrapErrorBody(errorBody: unknown): Record<string, string> {
    if (this.isErrorLike(errorBody)) {
      return Object.entries(errorBody).reduce<Record<string, string>>((result, [key, value]) => {
        if (typeof value === 'string') {
          result[key] = value;
        }
        return result;
      }, {});
    }

    if (typeof errorBody === 'string') {
      return { message: errorBody };
    }

    return {};
  }

  private detectSource(error: Record<string, unknown>): AppErrorSource {
    const code = (this.asString(error['code']) || '').toUpperCase();
    if (code.startsWith('PGRST') || code.startsWith('42') || code.startsWith('23')) {
      return 'supabase';
    }

    if (code.startsWith('AUTH') || (this.asString(error['name']) || '').includes('Auth')) {
      return 'auth';
    }

    return 'unknown';
  }

  private titleBySource(source: AppErrorSource): string {
    const titles: Record<AppErrorSource, string> = {
      http: 'Falha na requisição',
      supabase: 'Falha de banco de dados',
      auth: 'Falha de autenticação',
      validation: 'Falha de validação',
      runtime: 'Falha de execução',
      unknown: 'Erro inesperado'
    };

    return titles[source];
  }

  private defaultCodeBySource(source: AppErrorSource): string {
    const codes: Record<AppErrorSource, string> = {
      http: 'HTTP_ERROR',
      supabase: 'SUPABASE_ERROR',
      auth: 'AUTH_ERROR',
      validation: 'VALIDATION_ERROR',
      runtime: 'RUNTIME_ERROR',
      unknown: 'UNKNOWN_ERROR'
    };

    return codes[source];
  }

  private messageByStatus(status: number): string {
    const messages: Record<number, string> = {
      0: 'Não foi possível alcançar o serviço remoto.',
      400: 'A requisição foi rejeitada pelo servidor.',
      401: 'Sua sessão expirou ou não é válida.',
      403: 'Você não tem permissão para executar esta ação.',
      404: 'O recurso solicitado não foi encontrado.',
      409: 'O servidor rejeitou a operação por conflito de dados.',
      422: 'O servidor rejeitou a validação dos dados enviados.',
      500: 'O servidor encontrou um erro interno.'
    };

    return messages[status] || 'Ocorreu um erro na comunicação com o servidor.';
  }

  private codeByStatus(status: number): string {
    const codes: Record<number, string> = {
      400: 'HTTP_BAD_REQUEST',
      401: 'HTTP_UNAUTHORIZED',
      403: 'HTTP_FORBIDDEN',
      404: 'HTTP_NOT_FOUND',
      409: 'HTTP_CONFLICT',
      422: 'HTTP_UNPROCESSABLE_ENTITY',
      500: 'HTTP_INTERNAL_SERVER_ERROR'
    };

    return codes[status] || 'HTTP_ERROR';
  }

  private isErrorLike(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private asNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find(value => !!value && value.trim().length > 0) || '';
  }
}