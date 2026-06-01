import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type UpdatePasswordPayload = {
  userId?: string;
  password?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
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
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Validar token do solicitante
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
    return jsonResponse({ error: 'Requesting user not found.' }, 403);
  }

  if (!requestingUser.is_active) {
    return jsonResponse({ error: 'Inactive users cannot update passwords.' }, 403);
  }

  if (!['administrador', 'gerente'].includes(requestingUser.role)) {
    return jsonResponse({ error: 'Insufficient permissions.' }, 403);
  }

  const payload = (await request.json()) as UpdatePasswordPayload;
  const { userId, password } = payload;

  if (!userId || typeof userId !== 'string') {
    return jsonResponse({ error: 'userId é obrigatório.' }, 400);
  }

  if (!password || password.length < 6) {
    return jsonResponse({ error: 'A senha deve ter no mínimo 6 caracteres.' }, 400);
  }

  // Gerente não pode alterar senha de Administrador
  if (requestingUser.role === 'gerente') {
    const { data: targetUser, error: targetError } = await adminClient
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return jsonResponse({ error: 'Usuário alvo não encontrado.' }, 404);
    }

    if (targetUser.role === 'administrador') {
      return jsonResponse({ error: 'Gerentes não podem alterar a senha de Administradores.' }, 403);
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });

  if (updateError) {
    return jsonResponse({ error: updateError.message || 'Erro ao atualizar a senha.' }, 500);
  }

  return jsonResponse({ success: true });
});
