import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data: { session } } = await supabaseService.getAuth().getSession();

  if (session) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
