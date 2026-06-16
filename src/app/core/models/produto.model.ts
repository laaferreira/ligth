export interface Produto {
  id?: number;
  codigo: string;
  descricao: string;
  fornecedorId?: number | null;
  fornecedorNome?: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  precoCustoVendedor?: number | null;
  precoVendaVendedor?: number | null;
  quantidadeEstoque: number;
  estoqueMaximo: number;
  estoqueMinimo: number;
  ativo: boolean;
  ocultarParaVendedor?: boolean;
}
