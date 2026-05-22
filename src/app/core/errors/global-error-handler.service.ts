import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorPresenterService } from './error-presenter.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    const presenter = this.injector.get(ErrorPresenterService);
    presenter.handle(error, {
      context: 'GlobalErrorHandler',
      source: 'runtime',
      code: 'RUNTIME_UNHANDLED',
      title: 'Erro inesperado',
      fallbackMessage: 'Ocorreu um erro inesperado no sistema.',
      duration: 6000
    });
  }
}