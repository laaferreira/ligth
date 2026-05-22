import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Pedido, CriarPedido } from '../models/pedido.model';

type PedidoDbRow = {
  id?: number;
  cliente_id?: number | null;
  status?: string | null;
  valor_total?: number | string | null;
  data?: string | null;
  observacao?: string | null;
  user_id?: string | null;
  clientes?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

type ItemPedidoDbRow = {
  id?: number;
  pedido_id?: number | null;
  produto_id?: number | null;
  quantidade?: number | null;
  preco_unitario?: number | string | null;
  subtotal?: number | string | null;
  produtos?: {
    descricao?: string | null;
    nome?: string | null;
    codigo?: string | null;
    sku?: string | null;
  } | Array<{
    descricao?: string | null;
    nome?: string | null;
    codigo?: string | null;
    sku?: string | null;
  }> | null;
};

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly table = 'pedidos';

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Pedido[]> {
    return from(this.listarComControleAcesso()).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as PedidoDbRow[]).map(row => this.fromDb(row));
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

  atualizar(id: number, pedido: Partial<CriarPedido>): Observable<Pedido> {
    return from(this.atualizarComItens(id, pedido)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
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
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'finalizado' } as any)
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
      .select('id, cliente_id, status, valor_total, data, observacao, user_id, clientes(nome)')
      .order('id', { ascending: false });

    if (role === 'vendedor') {
      query = query.eq('user_id', userId);
    }

    return query;
  }

  private async buscarPorIdComControleAcesso(id: number) {
    const { userId, role } = await this.getCurrentUserContext();
    let pedidoQuery = this.supabaseService.getClient()
      .from(this.table)
      .select('id, cliente_id, status, valor_total, data, observacao, user_id, clientes(nome)')
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
      .select('id, pedido_id, produto_id, quantidade, preco_unitario, subtotal, produtos(descricao, nome, codigo, sku)')
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
      .select('id, cliente_id, status, valor_total, data, observacao, user_id, clientes(nome)');

    Object.entries(filtros).forEach(([campo, valor]) => {
      query = query.eq(this.toDbField(campo), valor);
    });

    if (role === 'vendedor') {
      query = query.eq('user_id', userId);
    }

    return query;
  }

  private async criarComUsuario(pedido: CriarPedido) {
    const { userId } = await this.getCurrentUserContext();
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

    const itensInsert = await this.persistirItensPedido(pedidoId, pedido.itens, userId);
    if (itensInsert.error) {
      await client.from(this.table).delete().eq('id', pedidoId);
      return { data: null, error: itensInsert.error };
    }

    const resultado = await this.buscarPorIdComControleAcesso(pedidoId);
    return resultado as { data: Pedido | null; error: any };
  }

  private async atualizarComItens(id: number, pedido: Partial<CriarPedido>) {
    const { userId } = await this.getCurrentUserContext();
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

      const itensInsert = await this.persistirItensPedido(id, pedido.itens, userId);
      if (itensInsert.error) {
        return { data: null, error: itensInsert.error };
      }
    }

    const resultado = await this.buscarPorIdComControleAcesso(id);
    return resultado as { data: Pedido | null; error: any };
  }

  private async getCurrentUserContext(): Promise<{ userId: string; role: string | null }> {
    const { data: authData, error: authError } = await this.supabaseService.getAuth().getUser();
    if (authError || !authData.user) {
      throw authError || new Error('Usuário autenticado não encontrado.');
    }

    const userId = authData.user.id;
    const { data: userData } = await this.supabaseService.getClient()
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return {
      userId,
      role: (userData as { role?: string } | null)?.role || null
    };
  }

  private fromDb(row: PedidoDbRow, itens: ItemPedidoDbRow[] = []): Pedido {
    return {
      id: row.id,
      numero: row.id ? String(row.id) : undefined,
      dataPedido: row.data || undefined,
      clienteId: row.cliente_id ?? 0,
      clienteNome: this.getClienteNome(row.clientes),
      valorTotal: this.toNumber(row.valor_total),
      status: this.normalizeStatus(row.status),
      itens: itens.map(item => {
        const produto = this.getProduto(item.produtos);
        const valorUnitario = this.toNumber(item.preco_unitario);
        const valorTotal = this.toNumber(item.subtotal) || (item.quantidade || 0) * valorUnitario;

        return {
          id: item.id,
          produtoId: item.produto_id ?? 0,
          produtoDescricao: produto?.descricao || produto?.nome || '',
          produtoCodigo: produto?.codigo || produto?.sku || '',
          quantidade: item.quantidade ?? 0,
          valorUnitario,
          valorTotal
        };
      })
    };
  }

  private toDb(pedido: Partial<CriarPedido>) {
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
    userId: string
  ) {
    if (!itens.length) {
      return { error: null };
    }

    const payload = itens.map(item => ({
      pedido_id: pedidoId,
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.valorUnitario,
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

  private getProduto(
    produto: ItemPedidoDbRow['produtos']
  ) {
    if (Array.isArray(produto)) {
      return produto[0];
    }

    return produto || undefined;
  }

  private toNumber(value: number | string | null | undefined): number {
    const numero = Number(value ?? 0);
    return Number.isFinite(numero) ? numero : 0;
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
