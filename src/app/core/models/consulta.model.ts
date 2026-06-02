export interface AutocompleteItem {
  id: number;
  label: string;
  fornecedorNome?: string | null;
}

export interface ProdutoAutocompleteItem {
  id: number;
  label: string;
  fornecedorNome?: string | null;
  valor?: number;
  precoCusto: number;
  precoCustoVendedor?: number | null;
  precoVendaVendedor?: number | null;
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
