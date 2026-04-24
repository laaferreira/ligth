export interface ItemPedido {
  id?: number;
  produtoId: number;
  produtoDescricao?: string;
  produtoCodigo?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal?: number;
}

export interface Pedido {
  id?: number;
  numero?: string;
  dataPedido?: string;
  clienteId: number;
  clienteNome?: string;
  itens?: ItemPedido[];
  valorTotal?: number;
  status?: string;
}

export interface CriarPedido {
  clienteId: number;
  itens: { produtoId: number; quantidade: number; valorUnitario: number }[];
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
