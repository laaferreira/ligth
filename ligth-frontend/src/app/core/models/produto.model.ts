export interface Produto {
  id?: number;
  codigo: string;
  descricao: string;
  categoria: string;
  precoCusto: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  ativo: boolean;
}
