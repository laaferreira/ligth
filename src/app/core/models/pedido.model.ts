export interface ItemPedido {
  id?: number;
  produtoId: number;
  produtoDescricao?: string;
  produtoCodigo?: string;
  quantidade: number;
  valorUnitario: number;
  custoUnitario?: number;
  custoTotal?: number;
  valorTotal?: number;
}

export interface Pedido {
  id?: number;
  numero?: string;
  dataPedido?: string;
  dataFinalizacao?: string;
  clienteId: number;
  clienteNome?: string;
  itens?: ItemPedido[];
  valorTotal?: number;
  custoTotal?: number;
  lucroTotal?: number;
  status?: string;
}

export interface CriarPedido {
  clienteId: number;
  itens: { produtoId: number; quantidade: number; valorUnitario: number; custoUnitario?: number }[];
}

export interface AtualizarPedido extends Partial<CriarPedido> {
  dataFinalizacao?: string | null;
}

export interface Movimentacao {
  id: number;
  produtoId: number;
  produtoDescricao: string;
  tipo: string;
  quantidade: number;
  estoqueAnterior: number;
  estoqueAtual: number;
  observacao: string;
  dataMovimentacao: string;
}
