export interface AutocompleteItem {
  id: number;
  label: string;
}

export interface ProdutoAutocompleteItem {
  id: number;
  label: string;
  valor?: number;
  precoCusto: number;
  quantidadeEstoque: number;
}

export interface HistoricoPedido {
  numeroPedido: string;
  dataPedido: string;
  descricaoProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}
