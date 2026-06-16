export interface ItemPedido {
  id?: number;
  produtoId: number;
  produtoDescricao?: string;
  produtoCodigo?: string;
  fornecedorNome?: string | null;
  quantidadeEstoque?: number | null;
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
  clienteCpfCnpj?: string;
  clienteEndereco?: string;
  clienteResponsavelNome?: string | null;
  prazoPagamentoId?: number | null;
  prazoPagamentoDescricao?: string | null;
  formaPagamentoId?: number | null;
  formaPagamentoDescricao?: string | null;
  notaFiscal?: boolean;
  margemNotaFiscal?: number | null;
  observacao?: string | null;
  itens?: ItemPedido[];
  valorTotal?: number;
  custoTotal?: number;
  lucroTotal?: number;
  status?: string;
  percentualDesconto?: number | null;
}

export interface CriarPedido {
  clienteId: number;
  prazoPagamentoId?: number | null;
  formaPagamentoId?: number | null;
  notaFiscal?: boolean;
  margemNotaFiscal?: number | null;
  percentualDesconto?: number | null;
  observacao?: string | null;
  itens: { produtoId: number; quantidade: number; valorUnitario: number; custoUnitario?: number }[];
}

export interface AtualizarPedido extends Partial<CriarPedido> {
  dataFinalizacao?: string | null;
  prazoPagamentoId?: number | null;
  formaPagamentoId?: number | null;
  notaFiscal?: boolean;
  margemNotaFiscal?: number | null;
  percentualDesconto?: number | null;
  observacao?: string | null;
}

export interface ImportarPedidoLinha {
  lineNumber: number;
  pedidoId: string;
  cliente: string;
  dataVenda: string | number | null;
  dataFinalizacao: string | number | null;
  userId: string;
  descricaoProduto: string;
  custo: string | number | null;
  valorUnitario: string | number | null;
  quantidade: string | number | null;
}

export interface ImportarPedidoErro {
  lineNumber: number;
  pedidoId?: string;
  reason: string;
}

export interface ImportarPedidoResumoErro {
  reason: string;
  count: number;
  sampleLines: number[];
}

export interface ImportarPedidosResponse {
  totalLinhasRecebidas: number;
  totalLinhasComSucesso: number;
  totalPedidosIdentificados: number;
  totalPedidosAgrupados: number;
  pedidosInseridos: number;
  itensInseridos: number;
  linhasIgnoradas: number;
  detalhesLimitados: boolean;
  resumoErros: ImportarPedidoResumoErro[];
  errors: ImportarPedidoErro[];
}

export interface Movimentacao {
  id: number;
  produtoId: number;
  produtoDescricao: string;
  tipo: string;
  quantidade: number;
  precoCompra: number | null;
  estoqueAnterior: number;
  estoqueAtual: number;
  observacao: string;
  dataMovimentacao: string;
}
