import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, withNavigationErrorHandler, NavigationError } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandlerService } from './core/errors/global-error-handler.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';

const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|Loading chunk .* failed/i;

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withNavigationErrorHandler((e: NavigationError) => {
      if (CHUNK_LOAD_ERROR.test(e.error?.message ?? '')) {
        window.location.reload();
      }
    })),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    importProvidersFrom(MatSnackBarModule),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideAnimationsAsync()
  ]
};
