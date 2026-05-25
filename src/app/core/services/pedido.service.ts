import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Pedido, CriarPedido, AtualizarPedido, ImportarPedidoLinha, ImportarPedidosResponse } from '../models/pedido.model';
import { environment } from '@env/environment';

type PedidoDbRow = {
  id?: number;
  cliente_id?: number | null;
  prazo_pagamento_id?: number | null;
  prazos_pagamento?: { descricao?: string | null } | Array<{ descricao?: string | null }> | null;
  forma_pagamento_id?: number | null;
  formas_pagamento?: { descricao?: string | null } | Array<{ descricao?: string | null }> | null;
  status?: string | null;
  valor_total?: number | string | null;
  data?: string | null;
  data_finalizacao?: string | null;
  observacao?: string | null;
  nota_fiscal?: boolean | null;
  user_id?: string | null;
  clientes?: { nome?: string | null; cpf_cnpj?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null } | Array<{ nome?: string | null; cpf_cnpj?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null }> | null;
};

type ItemPedidoDbRow = {
  id?: number;
  pedido_id?: number | null;
  produto_id?: number | null;
  quantidade?: number | string | null;
  preco_unitario?: number | string | null;
  custo_unitario?: number | string | null;
  subtotal?: number | string | null;
  produtos?: {
    descricao?: string | null;
    nome?: string | null;
    codigo?: string | null;
    sku?: string | null;
    precoCusto?: number | string | null;
    preco_custo?: number | string | null;
  } | Array<{
    descricao?: string | null;
    nome?: string | null;
    codigo?: string | null;
    sku?: string | null;
    precoCusto?: number | string | null;
    preco_custo?: number | string | null;
  }> | null;
};

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly table = 'pedidos';
  private readonly importOrdersFunctionName = environment.supabase.importOrdersFunctionName;
  private readonly itensPageSize = 1000;
  private readonly markupMinimoVendedor = 35;

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Pedido[]> {
    return from(this.listarComControleAcesso()).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Pedido[];
      })
    );
  }

  buscarPorId(id: number): Observable<Pedido> {
    return from(this.buscarPorIdComControleAcesso(id)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  criar(pedido: CriarPedido): Observable<Pedido> {
    return from(this.criarComUsuario(pedido)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  atualizar(id: number, pedido: AtualizarPedido): Observable<Pedido> {
    return from(this.atualizarComItens(id, pedido)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  importarPedidos(linhas: ImportarPedidoLinha[]): Observable<ImportarPedidosResponse> {
    return from(
      this.supabaseService.invokeFunction<{ rows: ImportarPedidoLinha[] }, ImportarPedidosResponse>(
        this.importOrdersFunctionName,
        { rows: linhas }
      )
    );
  }

  listarFinalizadosPorUsuarioPeriodo(userId: string, dataInicio: string, dataFim: string): Observable<Pedido[]> {
    return from(this.listarFinalizadosPorUsuarioPeriodoComItens(userId, dataInicio, dataFim)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Pedido[];
      })
    );
  }

  confirmar(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'confirmado' } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  cancelar(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'cancelado' } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  finalizar(id: number): Observable<Pedido> {
    const hoje = new Date().toISOString().slice(0, 10);

    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'finalizado', data_finalizacao: hoje } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  excluir(id: number): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
      })
    );
  }

  buscar(filtros: Record<string, any>): Observable<Pedido[]> {
    return from(this.buscarComControleAcesso(filtros)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as PedidoDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  private async listarComControleAcesso() {
    const { userId, role } = await this.getCurrentUserContext();
    let query = this.supabaseService.getClient()
      .from(this.table)
      .select('id, cliente_id, prazo_pagamento_id, forma_pagamento_id, status, valor_total, data, data_finalizacao, observacao, nota_fiscal, user_id, clientes(nome, cpf_cnpj, logradouro, numero, complemento, bairro, cidade, uf), prazos_pagamento(descricao), formas_pagamento(descricao)')
      .order('id', { ascending: false });

    if (role === 'vendedor') {
      query = query.eq('user_id', userId);
    }

    const pedidosResponse = await query;
    if (pedidosResponse.error || !pedidosResponse.data?.length) {
      return {
        data: ((pedidosResponse.data || []) as PedidoDbRow[]).map(row => this.fromDb(row)),
        error: pedidosResponse.error
      };
    }

    const pedidoIds = ((pedidosResponse.data || []) as PedidoDbRow[])
      .map(row => row.id)
      .filter((id): id is number => typeof id === 'number');

    const itensResponse = await this.listarItensPorPedidoIds(pedidoIds);

    if (itensResponse.error) {
      return { data: null, error: itensResponse.error };
    }

    const itensPorPedido = new Map<number, ItemPedidoDbRow[]>();
    ((itensResponse.data || []) as ItemPedidoDbRow[]).forEach(item => {
      const pedidoId = item.pedido_id;
      if (pedidoId == null) {
        return;
      }

      const itens = itensPorPedido.get(pedidoId) || [];
      itens.push(item);
      itensPorPedido.set(pedidoId, itens);
    });

    return {
      data: ((pedidosResponse.data || []) as PedidoDbRow[]).map(row => this.fromDb(row, itensPorPedido.get(row.id ?? 0) || [])),
      error: null
    };
  }

  private async listarFinalizadosPorUsuarioPeriodoComItens(userId: string, dataInicio: string, dataFim: string) {
    const pedidosResponse = await this.supabaseService.getClient()
      .from(this.table)
      .select('id, cliente_id, prazo_pagamento_id, forma_pagamento_id, status, valor_total, data, data_finalizacao, observacao, nota_fiscal, user_id, clientes(nome, cpf_cnpj, logradouro, numero, complemento, bairro, cidade, uf), prazos_pagamento(descricao), formas_pagamento(descricao)')
      .eq('user_id', userId)
      .in('status', ['finalizado', 'FINALIZADO'])
      .gte('data_finalizacao', dataInicio)
      .lte('data_finalizacao', dataFim)
      .order('data_finalizacao', { ascending: false })
      .order('id', { ascending: false });

    if (pedidosResponse.error || !pedidosResponse.data?.length) {
      return {
        data: ((pedidosResponse.data || []) as PedidoDbRow[]).map(row => this.fromDb(row)),
        error: pedidosResponse.error
      };
    }

    const pedidoIds = ((pedidosResponse.data || []) as PedidoDbRow[])
      .map(row => row.id)
      .filter((id): id is number => typeof id === 'number');

    const itensResponse = await this.listarItensPorPedidoIds(pedidoIds);

    if (itensResponse.error) {
      return { data: null, error: itensResponse.error };
    }

    const itensPorPedido = new Map<number, ItemPedidoDbRow[]>();
    ((itensResponse.data || []) as ItemPedidoDbRow[]).forEach(item => {
      const pedidoId = item.pedido_id;
      if (pedidoId == null) {
        return;
      }

      const itens = itensPorPedido.get(pedidoId) || [];
      itens.push(item);
      itensPorPedido.set(pedidoId, itens);
    });

    return {
      data: ((pedidosResponse.data || []) as PedidoDbRow[]).map(row => this.fromDb(row, itensPorPedido.get(row.id ?? 0) || [])),
      error: null
    };
  }

  private async buscarPorIdComControleAcesso(id: number) {
    const { userId, role, margemVendaOuro } = await this.getCurrentUserContext();
    let pedidoQuery = this.supabaseService.getClient()
      .from(this.table)
      .select('id, cliente_id, prazo_pagamento_id, forma_pagamento_id, status, valor_total, data, data_finalizacao, observacao, nota_fiscal, user_id, clientes(nome, cpf_cnpj, logradouro, numero, complemento, bairro, cidade, uf), prazos_pagamento(descricao), formas_pagamento(descricao)')
      .eq('id', id);

    if (role === 'vendedor') {
      pedidoQuery = pedidoQuery.eq('user_id', userId);
    }

    const pedidoResponse = await pedidoQuery.single();
    if (pedidoResponse.error || !pedidoResponse.data) {
      return pedidoResponse as { data: Pedido | null; error: any };
    }

    const itensResponse = await this.supabaseService.getClient()
      .from('itens_pedidos')
      .select('id, pedido_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal, produtos(descricao, nome, codigo, sku, precoCusto, preco_custo)')
      .eq('pedido_id', id)
      .order('id', { ascending: true });

    if (itensResponse.error) {
      return { data: null, error: itensResponse.error };
    }

    return {
      data: this.fromDb(
        pedidoResponse.data as PedidoDbRow,
        (itensResponse.data || []) as ItemPedidoDbRow[]
      ),
      error: null
    };
  }

  private async buscarComControleAcesso(filtros: Record<string, any>) {
    const { userId, role } = await this.getCurrentUserContext();
    let query = this.supabaseService.getClient()
      .from(this.table)
      .select('id, cliente_id, prazo_pagamento_id, forma_pagamento_id, status, valor_total, data, data_finalizacao, observacao, nota_fiscal, user_id, clientes(nome, cpf_cnpj, logradouro, numero, complemento, bairro, cidade, uf), prazos_pagamento(descricao), formas_pagamento(descricao)');

    Object.entries(filtros).forEach(([campo, valor]) => {
      query = query.eq(this.toDbField(campo), valor);
    });

    if (role === 'vendedor') {
      query = query.eq('user_id', userId);
    }

    return query;
  }

  private async criarComUsuario(pedido: CriarPedido) {
    const { userId, role, margemVendaOuro } = await this.getCurrentUserContext();
    const client = this.supabaseService.getClient();
    const pedidoInsert = await client
      .from(this.table)
      .insert([{ ...this.toDb(pedido), user_id: userId }])
      .select()
      .single();

    if (pedidoInsert.error || !pedidoInsert.data) {
      return pedidoInsert;
    }

    const pedidoId = (pedidoInsert.data as PedidoDbRow).id;
    if (!pedidoId) {
      return { data: null, error: new Error('Pedido criado sem identificador.') };
    }

    const itensInsert = await this.persistirItensPedido(pedidoId, pedido.itens, userId, role, margemVendaOuro);
    if (itensInsert.error) {
      await client.from(this.table).delete().eq('id', pedidoId);
      return { data: null, error: itensInsert.error };
    }

    const resultado = await this.buscarPorIdComControleAcesso(pedidoId);
    return resultado as { data: Pedido | null; error: any };
  }

  private async atualizarComItens(id: number, pedido: AtualizarPedido) {
    const { userId, role, margemVendaOuro } = await this.getCurrentUserContext();
    const client = this.supabaseService.getClient();
    const camposPedido = this.toDb(pedido);

    if (Object.keys(camposPedido).length > 0) {
      const updateResponse = await client
        .from(this.table)
        .update(camposPedido)
        .eq('id', id)
        .select('id')
        .single();

      if (updateResponse.error) {
        return { data: null, error: updateResponse.error };
      }
    }

    if (pedido.itens) {
      const deleteResponse = await client
        .from('itens_pedidos')
        .delete()
        .eq('pedido_id', id);

      if (deleteResponse.error) {
        return { data: null, error: deleteResponse.error };
      }

      const itensInsert = await this.persistirItensPedido(id, pedido.itens, userId, role, margemVendaOuro);
      if (itensInsert.error) {
        return { data: null, error: itensInsert.error };
      }
    }

    const resultado = await this.buscarPorIdComControleAcesso(id);
    return resultado as { data: Pedido | null; error: any };
  }

  private async getCurrentUserContext(): Promise<{ userId: string; role: string | null; margemVendaOuro: number }> {
    const { data: authData, error: authError } = await this.supabaseService.getAuth().getUser();
    if (authError || !authData.user) {
      throw authError || new Error('Usuário autenticado não encontrado.');
    }

    const userId = authData.user.id;
    const { data: userData } = await this.supabaseService.getClient()
      .from('app_users')
      .select('role, margemVendaOuro, margem_venda_ouro')
      .eq('id', userId)
      .maybeSingle();

    const userRow = userData as { role?: string; margemVendaOuro?: number | string | null; margem_venda_ouro?: number | string | null } | null;

    return {
      userId,
      role: userRow?.role || null,
      margemVendaOuro: this.toNumber(userRow?.margemVendaOuro ?? userRow?.margem_venda_ouro ?? 35)
    };
  }

  private fromDb(row: PedidoDbRow, itens: ItemPedidoDbRow[] = []): Pedido {
    const itensPedido = itens.map(item => {
      const produto = this.getProduto(item.produtos);
      const quantidade = this.toNumber(item.quantidade);
      const valorUnitario = this.toNumber(item.preco_unitario);
      const custoUnitario = this.toNumber(item.custo_unitario ?? produto?.precoCusto ?? produto?.preco_custo);
      const valorTotal = this.toNumber(item.subtotal) || quantidade * valorUnitario;
      const custoTotal = quantidade * custoUnitario;

      return {
        id: item.id,
        produtoId: item.produto_id ?? 0,
        produtoDescricao: produto?.descricao || produto?.nome || '',
        produtoCodigo: produto?.codigo || produto?.sku || '',
        quantidade,
        valorUnitario,
        custoUnitario,
        custoTotal,
        valorTotal
      };
    });

    const custoTotal = itensPedido.reduce((total, item) => total + Number(item.custoTotal || 0), 0);
    const valorTotal = this.toNumber(row.valor_total);

    return {
      id: row.id,
      numero: row.id ? String(row.id) : undefined,
      dataPedido: row.data || undefined,
      dataFinalizacao: row.data_finalizacao || undefined,
      clienteId: row.cliente_id ?? 0,
      clienteNome: this.getClienteNome(row.clientes),
      clienteCpfCnpj: this.getClienteField(row.clientes, 'cpf_cnpj') || undefined,
      clienteEndereco: this.buildClienteEndereco(row.clientes),
      formaPagamentoId: row.forma_pagamento_id ?? null,
      formaPagamentoDescricao: this.getJoinDescricao(row.formas_pagamento),
      prazoPagamentoId: row.prazo_pagamento_id ?? null,
      prazoPagamentoDescricao: this.getFormaPagamentoDescricao(row.prazos_pagamento),
      valorTotal,
      custoTotal,
      lucroTotal: valorTotal - custoTotal,
      status: this.normalizeStatus(row.status),
      notaFiscal: row.nota_fiscal ?? false,
      itens: itensPedido
    };
  }

  private toDb(pedido: AtualizarPedido) {
    const db: Record<string, any> = {};

    if (pedido.clienteId !== undefined) {
      db['cliente_id'] = pedido.clienteId;
    }

    if (pedido.itens) {
      db['valor_total'] = pedido.itens.reduce(
        (total, item) => total + Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
        0
      );
    }

    if (pedido.dataFinalizacao !== undefined) {
      db['data_finalizacao'] = pedido.dataFinalizacao || null;
    }

    if (pedido.prazoPagamentoId !== undefined) {
      db['prazo_pagamento_id'] = pedido.prazoPagamentoId ?? null;
    }

    if (pedido.formaPagamentoId !== undefined) {
      db['forma_pagamento_id'] = pedido.formaPagamentoId ?? null;
    }

    if (pedido.notaFiscal !== undefined) {
      db['nota_fiscal'] = pedido.notaFiscal;
    }

    return db;
  }

  private normalizeStatus(status?: string | null): string | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.trim().toUpperCase();

    const aliases: Record<string, string> = {
      PENDENTE: 'EM_ABERTO',
      CONFIRMADO: 'CONFIRMADO',
      CANCELADO: 'CANCELADO',
      FINALIZADO: 'FINALIZADO'
    };

    return aliases[normalized] || normalized;
  }

  private async persistirItensPedido(
    pedidoId: number,
    itens: CriarPedido['itens'],
    userId: string,
    role: string | null,
    margemVendaOuro: number
  ) {
    if (!itens.length) {
      return { error: null };
    }

    const produtoIds = Array.from(new Set(
      itens
        .map(item => item.produtoId)
        .filter((produtoId): produtoId is number => Number.isFinite(produtoId))
    ));

    const custosPorProduto = new Map<number, number>();

    if (produtoIds.length > 0) {
      const produtosResponse = await this.supabaseService.getClient()
        .from('produtos')
        .select('id, preco_custo, precoCusto')
        .in('id', produtoIds);

      if (produtosResponse.error) {
        return { error: produtosResponse.error };
      }

      ((produtosResponse.data || []) as Array<{ id?: number | null; preco_custo?: number | string | null; precoCusto?: number | string | null }>).forEach(produto => {
        if (produto.id == null) {
          return;
        }

        custosPorProduto.set(produto.id, this.toNumber(produto.precoCusto ?? produto.preco_custo));
      });
    }

    const itensAbaixoPrecoOuro = role === 'vendedor'
      ? itens.find(item => {
          const custoBase = custosPorProduto.get(item.produtoId) ?? this.toNumber(item.custoUnitario);
          const valorUnitario = this.toNumber(item.valorUnitario);

          if (custoBase <= 0 || valorUnitario <= 0) {
            return false;
          }

          const precoMinimo = this.roundToTwo(custoBase * (1 + margemVendaOuro / 100));
          return valorUnitario + 0.0001 < precoMinimo;
        })
      : undefined;

    if (itensAbaixoPrecoOuro) {
      return {
        error: new Error(`Vendedores não podem criar pedidos com valor unitário abaixo do Preço Ouro (${margemVendaOuro}% acima do custo médio).`)
      };
    }

    const payload = itens.map(item => ({
      pedido_id: pedidoId,
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.valorUnitario,
      custo_unitario: this.toNumber(item.custoUnitario ?? custosPorProduto.get(item.produtoId)),
      subtotal: Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
      user_id: userId
    }));

    const response = await this.supabaseService.getClient()
      .from('itens_pedidos')
      .insert(payload);

    return { error: response.error };
  }

  private getClienteNome(
    cliente: PedidoDbRow['clientes']
  ): string | undefined {
    if (Array.isArray(cliente)) {
      return cliente[0]?.nome || undefined;
    }

    return cliente?.nome || undefined;
  }

  private getClienteField(
    cliente: PedidoDbRow['clientes'],
    field: 'cpf_cnpj' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf'
  ): string | null {
    const c = Array.isArray(cliente) ? cliente[0] : cliente;
    return c?.[field] || null;
  }

  private buildClienteEndereco(cliente: PedidoDbRow['clientes']): string | undefined {
    const c = Array.isArray(cliente) ? cliente[0] : cliente;
    if (!c) return undefined;
    const partes = [
      c.logradouro,
      c.numero ? `nº ${c.numero}` : null,
      c.complemento || null,
      c.bairro,
      c.cidade && c.uf ? `${c.cidade} - ${c.uf}` : (c.cidade || c.uf || null)
    ].filter(Boolean);
    return partes.length ? partes.join(', ') : undefined;
  }

  private getFormaPagamentoDescricao(
    fp: PedidoDbRow['prazos_pagamento']
  ): string | null {
    if (Array.isArray(fp)) {
      return fp[0]?.descricao || null;
    }

    return fp?.descricao || null;
  }

  private getJoinDescricao(
    fp: PedidoDbRow['formas_pagamento']
  ): string | null {
    if (Array.isArray(fp)) {
      return fp[0]?.descricao || null;
    }

    return fp?.descricao || null;
  }

  private getProduto(
    produto: ItemPedidoDbRow['produtos']
  ) {
    if (Array.isArray(produto)) {
      return produto[0];
    }

    return produto || undefined;
  }

  private async listarItensPorPedidoIds(pedidoIds: number[]) {
    if (!pedidoIds.length) {
      return { data: [] as ItemPedidoDbRow[], error: null };
    }

    const itens: ItemPedidoDbRow[] = [];
    let from = 0;

    while (true) {
      const response = await this.supabaseService.getClient()
        .from('itens_pedidos')
        .select('id, pedido_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal, produtos(descricao, nome, codigo, sku, precoCusto, preco_custo)')
        .in('pedido_id', pedidoIds)
        .order('id', { ascending: true })
        .range(from, from + this.itensPageSize - 1);

      if (response.error) {
        return { data: null, error: response.error };
      }

      const page = (response.data || []) as ItemPedidoDbRow[];
      itens.push(...page);

      if (page.length < this.itensPageSize) {
        break;
      }

      from += this.itensPageSize;
    }

    return { data: itens, error: null };
  }

  private toNumber(value: number | string | null | undefined): number {
    const numero = Number(value ?? 0);
    return Number.isFinite(numero) ? numero : 0;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toDbField(field: string): string {
    const fieldMap: Record<string, string> = {
      clienteId: 'cliente_id',
      dataPedido: 'data',
      valorTotal: 'valor_total'
    };

    return fieldMap[field] || field;
  }
}
