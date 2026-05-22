import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorPresenterService } from '../errors/error-presenter.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorPresenter = inject(ErrorPresenterService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      errorPresenter.handle(error, {
        context: `${req.method} ${req.url}`,
        source: 'http',
        showToUser: false,
        fallbackMessage: 'Falha ao processar a requisição.'
      });

      return throwError(() => error);
    })
  );
};