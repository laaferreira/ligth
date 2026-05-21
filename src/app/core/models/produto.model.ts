export interface Produto {
  id?: number;
  codigo: string;
  descricao: string;
  fornecedorId?: number | null;
  fornecedorNome?: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  quantidadeEstoque: number;
  estoqueMaximo: number;
  estoqueMinimo: number;
  ativo: boolean;
}
