import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type ImportPedidoRowPayload = {
  lineNumber?: number;
  pedidoId?: string;
  cliente?: string;
  dataVenda?: string | number | null;
  dataFinalizacao?: string | number | null;
  userId?: string;
  descricaoProduto?: string;
  custo?: string | number | null;
  valorUnitario?: string | number | null;
  quantidade?: string | number | null;
};

type ImportPedidoError = {
  lineNumber: number;
  pedidoId?: string;
  reason: string;
};

type ImportPedidoErrorSummary = {
  reason: string;
  count: number;
  sampleLines: number[];
};

type ImportPedidoGroup = {
  pedidoId: string;
  clienteId: number;
  userId: string;
  dataVenda: string;
  dataFinalizacao: string;
  itens: Array<{
    lineNumber: number;
    produtoId: number;
    quantidade: number;
    valorUnitario: number;
    custoUnitario: number;
    subtotal: number;
  }>;
};

const ERROR_DETAILS_LIMIT = 200;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/;+$/g, '').trim();
}

function normalizeLookupKey(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function extractClientName(value: unknown): string {
  const text = normalizeText(value);
  const clientName = text.split('(')[0]?.trim() || text;
  return clientName;
}

function extractProductDescription(value: unknown): string {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const separatorIndex = text.indexOf(' - ');
  if (separatorIndex >= 0) {
    return text.slice(separatorIndex + 3).trim();
  }

  return text;
}

function extractProductCode(value: unknown): string {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const separatorIndex = text.indexOf(' - ');
  if (separatorIndex >= 0) {
    return text.slice(0, separatorIndex).trim();
  }

  return '';
}

function normalizeProductCode(value: unknown): string {
  const text = normalizeLookupKey(value).replace(/\s+/g, '');
  if (!text) {
    return '';
  }

  if (/^\d+$/.test(text)) {
    return String(Number(text));
  }

  return text;
}

function buildProductLookupKeys(value: { descricao?: unknown; nome?: unknown; codigo?: unknown; sku?: unknown }): string[] {
  const descricao = normalizeText(value.descricao || value.nome);
  const codigo = normalizeText(value.codigo || value.sku);
  const keys = new Set<string>();

  [
    normalizeLookupKey(descricao),
    normalizeLookupKey(value.nome),
    normalizeLookupKey(codigo),
    normalizeProductCode(codigo),
    normalizeLookupKey(codigo && descricao ? `${codigo} - ${descricao}` : ''),
    normalizeLookupKey(codigo && descricao ? `${codigo}-${descricao}` : '')
  ].forEach(key => {
    if (key) {
      keys.add(key);
    }
  });

  return Array.from(keys);
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = normalizeText(value)
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function excelDateToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  const utcValue = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utcValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseDateValue(value: unknown): string | null {
  if (typeof value === 'number') {
    return excelDateToIso(value);
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function summarizeErrors(errors: ImportPedidoError[]): ImportPedidoErrorSummary[] {
  const summaryMap = new Map<string, ImportPedidoErrorSummary>();

  errors.forEach(error => {
    const existing = summaryMap.get(error.reason);

    if (existing) {
      existing.count += 1;
      if (existing.sampleLines.length < 5 && !existing.sampleLines.includes(error.lineNumber)) {
        existing.sampleLines.push(error.lineNumber);
      }
      return;
    }

    summaryMap.set(error.reason, {
      reason: error.reason,
      count: 1,
      sampleLines: error.lineNumber ? [error.lineNumber] : []
    });
  });

  return Array.from(summaryMap.values()).sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}

Deno.serve(async (request: Request) => {
  try {
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

    if (!requestingUser.is_active || requestingUser.role !== 'administrador') {
      return jsonResponse({ error: 'Somente administradores podem importar pedidos.' }, 403);
    }

    const payload = await request.json() as { rows?: ImportPedidoRowPayload[] };
    const rows = payload.rows || [];
    const pedidosRecebidos = new Set(
      rows
        .map(row => normalizeText(row.pedidoId))
        .filter(pedidoId => !!pedidoId)
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse({ error: 'Nenhuma linha foi enviada para importação.' }, 400);
    }

  const [clientesResponse, produtosResponse, usuariosResponse] = await Promise.all([
    adminClient.from('clientes').select('id, nome'),
    adminClient.from('produtos').select('id, descricao, nome, codigo, sku'),
    adminClient.from('app_users').select('id')
  ]);

  if (clientesResponse.error) {
    return jsonResponse({ error: clientesResponse.error.message }, 400);
  }

  if (produtosResponse.error) {
    return jsonResponse({ error: produtosResponse.error.message }, 400);
  }

  if (usuariosResponse.error) {
    return jsonResponse({ error: usuariosResponse.error.message }, 400);
  }

  const clientesMap = new Map<string, Array<{ id: number }>>();
  ((clientesResponse.data || []) as Array<{ id?: number | null; nome?: string | null }>).forEach(cliente => {
    if (cliente.id == null) {
      return;
    }

    const key = normalizeLookupKey(cliente.nome);
    if (!key) {
      return;
    }

    const bucket = clientesMap.get(key) || [];
    bucket.push({ id: cliente.id });
    clientesMap.set(key, bucket);
  });

  const produtosMap = new Map<string, Array<{ id: number }>>();
  ((produtosResponse.data || []) as Array<{ id?: number | null; descricao?: string | null; nome?: string | null; codigo?: string | null; sku?: string | null }>).forEach(produto => {
    const produtoId = produto.id;

    if (produtoId == null) {
      return;
    }

    buildProductLookupKeys(produto).forEach(key => {
      if (!key) {
        return;
      }

      const bucket = produtosMap.get(key) || [];
      bucket.push({ id: produtoId });
      produtosMap.set(key, bucket);
    });
  });

  const usuariosSet = new Set(
    ((usuariosResponse.data || []) as Array<{ id?: string | null }>)
      .map(usuario => usuario.id)
      .filter((id): id is string => !!id)
  );

  const errors: ImportPedidoError[] = [];
  const groups = new Map<string, ImportPedidoGroup>();

  for (const row of rows) {
    const lineNumber = Number(row.lineNumber || 0) || 0;
    const pedidoId = normalizeText(row.pedidoId);
    const cliente = extractClientName(row.cliente);
    const userId = normalizeText(row.userId);
    const codigoProduto = extractProductCode(row.descricaoProduto);
    const descricaoProduto = extractProductDescription(row.descricaoProduto);
    const quantidade = parseNumeric(row.quantidade);
    const valorUnitario = parseNumeric(row.valorUnitario);
    const custo = parseNumeric(row.custo);
    const dataVenda = parseDateValue(row.dataVenda);
    const dataFinalizacao = parseDateValue(row.dataFinalizacao) || dataVenda;

    if (!pedidoId || !cliente || !userId || !descricaoProduto) {
      errors.push({ lineNumber, pedidoId: pedidoId || undefined, reason: 'Campos obrigatórios ausentes na linha.' });
      continue;
    }

    if (!dataVenda || !dataFinalizacao) {
      errors.push({ lineNumber, pedidoId, reason: 'Data de venda ou data de finalização inválida.' });
      continue;
    }

    if (quantidade === null || quantidade <= 0) {
      errors.push({ lineNumber, pedidoId, reason: 'Quantidade inválida.' });
      continue;
    }

    if (valorUnitario === null || valorUnitario < 0) {
      errors.push({ lineNumber, pedidoId, reason: 'Preço unitário inválido.' });
      continue;
    }

    if (custo === null || custo < 0) {
      errors.push({ lineNumber, pedidoId, reason: 'Custo inválido.' });
      continue;
    }

    if (!usuariosSet.has(userId)) {
      errors.push({ lineNumber, pedidoId, reason: 'Usuário não encontrado em app_users.' });
      continue;
    }

    const clienteMatches = clientesMap.get(normalizeLookupKey(cliente)) || [];
    if (clienteMatches.length !== 1) {
      errors.push({ lineNumber, pedidoId, reason: clienteMatches.length === 0 ? 'Cliente não encontrado.' : 'Cliente duplicado no cadastro.' });
      continue;
    }

    const produtoMatchMap = new Map<number, { id: number }>();
    buildProductLookupKeys({
      codigo: codigoProduto,
      descricao: descricaoProduto,
      nome: descricaoProduto
    }).forEach(key => {
      (produtosMap.get(key) || []).forEach(produto => {
        produtoMatchMap.set(produto.id, produto);
      });
    });

    const produtoMatches = Array.from(produtoMatchMap.values());
    if (produtoMatches.length !== 1) {
      errors.push({ lineNumber, pedidoId, reason: produtoMatches.length === 0 ? 'Produto não encontrado.' : 'Produto duplicado no cadastro.' });
      continue;
    }

    const existingGroup = groups.get(pedidoId);
    const clienteId = clienteMatches[0].id;
    const produtoId = produtoMatches[0].id;

    if (existingGroup) {
      if (
        existingGroup.clienteId !== clienteId ||
        existingGroup.userId !== userId ||
        existingGroup.dataVenda !== dataVenda ||
        existingGroup.dataFinalizacao !== dataFinalizacao
      ) {
        errors.push({ lineNumber, pedidoId, reason: 'Cabeçalho do pedido inconsistente entre linhas do mesmo Pedido_ID.' });
        continue;
      }

      existingGroup.itens.push({
        lineNumber,
        produtoId,
        quantidade,
        valorUnitario,
        custoUnitario: custo,
        subtotal: Number((quantidade * valorUnitario).toFixed(2))
      });

      continue;
    }

    groups.set(pedidoId, {
      pedidoId,
      clienteId,
      userId,
      dataVenda,
      dataFinalizacao,
      itens: [{
        lineNumber,
        produtoId,
        quantidade,
        valorUnitario,
        custoUnitario: custo,
        subtotal: Number((quantidade * valorUnitario).toFixed(2))
      }]
    });
  }

  let pedidosInseridos = 0;
  let itensInseridos = 0;

  for (const group of groups.values()) {
    if (group.itens.length === 0) {
      continue;
    }

    const valorTotal = group.itens.reduce((total, item) => total + item.subtotal, 0);

    const pedidoInsert = await adminClient
      .from('pedidos')
      .insert([{
        cliente_id: group.clienteId,
        data: group.dataVenda,
        data_finalizacao: group.dataFinalizacao,
        status: 'finalizado',
        valor_total: Number(valorTotal.toFixed(2)),
        user_id: group.userId
      }])
      .select('id')
      .single();

    if (pedidoInsert.error || !pedidoInsert.data?.id) {
      group.itens.forEach(item => {
        errors.push({ lineNumber: item.lineNumber, pedidoId: group.pedidoId, reason: pedidoInsert.error?.message || 'Falha ao criar pedido.' });
      });
      continue;
    }

    const pedidoIdInserido = pedidoInsert.data.id as number;
    const itensInsert = await adminClient
      .from('itens_pedidos')
      .insert(group.itens.map(item => ({
        pedido_id: pedidoIdInserido,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.valorUnitario,
        custo_unitario: item.custoUnitario,
        subtotal: item.subtotal,
        user_id: group.userId
      })));

    if (itensInsert.error) {
      await adminClient.from('itens_pedidos').delete().eq('pedido_id', pedidoIdInserido);
      await adminClient.from('pedidos').delete().eq('id', pedidoIdInserido);

      group.itens.forEach(item => {
        errors.push({ lineNumber: item.lineNumber, pedidoId: group.pedidoId, reason: itensInsert.error?.message || 'Falha ao criar itens do pedido.' });
      });
      continue;
    }

    pedidosInseridos += 1;
    itensInseridos += group.itens.length;
  }

    return jsonResponse({
      totalLinhasRecebidas: rows.length,
      totalLinhasComSucesso: itensInseridos,
      totalPedidosIdentificados: pedidosRecebidos.size,
      totalPedidosAgrupados: groups.size,
      pedidosInseridos,
      itensInseridos,
      linhasIgnoradas: errors.length,
      detalhesLimitados: errors.length > ERROR_DETAILS_LIMIT,
      resumoErros: summarizeErrors(errors),
      errors: errors.slice(0, ERROR_DETAILS_LIMIT)
    });
  } catch (error) {
    console.error('admin-import-pedidos unexpected error', error);

    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro inesperado ao importar pedidos.'
    }, 500);
  }
});