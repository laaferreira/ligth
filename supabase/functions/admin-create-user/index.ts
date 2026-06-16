import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type UserRole = 'administrador' | 'gerente' | 'vendedor' | 'auxiliar_cliente';

type CreateUserPayload = {
  email?: string;
  nome?: string;
  role?: UserRole;
  comissao?: number;
  margemVendaOuro?: number;
  margemVendaPrata?: number;
  margemVendaBronze?: number;
  margemVendaElite?: number;
  password?: string;
};

type AppUser = {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  comissao: number;
  margemVendaOuro: number;
  margemVendaPrata: number;
  margemVendaBronze: number;
  margemVendaElite: number;
  created_at: string;
  created_by: string;
  is_active: boolean;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = request.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase environment variables are not configured.' }, 500);
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing bearer token.' }, 401);
  }

  const token = authHeader.replace('Bearer ', '').trim();

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: authUserData, error: authUserError } = await userClient.auth.getUser(token);

  if (authUserError || !authUserData.user) {
    return jsonResponse({ error: 'Invalid token.' }, 401);
  }

  const requestingUserId = authUserData.user.id;

  const { data: requestingUser, error: requestingUserError } = await adminClient
    .from('app_users')
    .select('id, role, is_active')
    .eq('id', requestingUserId)
    .single();

  if (requestingUserError || !requestingUser) {
    return jsonResponse({ error: 'Requesting user was not found in app_users.' }, 403);
  }

  if (!requestingUser.is_active) {
    return jsonResponse({ error: 'Inactive users cannot create users.' }, 403);
  }

  const payload = (await request.json()) as CreateUserPayload;
  const email = normalizeEmail(payload.email ?? '');
  const nome = (payload.nome ?? '').trim();
  const role = payload.role;
  const comissao = Number(payload.comissao ?? 0);
  const margemVendaOuro = Number(payload.margemVendaOuro ?? 35);
  const margemVendaPrata = Number(payload.margemVendaPrata ?? 50);
  const margemVendaBronze = Number(payload.margemVendaBronze ?? 100);
  const margemVendaElite = Number(payload.margemVendaElite ?? 20);
  const password = payload.password ?? '';

  if (!emailRegex.test(email)) {
    return jsonResponse({ error: 'Informe um e-mail válido.' }, 400);
  }

  if (!nome) {
    return jsonResponse({ error: 'Nome é obrigatório.' }, 400);
  }

  if (!role || !['administrador', 'gerente', 'vendedor', 'auxiliar_cliente'].includes(role)) {
    return jsonResponse({ error: 'Perfil inválido.' }, 400);
  }

  if (!Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
    return jsonResponse({ error: 'A comissão deve estar entre 0 e 100.' }, 400);
  }

  if (!Number.isFinite(margemVendaOuro) || margemVendaOuro < 0 || margemVendaOuro > 1000) {
    return jsonResponse({ error: 'A margem de venda Ouro deve estar entre 0 e 1000.' }, 400);
  }

  if (!Number.isFinite(margemVendaPrata) || margemVendaPrata < 0 || margemVendaPrata > 1000) {
    return jsonResponse({ error: 'A margem de venda Prata deve estar entre 0 e 1000.' }, 400);
  }

  if (!Number.isFinite(margemVendaBronze) || margemVendaBronze < 0 || margemVendaBronze > 1000) {
    return jsonResponse({ error: 'A margem de venda Bronze deve estar entre 0 e 1000.' }, 400);
  }

  if (!Number.isFinite(margemVendaElite) || margemVendaElite < 0 || margemVendaElite > 1000) {
    return jsonResponse({ error: 'A margem de venda Elite deve estar entre 0 e 1000.' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'Senha deve ter pelo menos 6 caracteres.' }, 400);
  }

  if (requestingUser.role !== 'administrador' && requestingUser.role !== 'gerente') {
    return jsonResponse({ error: 'Você não tem permissão para criar usuários.' }, 403);
  }

  if (requestingUser.role === 'gerente' && role === 'administrador') {
    return jsonResponse({ error: 'Apenas Administradores podem criar Administradores.' }, 403);
  }

  const { data: existingUser } = await adminClient
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return jsonResponse({ error: 'Já existe um usuário com esse e-mail.' }, 409);
  }

  const { data: createdAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nome,
      role
    }
  });

  if (createAuthError || !createdAuthUser.user) {
    return jsonResponse({ error: createAuthError?.message ?? 'Unable to create auth user.' }, 400);
  }

  const appUserInsert = {
    id: createdAuthUser.user.id,
    email,
    nome,
    role,
    comissao,
    margem_venda_ouro: margemVendaOuro,
    margem_venda_prata: margemVendaPrata,
    margem_venda_bronze: margemVendaBronze,
    margem_venda_elite: margemVendaElite,
    created_by: requestingUserId,
    is_active: true
  };

  const { data: insertedUser, error: insertError } = await adminClient
    .from('app_users')
    .insert([appUserInsert])
    .select('*')
    .single();

  if (insertError || !insertedUser) {
    await adminClient.auth.admin.deleteUser(createdAuthUser.user.id);
    return jsonResponse({ error: insertError?.message ?? 'Unable to insert app_users record.' }, 400);
  }

  return jsonResponse({ user: insertedUser as AppUser }, 200);
});
