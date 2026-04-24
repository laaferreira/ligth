export interface Produto {
  id?: number;
  codigo: string;
  descricao: string;
  categoria: string;
  precoCusto: number;
  precoTabela: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  ativo: boolean;
}
